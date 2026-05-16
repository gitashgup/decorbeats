create table if not exists customer_orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  delivery_notes text,
  total_amount numeric not null default 0,
  currency text default 'INR',
  payment_status text default 'paid',
  order_status text default 'new',
  razorpay_order_id text,
  razorpay_payment_id text
);

create table if not exists customer_order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references customer_orders(id) on delete cascade,
  product_id text,
  product_sku text,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  image_url text
);

alter table customer_orders enable row level security;
alter table customer_order_items enable row level security;

drop policy if exists "Customers can create checkout orders" on customer_orders;
drop policy if exists "Admins can read checkout orders" on customer_orders;
drop policy if exists "Admins can update checkout orders" on customer_orders;
drop policy if exists "Customers can create checkout order items" on customer_order_items;
drop policy if exists "Admins can read checkout order items" on customer_order_items;
drop policy if exists "Admins can update checkout order items" on customer_order_items;

create policy "Customers can create checkout orders"
on customer_orders for insert
to anon, authenticated
with check (true);

create policy "Admins can read checkout orders"
on customer_orders for select
to authenticated
using (true);

create policy "Admins can update checkout orders"
on customer_orders for update
to authenticated
using (true)
with check (true);

create policy "Customers can create checkout order items"
on customer_order_items for insert
to anon, authenticated
with check (true);

create policy "Admins can read checkout order items"
on customer_order_items for select
to authenticated
using (true);

create policy "Admins can update checkout order items"
on customer_order_items for update
to authenticated
using (true)
with check (true);
