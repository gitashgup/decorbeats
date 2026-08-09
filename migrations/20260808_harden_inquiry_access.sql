-- Keep the business date separate from the immutable save/audit timestamp.
alter table public.inquiries
  add column if not exists entry_date date;

update public.inquiries
set entry_date = coalesce(created_at::date, current_date)
where entry_date is null;

alter table public.inquiries
  alter column entry_date set default current_date,
  alter column entry_date set not null;

create index if not exists inquiries_entry_date_idx
  on public.inquiries (entry_date desc, created_at desc);

create index if not exists inquiry_items_inquiry_id_idx
  on public.inquiry_items (inquiry_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inquiries'::regclass
      and conname = 'inquiries_status_allowed_check'
  ) then
    alter table public.inquiries
      add constraint inquiries_status_allowed_check
      check (status in ('new', 'contacted', 'quoted', 'follow_up', 'converted', 'lost')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inquiry_items'::regclass
      and conname = 'inquiry_items_quantity_positive_check'
  ) then
    alter table public.inquiry_items
      add constraint inquiry_items_quantity_positive_check
      check (quantity_requested is null or quantity_requested > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inquiry_items'::regclass
      and conname = 'inquiry_items_quoted_price_nonnegative_check'
  ) then
    alter table public.inquiry_items
      add constraint inquiry_items_quoted_price_nonnegative_check
      check (quoted_price is null or quoted_price >= 0) not valid;
  end if;
end
$$;

alter table public.inquiries enable row level security;
alter table public.inquiry_items enable row level security;

-- Keep the database-side allowlist available in fresh environments too.
-- An empty table intentionally denies browser access until an administrator
-- adds the same email addresses configured in the server's ADMIN_EMAILS.
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- `public.admins` is the existing server-side admin allowlist. Read it through
-- a tightly scoped definer function so its own RLS/privileges cannot turn an
-- inquiry policy check into a false negative. The JWT is still verified and
-- issued by Supabase; browser configuration is not trusted for authorization.
create or replace function public.is_decorbeats_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1
    from public.admins admin_user
    join auth.users authenticated_user
      on lower(btrim(authenticated_user.email)) = lower(btrim(admin_user.email))
    where authenticated_user.id = auth.uid()
  );
$$;

alter function public.is_decorbeats_admin() owner to postgres;
revoke all on function public.is_decorbeats_admin() from public, anon, authenticated;
grant execute on function public.is_decorbeats_admin() to authenticated, service_role;

-- The allowlist is managed only through trusted SQL/service administration.
-- Even if a permissive write policy is added accidentally later, browser roles
-- still cannot add themselves to it.
revoke insert, update, delete on table public.admins from public, anon, authenticated;

drop policy if exists "Public read inquiries" on public.inquiries;
drop policy if exists "Authenticated manage inquiries" on public.inquiries;
drop policy if exists "Authenticated users can manage inquiries" on public.inquiries;
drop policy if exists "Authenticated read inquiries" on public.inquiries;
drop policy if exists "Authenticated update inquiry status" on public.inquiries;

drop policy if exists "Public read inquiry items" on public.inquiry_items;
drop policy if exists "Authenticated manage inquiry items" on public.inquiry_items;
drop policy if exists "Authenticated users can manage inquiry_items" on public.inquiry_items;
drop policy if exists "Authenticated read inquiry items" on public.inquiry_items;

-- Browser sessions may read inquiries and advance their status. Creation and
-- deletion happen only through the ADMIN_EMAILS-checked server endpoint.
create policy "Authenticated read inquiries"
on public.inquiries
for select
to authenticated
using ((select public.is_decorbeats_admin()));

create policy "Authenticated update inquiry status"
on public.inquiries
for update
to authenticated
using ((select public.is_decorbeats_admin()))
with check (
  (select public.is_decorbeats_admin())
  and status in ('new', 'contacted', 'quoted', 'follow_up', 'converted', 'lost')
);

create policy "Authenticated read inquiry items"
on public.inquiry_items
for select
to authenticated
using ((select public.is_decorbeats_admin()));

revoke all privileges on table public.inquiries from public, anon, authenticated;
revoke all privileges on table public.inquiry_items from public, anon, authenticated;

grant select, update (status) on table public.inquiries to authenticated;
grant select on table public.inquiry_items to authenticated;

grant select, insert, update, delete on table public.inquiries to service_role;
grant select, insert, update, delete on table public.inquiry_items to service_role;
