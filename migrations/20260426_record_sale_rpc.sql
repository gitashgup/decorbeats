create extension if not exists pgcrypto;

create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  customer_name text,
  payment_method text default 'upi',
  payment_status text default 'paid',
  notes text,
  total_amount numeric
);

create table if not exists public.sale_items (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references public.sales(id) on delete cascade,
  product_sku text,
  product_name text,
  quantity_sold integer,
  selling_price numeric,
  cost_price numeric
);

alter table public.sales add column if not exists payment_status text default 'paid';

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "Authenticated users can manage sales" on public.sales;
create policy "Authenticated users can manage sales"
on public.sales
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage sale_items" on public.sale_items;
create policy "Authenticated users can manage sale_items"
on public.sale_items
for all
to authenticated
using (true)
with check (true);

create or replace function public.record_sale_with_items(
  sale_payload jsonb,
  sale_items_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_sale public.sales%rowtype;
  item jsonb;
  affected_count integer;
  saved_items jsonb;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Only authenticated users can record sales';
  end if;

  if jsonb_typeof(sale_items_payload) <> 'array' or jsonb_array_length(sale_items_payload) = 0 then
    raise exception 'At least one sale item is required';
  end if;

  insert into public.sales (
    customer_name,
    payment_method,
    payment_status,
    notes,
    total_amount
  )
  values (
    nullif(btrim(sale_payload->>'customer_name'), ''),
    coalesce(nullif(sale_payload->>'payment_method', ''), 'upi'),
    coalesce(nullif(sale_payload->>'payment_status', ''), 'paid'),
    nullif(btrim(sale_payload->>'notes'), ''),
    coalesce((sale_payload->>'total_amount')::numeric, 0)
  )
  returning * into new_sale;

  for item in select * from jsonb_array_elements(sale_items_payload)
  loop
    if coalesce((item->>'quantity_sold')::integer, 0) <= 0 then
      raise exception 'Quantity must be greater than zero for %', coalesce(item->>'product_name', item->>'product_sku');
    end if;

    update public.products
    set quantity = quantity - (item->>'quantity_sold')::integer
    where sku = item->>'product_sku'
      and quantity >= (item->>'quantity_sold')::integer;

    get diagnostics affected_count = row_count;
    if affected_count = 0 then
      raise exception 'Not enough stock for %', coalesce(item->>'product_name', item->>'product_sku');
    end if;

    insert into public.sale_items (
      sale_id,
      product_sku,
      product_name,
      quantity_sold,
      selling_price,
      cost_price
    )
    values (
      new_sale.id,
      item->>'product_sku',
      item->>'product_name',
      (item->>'quantity_sold')::integer,
      coalesce((item->>'selling_price')::numeric, 0),
      nullif(item->>'cost_price', '')::numeric
    );
  end loop;

  select coalesce(jsonb_agg(to_jsonb(si) order by si.product_name), '[]'::jsonb)
  into saved_items
  from public.sale_items si
  where si.sale_id = new_sale.id;

  return jsonb_build_object(
    'sale', to_jsonb(new_sale),
    'sale_items', saved_items
  );
end;
$$;

grant execute on function public.record_sale_with_items(jsonb, jsonb) to authenticated;
