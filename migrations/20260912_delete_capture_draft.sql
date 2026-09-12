-- Remove only an explicitly selected, unchanged capture draft; never its product or photos.
begin;
create or replace function public.delete_capture_draft_v1(p_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_decorbeats_admin() then raise exception 'Admin sign-in required'; end if;
 delete from public.capture_drafts where id=p_id and status='draft' and revision=p_revision;
 if not found then raise exception 'This draft changed or was published. Refresh before deleting.'; end if;
end $$;
revoke all on function public.delete_capture_draft_v1(uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_capture_draft_v1(uuid,integer) to authenticated;
commit;
