create extension if not exists pgcrypto;

-- Keep the legacy Razorpay columns intact while adding provider-neutral checkout data.
alter table public.customer_orders
  add column if not exists checkout_attempt_id uuid,
  add column if not exists checkout_request_fingerprint text,
  add column if not exists payment_provider text,
  add column if not exists provider_order_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_payment_session_id text,
  add column if not exists provider_order_status text,
  add column if not exists paid_at timestamptz,
  add column if not exists stock_committed_at timestamptz,
  add column if not exists payment_updated_at timestamptz default now();

create unique index if not exists customer_orders_checkout_attempt_id_uidx
  on public.customer_orders (checkout_attempt_id)
  where checkout_attempt_id is not null;

create unique index if not exists customer_orders_provider_order_uidx
  on public.customer_orders (payment_provider, provider_order_id)
  where payment_provider is not null and provider_order_id is not null;

create unique index if not exists customer_orders_provider_payment_uidx
  on public.customer_orders (payment_provider, provider_payment_id)
  where payment_provider is not null and provider_payment_id is not null;

create table if not exists public.checkout_payment_attempts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  customer_order_id uuid not null references public.customer_orders(id) on delete cascade,
  provider text not null,
  provider_order_id text not null,
  provider_payment_id text not null,
  verified_amount numeric(14, 2) not null,
  verified_currency text not null,
  unique (provider, provider_payment_id)
);

create index if not exists checkout_payment_attempts_order_idx
  on public.checkout_payment_attempts (customer_order_id, created_at desc);

alter table public.checkout_payment_attempts enable row level security;
alter table public.customer_orders enable row level security;
alter table public.customer_order_items enable row level security;

-- The checkout API uses the service-role key. Browser clients must never create,
-- read, or mutate customer PII or paid order records directly.
drop policy if exists "Customers can create checkout orders" on public.customer_orders;
drop policy if exists "Admins can read checkout orders" on public.customer_orders;
drop policy if exists "Admins can update checkout orders" on public.customer_orders;
drop policy if exists "Customers can create checkout order items" on public.customer_order_items;
drop policy if exists "Admins can read checkout order items" on public.customer_order_items;
drop policy if exists "Admins can update checkout order items" on public.customer_order_items;

revoke all privileges on table public.customer_orders from public, anon, authenticated;
revoke all privileges on table public.customer_order_items from public, anon, authenticated;
revoke all privileges on table public.checkout_payment_attempts from public, anon, authenticated;

grant select, insert, update on table public.customer_orders to service_role;
grant select, insert on table public.customer_order_items to service_role;
grant select, insert on table public.checkout_payment_attempts to service_role;

create or replace function public.create_customer_checkout_v2(
  p_checkout_attempt_id uuid,
  p_provider text,
  p_provider_order_id text,
  p_customer jsonb,
  p_items jsonb,
  p_total_amount numeric,
  p_currency text default 'INR'
)
returns table (
  customer_order_id uuid,
  order_reference text,
  created boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_provider text := lower(btrim(coalesce(p_provider, '')));
  v_provider_order_id text := btrim(coalesce(p_provider_order_id, ''));
  v_currency text := upper(btrim(coalesce(p_currency, '')));
  v_existing public.customer_orders%rowtype;
  v_order_id uuid;
  v_item jsonb;
  v_product_id text;
  v_product_name text;
  v_product_sku text;
  v_image_url text;
  v_quantity_numeric numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_calculated_total numeric := 0;
  v_canonical_items jsonb;
  v_request_fingerprint text;
begin
  if p_checkout_attempt_id is null then
    raise exception using errcode = '22023', message = 'A checkout attempt ID is required';
  end if;

  if v_provider !~ '^[a-z0-9_]{2,30}$' then
    raise exception using errcode = '22023', message = 'The payment provider is invalid';
  end if;

  if length(v_provider_order_id) < 3
     or length(v_provider_order_id) > 120
     or v_provider_order_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception using errcode = '22023', message = 'The provider order ID is invalid';
  end if;

  if v_currency <> 'INR' then
    raise exception using errcode = '22023', message = 'Only INR checkout orders are supported';
  end if;

  if p_total_amount is null
     or p_total_amount < 1
     or p_total_amount > 1000000000
     or round(p_total_amount, 2) <> p_total_amount then
    raise exception using errcode = '22023', message = 'The checkout total is invalid';
  end if;

  if jsonb_typeof(p_customer) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Customer details are required';
  end if;

  if nullif(btrim(p_customer->>'customer_name'), '') is null
     or length(btrim(p_customer->>'customer_name')) > 120
     or nullif(btrim(p_customer->>'customer_phone'), '') is null
     or btrim(p_customer->>'customer_phone') !~ '^[6-9][0-9]{9}$'
     or nullif(btrim(p_customer->>'address_line1'), '') is null
     or length(btrim(p_customer->>'address_line1')) > 240
     or nullif(btrim(p_customer->>'city'), '') is null
     or length(btrim(p_customer->>'city')) > 100
     or nullif(btrim(p_customer->>'state'), '') is null
     or length(btrim(p_customer->>'state')) > 100
     or btrim(coalesce(p_customer->>'pincode', '')) !~ '^[0-9]{6}$' then
    raise exception using errcode = '22023', message = 'Customer delivery details are invalid';
  end if;

  if length(coalesce(p_customer->>'customer_email', '')) > 160
     or length(coalesce(p_customer->>'address_line2', '')) > 240
     or length(coalesce(p_customer->>'delivery_notes', '')) > 500 then
    raise exception using errcode = '22023', message = 'Customer delivery details are too long';
  end if;

  if nullif(btrim(coalesce(p_customer->>'customer_email', '')), '') is not null
     and btrim(p_customer->>'customer_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'The customer email address is invalid';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Checkout items must be an array';
  end if;

  if jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 25 then
    raise exception using errcode = '22023', message = 'Between 1 and 25 checkout items are required';
  end if;

  -- Validate every item before inserting any order data. The API already derives
  -- these snapshots from the live catalogue; this is a second trust boundary.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or jsonb_typeof(v_item->'unit_price') is distinct from 'number'
       or jsonb_typeof(v_item->'line_total') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'A checkout item is malformed';
    end if;

    v_product_id := btrim(coalesce(v_item->>'product_id', ''));
    v_product_name := btrim(coalesce(v_item->>'product_name', ''));
    v_product_sku := nullif(btrim(coalesce(v_item->>'product_sku', '')), '');
    v_image_url := nullif(btrim(coalesce(v_item->>'image_url', '')), '');
    v_quantity_numeric := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := (v_item->>'line_total')::numeric;

    if v_product_id !~ '^[A-Za-z0-9_-]{1,80}$'
       or v_product_name = '' or length(v_product_name) > 240
       or length(coalesce(v_product_sku, '')) > 120
       or length(coalesce(v_image_url, '')) > 1500
       or v_quantity_numeric <> trunc(v_quantity_numeric)
       or v_quantity_numeric < 1 or v_quantity_numeric > 25
       or v_unit_price < 1 or v_unit_price > 100000000
       or round(v_unit_price, 2) <> v_unit_price
       or v_line_total <> round(v_unit_price * v_quantity_numeric, 2) then
      raise exception using errcode = '22023', message = 'A checkout item has invalid values';
    end if;

    v_calculated_total := v_calculated_total + v_line_total;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by btrim(item->>'product_id')
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Duplicate checkout products must be combined';
  end if;

  if round(v_calculated_total, 2) <> round(p_total_amount, 2) then
    raise exception using errcode = '22023', message = 'The checkout items do not match the order total';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', btrim(item->>'product_id'),
        'product_sku', nullif(btrim(coalesce(item->>'product_sku', '')), ''),
        'product_name', btrim(item->>'product_name'),
        'quantity', (item->>'quantity')::integer,
        'unit_price', round((item->>'unit_price')::numeric, 2),
        'line_total', round((item->>'line_total')::numeric, 2),
        'image_url', nullif(btrim(coalesce(item->>'image_url', '')), '')
      )
      order by btrim(item->>'product_id')
    ),
    '[]'::jsonb
  )
  into v_canonical_items
  from jsonb_array_elements(p_items) item;

  -- Bind an idempotency key to the exact normalized request. A retry may return
  -- the original order, but it may not silently replace its cart or address.
  v_request_fingerprint := md5(
    jsonb_build_object(
      'checkout_attempt_id', p_checkout_attempt_id::text,
      'provider', v_provider,
      'provider_order_id', v_provider_order_id,
      'customer', jsonb_build_object(
        'customer_name', btrim(p_customer->>'customer_name'),
        'customer_phone', btrim(p_customer->>'customer_phone'),
        'customer_email', nullif(btrim(coalesce(p_customer->>'customer_email', '')), ''),
        'address_line1', btrim(p_customer->>'address_line1'),
        'address_line2', nullif(btrim(coalesce(p_customer->>'address_line2', '')), ''),
        'city', btrim(p_customer->>'city'),
        'state', btrim(p_customer->>'state'),
        'pincode', btrim(p_customer->>'pincode'),
        'delivery_notes', nullif(btrim(coalesce(p_customer->>'delivery_notes', '')), '')
      ),
      'items', v_canonical_items,
      'total_amount', round(p_total_amount, 2),
      'currency', v_currency
    )::text
  );

  select co.*
  into v_existing
  from public.customer_orders co
  where co.checkout_attempt_id = p_checkout_attempt_id
  for update;

  if found then
    if coalesce(v_existing.payment_provider, '') <> v_provider
       or coalesce(v_existing.provider_order_id, '') <> v_provider_order_id
       or round(coalesce(v_existing.total_amount, 0), 2) <> round(p_total_amount, 2)
       or upper(coalesce(v_existing.currency, '')) <> v_currency
       or v_existing.checkout_request_fingerprint is distinct from v_request_fingerprint then
      raise exception using errcode = '22023', message = 'This checkout attempt is already assigned to different order details';
    end if;

    customer_order_id := v_existing.id;
    order_reference := 'DB-' || upper(substr(replace(v_existing.id::text, '-', ''), 1, 10));
    created := false;
    return next;
    return;
  end if;

  begin
    insert into public.customer_orders (
      customer_name,
      customer_phone,
      customer_email,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      delivery_notes,
      total_amount,
      currency,
      payment_status,
      order_status,
      checkout_attempt_id,
      checkout_request_fingerprint,
      payment_provider,
      provider_order_id,
      provider_order_status,
      payment_updated_at
    )
    values (
      btrim(p_customer->>'customer_name'),
      btrim(p_customer->>'customer_phone'),
      nullif(btrim(coalesce(p_customer->>'customer_email', '')), ''),
      btrim(p_customer->>'address_line1'),
      nullif(btrim(coalesce(p_customer->>'address_line2', '')), ''),
      btrim(p_customer->>'city'),
      btrim(p_customer->>'state'),
      btrim(p_customer->>'pincode'),
      nullif(btrim(coalesce(p_customer->>'delivery_notes', '')), ''),
      round(p_total_amount, 2),
      v_currency,
      'pending',
      'payment_pending',
      p_checkout_attempt_id,
      v_request_fingerprint,
      v_provider,
      v_provider_order_id,
      'PENDING',
      now()
    )
    returning id into v_order_id;
  exception
    when unique_violation then
      select co.*
      into v_existing
      from public.customer_orders co
      where co.checkout_attempt_id = p_checkout_attempt_id
         or (co.payment_provider = v_provider and co.provider_order_id = v_provider_order_id)
      order by case when co.checkout_attempt_id = p_checkout_attempt_id then 0 else 1 end
      limit 1
      for update;

      if not found
         or v_existing.checkout_attempt_id is distinct from p_checkout_attempt_id
         or coalesce(v_existing.payment_provider, '') <> v_provider
         or coalesce(v_existing.provider_order_id, '') <> v_provider_order_id
         or round(coalesce(v_existing.total_amount, 0), 2) <> round(p_total_amount, 2)
         or upper(coalesce(v_existing.currency, '')) <> v_currency
         or v_existing.checkout_request_fingerprint is distinct from v_request_fingerprint then
        raise exception using errcode = '23505', message = 'The checkout order identifiers are already in use';
      end if;

      customer_order_id := v_existing.id;
      order_reference := 'DB-' || upper(substr(replace(v_existing.id::text, '-', ''), 1, 10));
      created := false;
      return next;
      return;
  end;

  insert into public.customer_order_items (
    order_id,
    product_id,
    product_sku,
    product_name,
    quantity,
    unit_price,
    line_total,
    image_url
  )
  select
    v_order_id,
    btrim(item->>'product_id'),
    nullif(btrim(coalesce(item->>'product_sku', '')), ''),
    btrim(item->>'product_name'),
    (item->>'quantity')::integer,
    round((item->>'unit_price')::numeric, 2),
    round((item->>'line_total')::numeric, 2),
    nullif(btrim(coalesce(item->>'image_url', '')), '')
  from jsonb_array_elements(p_items) item;

  customer_order_id := v_order_id;
  order_reference := 'DB-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 10));
  created := true;
  return next;
end;
$$;

create or replace function public.finalize_customer_checkout_payment_v2(
  p_provider text,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_verified_amount numeric,
  p_verified_currency text
)
returns table (
  customer_order_id uuid,
  order_reference text,
  recorded boolean,
  stock_review boolean,
  idempotent boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_provider text := lower(btrim(coalesce(p_provider, '')));
  v_provider_order_id text := btrim(coalesce(p_provider_order_id, ''));
  v_provider_payment_id text := btrim(coalesce(p_provider_payment_id, ''));
  v_currency text := upper(btrim(coalesce(p_verified_currency, '')));
  v_order public.customer_orders%rowtype;
  v_existing_payment_order_id uuid;
  v_locked_product record;
  v_item_count integer;
  v_stock_review boolean := false;
begin
  if v_provider !~ '^[a-z0-9_]{2,30}$'
     or length(v_provider_order_id) < 3
     or length(v_provider_order_id) > 120
     or v_provider_order_id !~ '^[A-Za-z0-9_-]+$'
     or v_provider_payment_id = ''
     or length(v_provider_payment_id) > 160 then
    raise exception using errcode = '22023', message = 'Payment identifiers are invalid';
  end if;

  if v_currency <> 'INR'
     or p_verified_amount is null
     or p_verified_amount < 1
     or p_verified_amount > 1000000000
     or round(p_verified_amount, 2) <> p_verified_amount then
    raise exception using errcode = '22023', message = 'Verified payment details are invalid';
  end if;

  select co.*
  into v_order
  from public.customer_orders co
  where co.payment_provider = v_provider
    and co.provider_order_id = v_provider_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'The checkout order was not found';
  end if;

  if round(coalesce(v_order.total_amount, 0), 2) <> round(p_verified_amount, 2)
     or upper(coalesce(v_order.currency, '')) <> v_currency then
    raise exception using errcode = '22023', message = 'The verified payment does not match the checkout order';
  end if;

  select cpa.customer_order_id
  into v_existing_payment_order_id
  from public.checkout_payment_attempts cpa
  where cpa.provider = v_provider
    and cpa.provider_payment_id = v_provider_payment_id;

  if found then
    if v_existing_payment_order_id <> v_order.id then
      raise exception using errcode = '23505', message = 'This payment is already attached to another checkout order';
    end if;

    if lower(coalesce(v_order.payment_status, '')) <> 'paid'
       or v_order.paid_at is null
       or v_order.provider_payment_id is distinct from v_provider_payment_id
       or (v_order.stock_committed_at is null and v_order.order_status is distinct from 'stock_review') then
      raise exception using errcode = '55000', message = 'The recorded payment is internally inconsistent and requires review';
    end if;

    customer_order_id := v_order.id;
    order_reference := 'DB-' || upper(substr(replace(v_order.id::text, '-', ''), 1, 10));
    recorded := true;
    stock_review := v_order.order_status = 'stock_review';
    idempotent := true;
    return next;
    return;
  end if;

  -- A finalized row is also an idempotency barrier if older data was written
  -- before the payment-attempt ledger existed.
  if v_order.stock_committed_at is not null
     or v_order.order_status = 'stock_review'
     or v_order.provider_payment_id is not null then
    if lower(coalesce(v_order.payment_status, '')) <> 'paid'
       or v_order.paid_at is null
       or v_order.provider_payment_id is distinct from v_provider_payment_id
       or (v_order.stock_committed_at is null and v_order.order_status is distinct from 'stock_review') then
      raise exception using errcode = '55000', message = 'The checkout finalization state is inconsistent and requires review';
    end if;

    begin
      insert into public.checkout_payment_attempts (
        customer_order_id,
        provider,
        provider_order_id,
        provider_payment_id,
        verified_amount,
        verified_currency
      )
      values (
        v_order.id,
        v_provider,
        v_provider_order_id,
        v_provider_payment_id,
        round(p_verified_amount, 2),
        v_currency
      );
    exception
      when unique_violation then
        select cpa.customer_order_id
        into v_existing_payment_order_id
        from public.checkout_payment_attempts cpa
        where cpa.provider = v_provider
          and cpa.provider_payment_id = v_provider_payment_id;

        if v_existing_payment_order_id is distinct from v_order.id then
          raise exception using errcode = '23505', message = 'This payment is already attached to another checkout order';
        end if;
    end;

    update public.customer_orders
    set provider_order_status = 'PAID',
        payment_updated_at = now()
    where id = v_order.id;

    customer_order_id := v_order.id;
    order_reference := 'DB-' || upper(substr(replace(v_order.id::text, '-', ''), 1, 10));
    recorded := true;
    stock_review := v_order.order_status = 'stock_review';
    idempotent := true;
    return next;
    return;
  end if;

  select count(*)::integer
  into v_item_count
  from public.customer_order_items coi
  where coi.order_id = v_order.id;

  if v_item_count = 0 then
    raise exception using errcode = '22023', message = 'The checkout order has no items';
  end if;

  -- Lock every matching product in a deterministic order. Concurrent orders can
  -- then safely re-check stock without partially decrementing the catalogue.
  for v_locked_product in
    with required_stock as (
      select coi.product_id, sum(coi.quantity)::integer as quantity_required
      from public.customer_order_items coi
      where coi.order_id = v_order.id
      group by coi.product_id
    )
    select p.id
    from required_stock rs
    join public.products p on p.id::text = rs.product_id
    order by p.id::text
    for update of p
  loop
    null;
  end loop;

  with required_stock as (
    select coi.product_id, sum(coi.quantity)::integer as quantity_required
    from public.customer_order_items coi
    where coi.order_id = v_order.id
    group by coi.product_id
  )
  select exists (
    select 1
    from required_stock rs
    left join public.products p on p.id::text = rs.product_id
    where p.id is null
       or p.archived_at is not null
       or coalesce(p.quantity, 0) < rs.quantity_required
  )
  into v_stock_review;

  begin
    insert into public.checkout_payment_attempts (
      customer_order_id,
      provider,
      provider_order_id,
      provider_payment_id,
      verified_amount,
      verified_currency
    )
    values (
      v_order.id,
      v_provider,
      v_provider_order_id,
      v_provider_payment_id,
      round(p_verified_amount, 2),
      v_currency
    );
  exception
    when unique_violation then
      select cpa.customer_order_id
      into v_existing_payment_order_id
      from public.checkout_payment_attempts cpa
      where cpa.provider = v_provider
        and cpa.provider_payment_id = v_provider_payment_id;

      if v_existing_payment_order_id is distinct from v_order.id then
        raise exception using errcode = '23505', message = 'This payment is already attached to another checkout order';
      end if;

      raise exception using errcode = '55000', message = 'The payment ledger and checkout order are inconsistent and require review';
  end;

  if not v_stock_review then
    with required_stock as (
      select coi.product_id, sum(coi.quantity)::integer as quantity_required
      from public.customer_order_items coi
      where coi.order_id = v_order.id
      group by coi.product_id
    )
    update public.products p
    set quantity = coalesce(p.quantity, 0) - rs.quantity_required
    from required_stock rs
    where p.id::text = rs.product_id;
  end if;

  update public.customer_orders
  set payment_status = 'paid',
      order_status = case when v_stock_review then 'stock_review' else 'new' end,
      provider_payment_id = v_provider_payment_id,
      provider_order_status = 'PAID',
      paid_at = coalesce(paid_at, now()),
      stock_committed_at = case when v_stock_review then null else coalesce(stock_committed_at, now()) end,
      payment_updated_at = now()
  where id = v_order.id;

  customer_order_id := v_order.id;
  order_reference := 'DB-' || upper(substr(replace(v_order.id::text, '-', ''), 1, 10));
  recorded := true;
  stock_review := v_stock_review;
  idempotent := false;
  return next;
end;
$$;

revoke all on function public.create_customer_checkout_v2(uuid, text, text, jsonb, jsonb, numeric, text)
  from public, anon, authenticated;
revoke all on function public.finalize_customer_checkout_payment_v2(text, text, text, numeric, text)
  from public, anon, authenticated;

grant execute on function public.create_customer_checkout_v2(uuid, text, text, jsonb, jsonb, numeric, text)
  to service_role;
grant execute on function public.finalize_customer_checkout_payment_v2(text, text, text, numeric, text)
  to service_role;
