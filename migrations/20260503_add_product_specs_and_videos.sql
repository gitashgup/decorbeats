alter table public.products
add column if not exists size text,
add column if not exists weight text,
add column if not exists video_urls text[];
