grant usage on schema public to anon, authenticated;

grant select on table public.share_catalogues to anon, authenticated;
grant insert, update, delete on table public.share_catalogues to authenticated;

grant select on table public.share_catalogue_items to anon, authenticated;
grant insert, update, delete on table public.share_catalogue_items to authenticated;

notify pgrst, 'reload schema';
