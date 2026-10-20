import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PDF_PRODUCTS, CATALOGUE_BRAND, catalogueFilename, containPhoto,
  formatProductDetails, validateCatalogueInput, generateCataloguePdf,
} from '../src/capture/catalogue/pdf.js';

// An actual, tiny 80 x 100 JPEG, kept inline so tests never fetch product images.
const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAFADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwC5RRRXzZ6gUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/Z';
const photo = { blob: new Blob([Buffer.from(JPEG, 'base64')], { type: 'image/jpeg' }), width: 80, height: 100 };
const product = (overrides = {}) => ({ id: 'local-1', name: 'Brass diya', photo, ...overrides });

test('blank optional fields produce no labels, placeholders or invented values', () => {
  assert.deepEqual(formatProductDetails({ length: '', width: ' ', height: null, weight: '', price: undefined }), {
    dimensions: '', weight: '', price: '',
  });
  assert.equal(formatProductDetails({ price: '0' }).price, '₹0');
});

test('partial dimensions retain their labels and selected units', () => {
  assert.deepEqual(formatProductDetails({ length: '12.5', height: '3', dimensionUnit: 'in', weight: '0.45', weightUnit: 'kg', price: '12345.5' }), {
    dimensions: 'Length 12.5 in  ·  Height 3 in', weight: 'Weight 0.45 kg', price: '₹12,345.5',
  });
  assert.equal(formatProductDetails({ width: '28', dimensionUnit: 'mm' }).dimensions, 'Width 28 mm');
});

test('invalid optional values fail explicitly rather than being invented or discarded', () => {
  for (const value of [-1, 'free', '₹99', '1,500', Infinity, '1e9', '1000000001']) {
    assert.throws(() => formatProductDetails({ price: value }), /Price/);
  }
  for (const value of [0, -1, 'unknown']) assert.throws(() => formatProductDetails({ height: value }), /Height/);
  assert.throws(() => formatProductDetails({ weightUnit: 'lb' }), /g or kg/);
  assert.throws(() => formatProductDetails({ dimensionUnit: 'ft' }), /cm, in or mm/);
});

test('filenames are safe, bounded and do not include a path', () => {
  assert.equal(catalogueFilename('Festive Edit / October 2026'), 'decorbeats-festive-edit-october-2026.pdf');
  assert.equal(catalogueFilename('Déjà vu'), 'decorbeats-deja-vu.pdf');
  assert.equal(catalogueFilename(' '), 'decorbeats-product-catalogue.pdf');
  assert.ok(!catalogueFilename('../catalogue\\../../file').includes('/'));
  assert.ok(catalogueFilename('a'.repeat(500)).length <= 85);
});

test('images are contained and centered, never cropped or stretched', () => {
  assert.deepEqual(containPhoto(100, 200, { x: 10, y: 20, width: 100, height: 100 }), {
    x: 35, y: 20, width: 50, height: 100,
  });
  assert.deepEqual(containPhoto(200, 100, { x: 10, y: 20, width: 100, height: 100 }), {
    x: 10, y: 45, width: 100, height: 50,
  });
  assert.throws(() => containPhoto(0, 100, { x: 0, y: 0, width: 100, height: 100 }), /invalid dimensions/);
});

test('input validation caps pages and prevents missing product names or photos', () => {
  assert.throws(() => validateCatalogueInput({ products: [] }), /at least one/);
  assert.throws(() => validateCatalogueInput({ products: Array.from({ length: 51 }, () => product()) }), /up to 50/);
  assert.throws(() => validateCatalogueInput({ products: [product({ name: ' ' })] }), /Enter a name/);
  assert.throws(() => validateCatalogueInput({ products: [product({ name: 'a'.repeat(161) })] }), /160/);
  assert.throws(() => validateCatalogueInput({ products: [product({ photo: null })] }), /photograph/);
  assert.throws(() => validateCatalogueInput({ products: [product({ photo: { blob: new Blob([]) } })] }), /photograph/);
  assert.throws(() => validateCatalogueInput({ title: 'a'.repeat(161), products: [product()] }), /160/);
});

test('normalization does not mutate the draft or include arbitrary URLs', () => {
  const original = product({ name: '  Brass\n diya  ' });
  const result = validateCatalogueInput({ title: '  Our\n collection ', products: [original] });
  assert.equal(result.title, 'Our collection');
  assert.equal(result.products[0].name, 'Brass diya');
  assert.equal(original.name, '  Brass\n diya  ');
  assert.equal(CATALOGUE_BRAND.whatsappUrl, 'https://wa.me/919811133661');
});

test('the exporter makes a real multi-page PDF with embedded fonts and photos, without network access', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('PDF generation must not fetch user photos or fonts.'); };
  try {
    const progress = [];
    const result = await generateCataloguePdf({ title: 'Festive Edit', products: [product({ price: '1299', length: '12.5' }), product({ id: 'local-2', name: 'Decorative bowl' })], onProgress: (entry) => progress.push(entry) });
    assert.equal(result.filename, 'decorbeats-festive-edit.pdf');
    assert.equal(result.pageCount, 2);
    assert.equal(result.blob.type, 'application/pdf');
    const text = Buffer.from(await result.blob.arrayBuffer()).toString('latin1');
    assert.ok(text.startsWith('%PDF-'));
    assert.match(text, /\/Count 2\b/);
    assert.equal((text.match(/\/Type \/Page\b/g) || []).length, 2);
    assert.match(text, /\/FontFile2/);
    assert.match(text, /\/ToUnicode/);
    assert.match(text, /\/Subtype \/Image/);
    assert.match(text, /\/Title \(Festive Edit\)/);
    assert.match(text, /https:\/\/wa.me\/919811133661/);
    assert.deepEqual(progress, [{ completed: 0, total: 2 }, { completed: 1, total: 2 }, { completed: 2, total: 2 }]);
    assert.equal('previewUrls' in result, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('fifty long-name products fit in fifty pages without silent truncation', async () => {
  const name = ('Decorative brass floral bowl with a sculpted rim and an intricately detailed surface ').repeat(2).slice(0, 160);
  const result = await generateCataloguePdf({ title: 'W'.repeat(160), products: Array.from({ length: MAX_PDF_PRODUCTS }, (_, i) => product({ id: `item-${i}`, name: i === 0 ? 'W'.repeat(160) : name, price: '1000000000', length: '999999999.999999', width: '12', height: '5', weight: '0.123456', weightUnit: 'kg' })) });
  assert.equal(result.pageCount, MAX_PDF_PRODUCTS);
  const text = Buffer.from(await result.blob.arrayBuffer()).toString('latin1');
  assert.equal((text.match(/\/Type \/Page\b/g) || []).length, MAX_PDF_PRODUCTS);
});

test('invalid JPEG contents do not produce a misleading successful download', async () => {
  await assert.rejects(generateCataloguePdf({ products: [product({ photo: { blob: new Blob(['not a JPEG'], { type: 'image/jpeg' }) } })] }), /not a JPEG/);
  await assert.rejects(generateCataloguePdf({ products: [product({ photo: { blob: new Blob([new Uint8Array([255, 216, 255, 0])], { type: 'image/jpeg' }) } })] }), /could not be read/);
});

test('cancellation stops before loading and between pages', async () => {
  const alreadyCancelled = new AbortController();
  alreadyCancelled.abort();
  await assert.rejects(generateCataloguePdf({ signal: alreadyCancelled.signal }), { name: 'AbortError' });
  const controller = new AbortController();
  await assert.rejects(generateCataloguePdf({ products: [product(), product()], signal: controller.signal, onProgress: ({ completed }) => { if (completed === 1) controller.abort(); } }), { name: 'AbortError' });
});

test('unsupported scripts and emoji fail visibly rather than silently losing names', async () => {
  await assert.rejects(generateCataloguePdf({ title: 'दीपावली संग्रह', products: [product()] }), /cannot display/);
  await assert.rejects(generateCataloguePdf({ title: 'Collection', products: [product({ name: 'गणेश पीतल दिया 🏺' })] }), /cannot display/);
  await assert.rejects(generateCataloguePdf({ title: 'Collection', products: [product({ name: 'Diya 🏺' })] }), /without emoji/);
  const result = await generateCataloguePdf({ title: 'Décor', products: [product({name:'Décor bowl', price:'1499'})] });
  assert.equal(result.pageCount, 1);
});

test('astral math letters are rejected because the PDF encoder cannot preserve surrogate pairs', async () => {
  await assert.rejects(generateCataloguePdf({title:'𝔸𝔹𝔻 Test',products:[product()]}),/cannot display/);
});

test('PDF validation refuses imported candidates until review is confirmed, including damaged metadata',()=>{
  const product={id:'source-review:dataset:E1',name:'Source item',photo:{blob:new Blob(['photo']),width:800,height:800}};
  assert.throws(()=>validateCatalogueInput({products:[product]}),/Confirm WhatsApp draft/);
  product.sourceReview=null;assert.throws(()=>validateCatalogueInput({products:[product]}),/Confirm WhatsApp draft/);
  product.sourceReview={status:'pending'};assert.throws(()=>validateCatalogueInput({products:[product]}),/Confirm WhatsApp draft/);
  product.sourceReview={status:'confirmed'};assert.doesNotThrow(()=>validateCatalogueInput({products:[product]}));
});
