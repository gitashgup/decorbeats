create or replace function public.validate_capture_money_v1() returns trigger language plpgsql
set search_path=pg_catalog,public as $$ declare k text;v text;begin
 foreach k in array array['mrp','cost_price','b2b_price'] loop
  v:=new.data->>k;
  if nullif(v,'') is not null then
   if v !~ '^\d+(\.\d+)?$' then raise exception 'Enter a non-negative amount for %',k;end if;
   if v::numeric>1000000000 or round(v::numeric,2)<>v::numeric then raise exception 'Use up to two decimals for %',k;end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.validate_capture_money_v1() from public,anon,authenticated;
create trigger capture_validate_money before insert or update on public.capture_drafts for each row execute function public.validate_capture_money_v1();
-- Other product-bucket paths keep their current access. New capture assets require an admin to mutate.
create policy capture_assets_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'products' or split_part(name,'/',1)<>'capture' or public.is_decorbeats_admin());
create policy capture_assets_update on storage.objects as restrictive for update to authenticated using(bucket_id<>'products' or split_part(name,'/',1)<>'capture' or public.is_decorbeats_admin()) with check(bucket_id<>'products' or split_part(name,'/',1)<>'capture' or public.is_decorbeats_admin());
create policy capture_assets_delete on storage.objects as restrictive for delete to authenticated using(bucket_id<>'products' or split_part(name,'/',1)<>'capture' or public.is_decorbeats_admin());
