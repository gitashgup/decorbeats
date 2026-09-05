-- Explicitly review live changes before recounting. Never changes official stock.
create or replace function public.refresh_capture_baseline_v1(p_id uuid,p_revision integer,p_current jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare d public.capture_drafts;p public.products;
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required';end if;
 select * into d from public.capture_drafts where id=p_id for update;
 if not found or d.status<>'draft' or d.revision<>p_revision or d.product_id is null then raise exception 'Reopen the saved draft';end if;
 select * into p from public.products where id=d.product_id for update;
 if not found or p.archived_at is not null then raise exception 'Product is no longer active';end if;
 if public.capture_snapshot_v1(p) is distinct from p_current then raise exception 'Inventory changed again. Refresh the comparison.';end if;
 update public.capture_drafts set baseline=p_current,
  data=data||'{"allLocations":false,"stockConfirmed":false,"pricingApproved":false}'::jsonb,
  revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=p_id returning * into d;
 return to_jsonb(d);
end $$;
revoke all on function public.refresh_capture_baseline_v1(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.refresh_capture_baseline_v1(uuid,integer,jsonb) to authenticated;
