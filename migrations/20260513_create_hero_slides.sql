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

do $$
begin
  if not exists (
    select 1
    from hero_slides
    where image_url = '/assets/images/slider-credibility-studio.svg'
  ) then
    update hero_slides
    set sort_order = coalesce(sort_order, 1) + 1
    where is_active = true;

    insert into hero_slides (
      eyebrow,
      title,
      body,
      cta_label,
      cta_action,
      content_position,
      image_url,
      sort_order,
      is_active
    )
    values (
      'Decorbeats Trust',
      'See the craft|gift with confidence.',
      'Bengaluru experience center, GST presence across KA, TN & MH, and bulk gifting support from 50 to 400+ units.',
      'Enquire on WhatsApp',
      'whatsapp',
      'left',
      '/assets/images/slider-credibility-studio.svg',
      1,
      true
    );
  end if;
end $$;
