create extension if not exists pgcrypto;

create table if not exists public.inquiries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  customer_name text,
  customer_phone text,
  source text default 'phone',
  occasion text,
  required_by_date text,
  budget_per_unit numeric,
  total_budget numeric,
  status text default 'new',
  raw_transcript text,
  notes text
);

create table if not exists public.inquiry_items (
  id uuid default gen_random_uuid() primary key,
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  product_sku text,
  product_name text,
  quantity_requested integer,
  quoted_price numeric
);

alter table public.inquiries enable row level security;
alter table public.inquiry_items enable row level security;

drop policy if exists "Public read inquiries" on public.inquiries;
create policy "Public read inquiries"
on public.inquiries
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated manage inquiries" on public.inquiries;
create policy "Authenticated manage inquiries"
on public.inquiries
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public read inquiry items" on public.inquiry_items;
create policy "Public read inquiry items"
on public.inquiry_items
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated manage inquiry items" on public.inquiry_items;
create policy "Authenticated manage inquiry items"
on public.inquiry_items
for all
to authenticated
using (true)
with check (true);
