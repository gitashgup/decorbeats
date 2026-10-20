import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeWeightBadge,
  formatDimensionsSpec,
  parseWeightGrams,
  normalizeCatalogueItem,
  buildMergedCataloguePool,
  buildProductShareText,
  generateGoogleFlowPrompt,
  compileJpegPagesToPdf
} from '../src/capture/catalogueGenerator.js';

test('describeWeightBadge celebrates solid brass weight in grams and kg', () => {
  const light = describeWeightBadge(320);
  assert.equal(light.gramsText, '320 g');
  assert.equal(light.tier, 'Solid Artisan Weight');

  const medium = describeWeightBadge(754);
  assert.equal(medium.gramsText, '754 g');
  assert.equal(medium.tier, 'Substantial Heirloom Weight');

  const heavy = describeWeightBadge(1450);
  assert.equal(heavy.gramsText, '1,450 g');
  assert.equal(heavy.kgText, '1.45 kg');
  assert.ok(heavy.shortLabel.includes('1.45 kg'));
  assert.equal(heavy.tier, 'Heavy Statement Casting');

  const monumental = describeWeightBadge(2400);
  assert.equal(monumental.tier, 'Monumental Heirloom Weight');
});

test('formatDimensionsSpec formats cm and inches accurately', () => {
  const spec = formatDimensionsSpec({ height: 18, width: 14, length: 9 });
  assert.equal(spec.hasDimensions, true);
  assert.equal(spec.cmSummary, 'H 18 × W 14 × D 9 cm');
  assert.equal(spec.inchSummary, '7.1" × 5.5" × 3.5"');
  assert.ok(spec.combinedSummary.includes('H 18 × W 14 × D 9 cm'));
  assert.ok(spec.combinedSummary.includes('7.1" × 5.5" × 3.5"'));

  const parsedFromText = formatDimensionsSpec({ sizeText: '6 × 4 × 9 cm' });
  assert.equal(parsedFromText.hasDimensions, true);
  assert.equal(parsedFromText.height, '9');
});

test('parseWeightGrams handles numeric grams and text strings in g or kg', () => {
  assert.equal(parseWeightGrams(754, null), 754);
  assert.equal(parseWeightGrams('', '1.4 kg weight'), 1400);
  assert.equal(parseWeightGrams('', '533 g'), 533);
});

test('normalizeCatalogueItem and buildMergedCataloguePool combine lightbox drafts and inventory', () => {
  const product = {
    id: 101,
    sku: 'DB-BR-ELE-01-S',
    name: 'Brass Elephant Set of 2',
    category: 'Decor',
    material: 'Brass',
    quantity: 5,
    mrp: 1850,
    image_url: 'https://example.com/ele-old.jpg',
    size: '6 × 4 × 9 cm',
    weight: '754 g'
  };

  const draft = {
    id: 'draft-ele-1',
    product_id: 101,
    status: 'draft',
    baseline: product,
    data: {
      name: 'Handcrafted Brass Elephant Pair',
      category: 'Decor',
      material: 'Solid Brass',
      unit: 'Set of 2 Elephants',
      weight_g: '780',
      height: '9',
      width: '4',
      length: '6',
      mrp: '1950',
      b2b_price: '1550',
      locations: [
        { name: 'Section 1', sellable: '12', damaged: '0' },
        { name: 'Section 2', sellable: '8', damaged: '1' }
      ],
      photos: {
        hero: {
          url: 'https://example.com/ele-raw.webp',
          cleanedPreview: { url: 'https://example.com/ele-clean-white.webp' }
        },
        front: { url: 'https://example.com/ele-front.webp' }
      }
    }
  };

  const standaloneDraft = {
    id: 'draft-new-diya',
    product_id: null,
    status: 'draft',
    data: {
      name: 'Peacock Akhand Diya',
      category: 'Diya',
      material: 'Brass',
      weight_g: '620',
      height: '15',
      width: '10',
      locations: [{ name: 'Lightbox', sellable: '30', damaged: '0' }],
      photos: {
        hero: { url: 'https://example.com/diya-hero.webp' }
      }
    }
  };

  const merged = buildMergedCataloguePool([product], [draft, standaloneDraft]);
  assert.equal(merged.length, 2);

  const diyaItem = merged.find((x) => x.name === 'Peacock Akhand Diya');
  assert.ok(diyaItem);
  assert.equal(diyaItem.quantity, 30);
  assert.equal(diyaItem.weightG, 620);

  const eleItem = merged.find((x) => x.productId === 101);
  assert.ok(eleItem);
  assert.equal(eleItem.quantity, 20); // 12 + 8 sellable
  assert.equal(eleItem.weightG, 780);
  assert.equal(eleItem.imageUrl, 'https://example.com/ele-clean-white.webp');
  assert.equal(eleItem.mrp, 1950);
  assert.equal(eleItem.bulkPrice, 1550);
});

test('buildProductShareText respects show_price, show_bulk, and hide_price modes', () => {
  const item = normalizeCatalogueItem(
    {
      id: 7,
      sku: 'DB-DIYA-07',
      name: 'Kamatchi Brass Diya',
      category: 'Diya',
      material: 'Solid Brass',
      quantity: 18,
      weight_g: 540,
      height: 14,
      width: 9,
      mrp: 1400,
      b2b_price: 1100
    },
    'product'
  );

  const textShow = buildProductShareText(item, { asOfDate: '17 Oct 2026', priceMode: 'show_price' });
  assert.ok(textShow.includes('540 g'));
  assert.ok(textShow.includes('18 Units Ready to Dispatch'));
  assert.ok(textShow.includes('₹1,400'));

  const textBulk = buildProductShareText(item, { asOfDate: '17 Oct 2026', priceMode: 'show_bulk' });
  assert.ok(textBulk.includes('₹1,400'));
  assert.ok(textBulk.includes('₹1,100'));

  const textHide = buildProductShareText(item, { asOfDate: '17 Oct 2026', priceMode: 'hide_price' });
  assert.equal(textHide.includes('₹1,400'), false);
  assert.ok(textHide.includes('Pricing on Request'));
});

test('generateGoogleFlowPrompt embeds exact weight, dimensions, and 9:16 instructions', () => {
  const item = normalizeCatalogueItem(
    {
      id: 9,
      sku: 'DB-KRISHNA-09',
      name: 'Brass Lord Krishna Playing Flute',
      category: 'Idol',
      material: 'Solid Brass',
      quantity: 10,
      weight_g: 1250,
      height: 22,
      width: 11,
      length: 9
    },
    'product'
  );

  const flow = generateGoogleFlowPrompt(item, 'festive_diwali');
  assert.ok(flow.prompt.includes('9:16'));
  assert.ok(flow.prompt.includes('Brass Lord Krishna Playing Flute'));
  assert.ok(flow.prompt.includes('1.25 kg'));
  assert.ok(flow.prompt.includes('H 22 × W 11 × D 9 cm'));
});

test('compileJpegPagesToPdf creates a valid multi-page PDF 1.4 binary with clickable URI annotations', () => {
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  const pdfBytes = compileJpegPagesToPdf([
    {
      jpegBytes: fakeJpeg,
      width: 1080,
      height: 1920,
      links: [{ x: 68, y: 1666, w: 944, h: 110, url: 'https://wa.me/919811133661' }]
    },
    {
      jpegBytes: fakeJpeg,
      width: 1080,
      height: 1920,
      links: []
    }
  ]);

  const pdfString = new TextDecoder('latin1').decode(pdfBytes);
  assert.ok(pdfString.startsWith('%PDF-1.4'));
  assert.ok(pdfString.includes('/Count 2'));
  assert.ok(pdfString.includes('/Filter /DCTDecode'));
  assert.ok(pdfString.includes('/URI (https://wa.me/919811133661)'));
  assert.ok(pdfString.trimEnd().endsWith('%%EOF'));
});
