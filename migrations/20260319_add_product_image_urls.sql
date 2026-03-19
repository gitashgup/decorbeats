alter table public.products
add column if not exists image_urls text[];

update public.products
set image_urls = array[image_url]
where coalesce(array_length(image_urls, 1), 0) = 0
  and image_url is not null
  and btrim(image_url) <> '';
