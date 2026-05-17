create table if not exists public.share_catalogues (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  title text not null,
  slug text not null unique,
  customer_name text,
  occasion text,
  intro_note text,
  status text default 'active',
  expires_at date
);

create table if not exists public.share_catalogue_items (
  id uuid default gen_random_uuid() primary key,
  catalogue_id uuid references public.share_catalogues(id) on delete cascade,
  product_id text,
  product_sku text,
  product_name text,
  display_price numeric,
  display_quantity integer,
  lead_time text default 'Ready to ship',
  customer_note text,
  sort_order integer default 1
);

alter table public.share_catalogues enable row level security;
alter table public.share_catalogue_items enable row level security;

drop policy if exists "Public can read active share catalogues" on public.share_catalogues;
create policy "Public can read active share catalogues"
on public.share_catalogues
for select
to anon, authenticated
using (
  status = 'active'
  and (expires_at is null or expires_at >= current_date)
);

drop policy if exists "Authenticated users can manage share catalogues" on public.share_catalogues;
create policy "Authenticated users can manage share catalogues"
on public.share_catalogues
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read active share catalogue items" on public.share_catalogue_items;
create policy "Public can read active share catalogue items"
on public.share_catalogue_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.share_catalogues catalogue
    where catalogue.id = share_catalogue_items.catalogue_id
      and catalogue.status = 'active'
      and (catalogue.expires_at is null or catalogue.expires_at >= current_date)
  )
);

drop policy if exists "Authenticated users can manage share catalogue items" on public.share_catalogue_items;
create policy "Authenticated users can manage share catalogue items"
on public.share_catalogue_items
for all
to authenticated
using (true)
with check (true);
