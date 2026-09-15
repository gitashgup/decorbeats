-- Extend the current publisher without replacing its inventory/permission checks.
do $migration$
declare definition text; anchor text := 'u:=a->''video''->>''url'';';
addition text := $addition$
 -- edited-review-photos-v1
 if (select count(*) from jsonb_object_keys(coalesce(a->'photos','{}'::jsonb)) photo_key where photo_key like 'edited\_%' escape '\') > 12 then
  raise exception 'Maximum 12 edited photos';
 end if;
 for k in select photo_key from jsonb_object_keys(coalesce(a->'photos','{}'::jsonb)) photo_key where photo_key like 'edited\_%' escape '\' order by photo_key loop
  u:=a->'photos'->k->>'url';
  if coalesce(u,'') !~ '^https://[^/]+/storage/v1/object/public/products/capture/' or position('/capture/'||p_id::text||'/' in u)=0 then raise exception 'Invalid edited photo'; end if;
  if not u=any(imgs) then imgs:=array_append(imgs,u); end if;
 end loop;
$addition$;
begin
 select pg_get_functiondef('public.publish_capture_draft_v1(uuid,integer)'::regprocedure) into definition;
 if position('edited-review-photos-v1' in definition)>0 then return; end if;
 if position(anchor in definition)=0 then raise exception 'Publisher changed: inspect before migration'; end if;
 execute replace(definition,anchor,addition||anchor);
end $migration$;
