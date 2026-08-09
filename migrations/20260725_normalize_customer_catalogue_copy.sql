-- Normalize customer-facing catalogue values already stored in Supabase.
-- Each name correction is deliberately scoped to a stable SKU.

update public.products
set name = 'Brass Shiva Head Heavy'
where sku = 'DB-BR-SHIVHEAD-01-S'
  and name = 'Braas Shiva HEad Heavy';

update public.products
set name = 'Brass Bowl & Spoon Gift Box — Set of 2'
where sku = 'DB-BR-BWLSPON-01-P'
  and name = 'Brass Bowl spoon in gift bax set of 2';

update public.products
set name = 'Coffee Cup Set'
where sku = 'DB-BR-COFSET-01-S'
  and name = 'Coffe cup set';

update public.products
set name = 'Coffee Cup Set Premium'
where sku = 'DB-BR-COFSET-02-S'
  and name = 'Coffe cup set premium';

update public.products
set name = 'Brass Ganesha — 4 inch'
where sku = 'Gamesha 001'
  and name = 'Brass Gamesha 4 inch';

update public.products
set name = 'Brass Urli Diya Design',
    category = 'Urli'
where sku = 'DB-BR-URLI-02-S'
  and (name = 'BRASS URLI DIYA DESIGN' or category = 'URLI');

update public.products
set category = 'Urli'
where lower(category) = 'urli'
  and category <> 'Urli';
