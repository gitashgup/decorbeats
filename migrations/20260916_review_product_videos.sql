-- Preserve all current approval checks; append reviewed videos before publishing.
do $migration$
declare definition text; anchor text := 'result:=public.start_inventory_reconciliation_v1';
addition text := $addition$
 -- review-product-videos-v1
 if jsonb_typeof(coalesce(a->'productVideos','{}'::jsonb)) <> 'object' then raise exception 'Invalid product videos'; end if;
 if (select count(*) from jsonb_object_keys(coalesce(a->'productVideos','{}'::jsonb))) > 6 then raise exception 'Maximum 6 extra videos'; end if;
 for k in select video_key from jsonb_object_keys(coalesce(a->'productVideos','{}'::jsonb)) video_key order by video_key loop
  u:=a->'productVideos'->k->>'url';
  if coalesce(u,'') !~ '^https://[^/]+/storage/v1/object/public/products/capture/' or position('/capture/'||p_id::text||'/' in u)=0 then raise exception 'Invalid product video'; end if;
  if not u=any(vids) then vids:=array_append(vids,u); end if;
 end loop;
 if d.product_id is not null then
  foreach old_url in array coalesce(p.video_urls,'{}'::text[]) loop
   if nullif(old_url,'') is not null and not old_url=any(vids) then vids:=array_append(vids,old_url); end if;
  end loop;
 end if;
$addition$;
begin
 select pg_get_functiondef('public.publish_capture_draft_v1(uuid,integer)'::regprocedure) into definition;
 if position('review-product-videos-v1' in definition)>0 then return; end if;
 if position(anchor in definition)=0 then raise exception 'Publisher changed: inspect before migration'; end if;
 execute replace(definition,anchor,addition||anchor);
end $migration$;
