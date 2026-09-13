begin;
alter table public.products add column if not exists stock_revision bigint not null default 0;
create or replace function public.track_stock_revision_v1() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 new.stock_revision := old.stock_revision + case when new.quantity is distinct from old.quantity then 1 else 0 end;
 return new;
end $$;
create trigger products_stock_revision before update on public.products for each row execute function public.track_stock_revision_v1();

create table public.stock_intake (
 id uuid primary key, product_id bigint references public.products(id), kind text not null check(kind in ('arrival','dispatch','count')),
 quantity integer not null check(quantity between 0 and 999999), location text not null, reference text not null, source text not null,
 photo jsonb not null, product_hint text not null default '', already_deducted boolean not null default false,
 expected_revision bigint, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 before_quantity integer, after_quantity integer, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_note text
);
create index stock_intake_queue on public.stock_intake(status,created_at desc);
create unique index stock_intake_reference on public.stock_intake(product_id,kind,source,reference) where status<>'rejected' and product_id is not null;
alter table public.stock_intake enable row level security;
revoke all on public.stock_intake from public,anon,authenticated;
grant select on public.stock_intake to authenticated;
create policy stock_intake_admin_read on public.stock_intake for select to authenticated using(public.is_decorbeats_admin());

create function public.submit_stock_intake_v1(p_id uuid,p_product_id bigint,p_kind text,p_quantity integer,p_location text,p_reference text,p_source text,p_photo jsonb,p_hint text,p_already_deducted boolean,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.stock_intake;
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 select * into r from public.stock_intake where id=p_id;
 if found then return to_jsonb(r); end if;
 if p_kind not in ('arrival','dispatch','count') or p_quantity is null or p_quantity<0 or p_quantity>999999 or (p_kind<>'count' and p_quantity=0) then raise exception 'Enter a valid whole-number quantity'; end if;
 if nullif(btrim(p_location),'') is null or nullif(btrim(p_reference),'') is null or nullif(btrim(p_source),'') is null then raise exception 'Location, source and unique reference required'; end if;
 if coalesce(p_photo->>'url','') not like 'https://%/storage/v1/object/public/products/capture/'||p_id::text||'/%' then raise exception 'Add a product photo'; end if;
 if p_product_id is not null and not exists(select 1 from public.products where id=p_product_id and archived_at is null) then raise exception 'Select an active product'; end if;
 if p_kind='count' and (p_product_id is null or p_expected_revision is null) then raise exception 'Link a product before counting'; end if;
 insert into public.stock_intake(id,product_id,kind,quantity,location,reference,source,photo,product_hint,already_deducted,expected_revision,created_by)
 values(p_id,p_product_id,p_kind,p_quantity,btrim(p_location),lower(btrim(p_reference)),lower(btrim(p_source)),p_photo,coalesce(p_hint,''),p_kind='dispatch' and coalesce(p_already_deducted,false),p_expected_revision,auth.uid()) returning * into r;
 return to_jsonb(r);
end $$;

create function public.review_stock_intake_v1(p_id uuid,p_product_id bigint,p_approve boolean,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare r public.stock_intake; p public.products; q integer;
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 select * into r from public.stock_intake where id=p_id for update;
 if not found then raise exception 'Entry not found'; end if;
 if r.status<>'pending' then return to_jsonb(r); end if;
 if p_approve is null then raise exception 'Choose approve or reject'; end if;
 if not p_approve then
  if nullif(btrim(p_note),'') is null then raise exception 'Add a reason for rejection'; end if;
  update public.stock_intake set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note where id=p_id returning * into r;
  return to_jsonb(r);
 end if;
 select * into p from public.products where id=p_product_id and archived_at is null for update;
 if not found then raise exception 'Link an active inventory product first'; end if;
 if r.product_id is not null and r.product_id<>p.id then raise exception 'Wrong product. Reject and record a corrected entry.'; end if;
 if r.kind='count' and (r.expected_revision is null or r.expected_revision<>p.stock_revision) then raise exception 'Stock moved since counting. Reject this entry and recount all locations.'; end if;
 q:=case r.kind when 'arrival' then coalesce(p.quantity,0)+r.quantity when 'dispatch' then coalesce(p.quantity,0)-case when r.already_deducted then 0 else r.quantity end else r.quantity end;
 if q<0 or q>999999 then raise exception 'Resulting stock is invalid. Check the quantity.'; end if;
 update public.stock_intake set product_id=p.id,status='approved',before_quantity=coalesce(p.quantity,0),after_quantity=q,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note where id=p_id returning * into r;
 update public.products set quantity=q where id=p.id;
 return to_jsonb(r);
end $$;

create function public.link_capture_product_v1(p_id uuid,p_revision integer,p_product_id bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare d public.capture_drafts; p public.products;
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 select * into d from public.capture_drafts where id=p_id for update;
 if not found or d.status<>'draft' or d.revision<>p_revision then raise exception 'Draft changed. Reopen before linking.'; end if;
 if d.product_id is not null then raise exception 'Already linked. No change made.'; end if;
 select * into p from public.products where id=p_product_id and archived_at is null for update;
 if not found then raise exception 'Select an active product'; end if;
 if exists(select 1 from public.capture_drafts where product_id=p.id and status='draft' and id<>d.id) then raise exception 'This product already has an open capture. Review that draft first; your photos are safe.'; end if;
 update public.capture_drafts set product_id=p.id,baseline=public.capture_snapshot_v1(p),revision=revision+1,updated_by=auth.uid(),updated_at=now(),data=data||jsonb_build_object('destination','existing','sku',p.sku,'name',p.name,'category',p.category,'material',p.material,'mrp',p.mrp,'cost_price',p.cost_price,'b2b_price',p.b2b_price,'pricingApproved',false,'allLocations',false,'stockConfirmed',false) where id=p_id returning * into d;
 return to_jsonb(d);
end $$;
revoke all on function public.submit_stock_intake_v1(uuid,bigint,text,integer,text,text,text,jsonb,text,boolean,bigint),public.review_stock_intake_v1(uuid,bigint,boolean,text),public.link_capture_product_v1(uuid,integer,bigint) from public,anon,authenticated;
grant execute on function public.submit_stock_intake_v1(uuid,bigint,text,integer,text,text,text,jsonb,text,boolean,bigint),public.review_stock_intake_v1(uuid,bigint,boolean,text),public.link_capture_product_v1(uuid,integer,bigint) to authenticated;
create extension if not exists pg_trgm with schema extensions;
create index if not exists products_match_name on public.products using gin (name extensions.gin_trgm_ops);
create index if not exists products_match_sku on public.products using gin (sku extensions.gin_trgm_ops);
create function public.find_inventory_matches_v1(p_query text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 if length(btrim(p_query))<2 or length(p_query)>150 then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(to_jsonb(t)) from (select id,name,sku,material,size,quantity,image_url,category from public.products where archived_at is null and (name ilike '%'||replace(replace(btrim(p_query),'%',''), '_','')||'%' or sku ilike '%'||replace(replace(btrim(p_query),'%',''), '_','')||'%') order by (lower(sku)=lower(btrim(p_query))) desc,(lower(name)=lower(btrim(p_query))) desc,name limit 12) t),'[]'::jsonb);
end $$;
revoke all on function public.find_inventory_matches_v1(text) from public,anon,authenticated;
grant execute on function public.find_inventory_matches_v1(text) to authenticated;
commit;
