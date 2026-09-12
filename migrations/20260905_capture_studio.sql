-- Guided photography drafts. Existing products and checkout keep their current authority.
begin;
create table if not exists public.capture_drafts (
 id uuid primary key, product_id bigint references public.products(id),
 revision integer not null default 1, status text not null default 'draft' check(status in ('draft','published')),
 baseline jsonb, data jsonb not null, created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), published_at timestamptz
);
create unique index if not exists capture_one_open_product on public.capture_drafts(product_id) where status = 'draft';
alter table public.capture_drafts enable row level security;
revoke all on public.capture_drafts from public, anon, authenticated;
grant select on public.capture_drafts to authenticated;
create policy capture_admin_read on public.capture_drafts for select to authenticated using(public.is_decorbeats_admin());

create function public.capture_snapshot_v1(p public.products) returns jsonb language sql immutable
set search_path = pg_catalog, public as $$
 select jsonb_build_object('name',p.name,'category',p.category,'material',p.material,'quantity',p.quantity,
 'mrp',p.mrp,'cost_price',p.cost_price,'b2b_price',p.b2b_price,'size',p.size,'weight',p.weight,'notes',p.notes,
 'image_url',p.image_url,'image_urls',p.image_urls,'video_urls',p.video_urls,'archived_at',p.archived_at);
$$;
revoke all on function public.capture_snapshot_v1(public.products) from public, anon, authenticated;

create function public.save_capture_draft_v1(p_id uuid, p_revision integer, p_product_id bigint, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare d public.capture_drafts; p public.products;
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 if p_id is null or p_revision is null or p_revision < 0 or p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text)>100000 then raise exception 'Invalid capture draft'; end if;
 select * into d from public.capture_drafts where id=p_id for update;
 if found then
  if d.status <> 'draft' or d.revision <> p_revision or d.product_id is distinct from p_product_id then
   raise exception 'This product was changed on another device. Reopen its saved draft before editing.';
  end if;
  update public.capture_drafts set data=p_data, revision=revision+1, updated_by=auth.uid(), updated_at=now() where id=p_id returning * into d;
 else
  if p_revision <> 0 then raise exception 'Draft not found'; end if;
  if p_product_id is not null then
   select * into p from public.products where id=p_product_id;
   if not found or p.archived_at is not null then raise exception 'Choose an active product'; end if;
  end if;
  insert into public.capture_drafts(id,product_id,baseline,data,created_by,updated_by)
   values(p_id,p_product_id,case when p_product_id is null then null else public.capture_snapshot_v1(p) end,p_data,auth.uid(),auth.uid()) returning * into d;
 end if;
 return to_jsonb(d);
end $$;
revoke all on function public.save_capture_draft_v1(uuid,integer,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_capture_draft_v1(uuid,integer,bigint,jsonb) to authenticated;

create function public.publish_capture_draft_v1(p_id uuid, p_revision integer)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare d public.capture_drafts; p public.products; a jsonb; l jsonb; k text; q integer:=0;
 imgs text[] := '{}'; vids text[] := '{}'; u text; old_url text; sid uuid; result jsonb; details jsonb;
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 select * into d from public.capture_drafts where id=p_id for update;
 if not found then raise exception 'Draft not found'; end if;
 if d.status='published' then return to_jsonb(d); end if;
 if d.revision<>p_revision then raise exception 'Draft changed. Reopen it before publishing.'; end if;
 a:=d.data;
 if coalesce(a->>'allLocations','false') <> 'true' or coalesce(a->>'stockConfirmed','false') <> 'true' or coalesce(a->>'pricingApproved','false') <> 'true' then raise exception 'Confirm all locations, controlled stock and pricing'; end if;
 if nullif(btrim(a->>'name'),'') is null or nullif(btrim(a->>'unit'),'') is null or nullif(btrim(a->>'material'),'') is null or nullif(btrim(a->>'category'),'') is null then raise exception 'Complete product identity and sellable unit'; end if;
 if jsonb_typeof(a->'locations') <> 'array' or jsonb_array_length(a->'locations')=0 then raise exception 'Add the counted locations'; end if;
 if (select count(*)<>count(distinct lower(btrim(x->>'name'))) from jsonb_array_elements(a->'locations') x) then raise exception 'Combine duplicate locations'; end if;
 for l in select * from jsonb_array_elements(a->'locations') loop
  if nullif(btrim(l->>'name'),'') is null or coalesce(l->>'sellable','') !~ '^\d+$' or coalesce(l->>'damaged','') !~ '^\d+$' then raise exception 'Enter whole-number counts for each location'; end if;
  q:=q+(l->>'sellable')::integer;
 end loop;
 if q>999999 then raise exception 'Count is too large'; end if;
 foreach k in array array['length','width','height','weight_g','packed_length','packed_width','packed_height','packed_weight_g','mrp'] loop
  if coalesce(a->>k,'') !~ '^\d+(\.\d+)?$' or (a->>k)::numeric <= 0 or (a->>k)::numeric > 1000000000 then raise exception 'Complete positive measurements and price: %',k; end if;
 end loop;
 if (a->>'packed_weight_g')::numeric<(a->>'weight_g')::numeric then raise exception 'Packed weight is below product weight'; end if;
 if coalesce(a->>'cost_price','') !~ '^\d+(\.\d+)?$' then raise exception 'Confirm the unit cost'; end if;
 foreach k in array array['hero','front','back','detail','contents'] loop
  u:=a->'photos'->k->>'url';
  if coalesce(u,'')='' then
   if k<>'contents' then raise exception 'Missing required photograph: %',k; end if;
  else
   if u !~ '^https://[^/]+/storage/v1/object/public/products/capture/' or position('/capture/'||p_id::text||'/' in u)=0 then raise exception 'Invalid processed photo'; end if;
   imgs:=array_append(imgs,u);
  end if;
 end loop;
 u:=a->'video'->>'url';
 if nullif(u,'') is not null then
  if u !~ '^https://[^/]+/storage/v1/object/public/products/capture/' or position('/capture/'||p_id::text||'/' in u)=0 then raise exception 'Invalid video'; end if;
  vids:=array[u];
 end if;
 if d.product_id is not null then
  select * into p from public.products where id=d.product_id for update;
  if not found or public.capture_snapshot_v1(p) is distinct from d.baseline then raise exception 'Live inventory or product details changed since capture started. Review the current inventory before publishing.'; end if;
  if coalesce(a->>'keepExistingPhotos','true')='true' then
   foreach old_url in array coalesce(p.image_urls,'{}'::text[]) loop
    if nullif(old_url,'') is not null and not old_url=any(imgs) then imgs:=array_append(imgs,old_url); end if;
   end loop;
  end if;
  if cardinality(vids)=0 then vids:=coalesce(p.video_urls,'{}'::text[]); end if;
 end if;
 result:=public.start_inventory_reconciliation_v1(p_id,'Photography capture','Location counts stored in capture draft '||p_id::text);
 sid:=(result->'session'->>'id')::uuid;
 if sid is null then sid:=(result->>'id')::uuid; end if;
 details:=jsonb_build_object('name',a->>'name','category',a->>'category','material',a->>'material',
 'mrp',(a->>'mrp')::numeric,'cost_price',(a->>'cost_price')::numeric,
 'size',(a->>'length')||' × '||(a->>'width')||' × '||(a->>'height')||' cm',
 'weight',(a->>'weight_g')||' g','notes',coalesce(a->>'notes',''));
 if d.product_id is null then
  result:=public.quick_create_inventory_product_v1(sid,p_id,details||jsonb_build_object('quantity',q));
  select * into p from public.products where id=(result->'product'->>'id')::bigint;
 else
  result:=public.confirm_inventory_count_v1(sid,p.id,p.quantity,q,'physical_count','Photography: '||(a->'locations')::text,details,p_id);
 end if;
 update public.products set image_url=imgs[1],image_urls=imgs,video_urls=vids,
  b2b_price=case when nullif(a->>'b2b_price','') is null then null else (a->>'b2b_price')::numeric end
  where id=p.id;
 perform public.complete_inventory_reconciliation_v1(sid);
 update public.capture_drafts set status='published',product_id=p.id,revision=revision+1,updated_at=now(),updated_by=auth.uid(),published_at=now() where id=p_id returning * into d;
 return to_jsonb(d);
end $$;
revoke all on function public.publish_capture_draft_v1(uuid,integer) from public,anon,authenticated;
grant execute on function public.publish_capture_draft_v1(uuid,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit) values('capture-originals','capture-originals',false,104857600) on conflict(id) do nothing;
create policy capture_originals_read on storage.objects for select to authenticated using(bucket_id='capture-originals' and public.is_decorbeats_admin());
create policy capture_originals_insert on storage.objects for insert to authenticated with check(bucket_id='capture-originals' and public.is_decorbeats_admin());
commit;
