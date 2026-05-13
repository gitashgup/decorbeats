create table if not exists hero_slides (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  eyebrow text,
  title text not null,
  body text,
  cta_label text default 'Shop the Collection',
  cta_action text default 'collection',
  content_position text default 'left',
  image_url text,
  sort_order integer default 1,
  is_active boolean default true
);

alter table hero_slides enable row level security;

drop policy if exists "Public can read active hero slides" on hero_slides;
create policy "Public can read active hero slides"
on hero_slides for select
using (is_active = true);

drop policy if exists "Authenticated users can manage hero slides" on hero_slides;
create policy "Authenticated users can manage hero slides"
on hero_slides for all
to authenticated
using (true)
with check (true);
