import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAssetPath, getReviewAssets, isCollageCandidate, reviewDraftId, buildReviewDraft, sourceReviewNeedsConfirmation, formatReviewFact } from '../src/capture/catalogue/sourceReview.js';

const datasetId = 'whatsapp-2026-09-13-2026-10-02';
const media = (asset_path = 'assets/product.jpg', role = 'product_photo') => ({ asset_path, role, filename: 'product.jpg', message_id: 'db1-00779' });
const fact = (field, value, extra = {}) => ({ field, value, unit: null, currency: null, basis: null, confidence: 'explicit_sender_text', source_message_ids: ['db1-00779'], note: null, ...extra });
const row = extra => ({ id: 'E001', working_name: 'Working brass diya', name_status: 'visual_working_label', category: 'product_draft', media: [media()], source_message_ids: ['db1-00779'], facts: [], review_flags: ['Confirm product identity'], ...extra });
const photo = { assetId: 'image-1', blob: new Blob(['photo'], { type: 'image/jpeg' }), width: 100, height: 100 };

test('asset allowlist admits flat image paths and rejects traversal, URLs and non-image payloads', () => {
  for (const path of ['assets/product.jpg', 'assets/db1_00001234-PHOTO.jpeg', 'assets/v2.front.PNG', 'assets/item.webp']) assert.equal(safeAssetPath(path), path);
  for (const path of [null, {}, '', 'assets/../photo.jpg', 'assets/sub/photo.jpg', '/assets/photo.jpg', 'assets\\photo.jpg', 'Assets/photo.jpg', 'assets/.photo.jpg', 'assets/a..b.jpg', 'assets/a.svg', 'assets/a.jpg.js', 'assets/a.jpg?x=1', 'assets/a.jpg#x', 'assets/a%2fb.jpg', 'assets/a\n.jpg', 'assets/a.jpg\n', ' assets/a.jpg', 'https://example.com/assets/a.jpg', '//example.com/a.jpg', 'data:image/jpeg;base64,abc', 'blob:abc', `assets/${'a'.repeat(260)}.jpg`]) assert.equal(safeAssetPath(path), '', String(path));
});

test('assets deduplicate by exact safe path, preserve source order and copy only allowed metadata', () => {
  const input = row({ primary_asset_path: 'https://evil.example/photo.jpg', media: [media('assets/second.jpg'), media('assets/first.jpg'), { ...media('assets/second.jpg'), role: 'duplicate' }, media('../invalid.jpg'), { ...media('assets/third.jpg'), supplier_cost: 123, raw_text: 'private', tile_position: { row: 2, column: 1, rows: 3, columns: 2, private: 'secret' }, source_pdf_page: 12 }] });
  const assets = getReviewAssets(input);
  assert.deepEqual(assets.map(item => item.asset_path), ['assets/second.jpg', 'assets/first.jpg', 'assets/third.jpg']);
  assert.equal(assets[0].role, 'product_photo'); assert.notEqual(assets[0], input.media[0]);
  assert.deepEqual(assets[2].tile_position, { row: 2, column: 1, rows: 3, columns: 2 });
  assert.equal(assets[2].source_pdf_page, 12); assert.ok(!JSON.stringify(assets).includes('private'));
  assert.deepEqual(getReviewAssets(null), []); assert.deepEqual(getReviewAssets({ media: 'oops' }), []);
});

test('source IDs are stable, dataset-scoped and do not collapse malformed identifiers', () => {
  const input = row(), first = buildReviewDraft(input, { datasetId }), again = buildReviewDraft(input, { datasetId });
  assert.equal(first.id, `source-review:${datasetId}:E001`); assert.equal(first.id, again.id);
  assert.equal(reviewDraftId(input, datasetId), first.id);
  assert.notEqual(reviewDraftId(input, 'another-dataset'), first.id);
  assert.notEqual(reviewDraftId(row({ id: 'E002' }), datasetId), first.id);
  for (const id of [null, '', 'E:001', 'E 001', '../a', 'x'.repeat(161)]) assert.throws(() => reviewDraftId(row({ id }), datasetId), TypeError);
  assert.throws(() => buildReviewDraft(input), TypeError); assert.throws(() => buildReviewDraft(null, { datasetId }), TypeError);
});

test('every import starts pending and source facts never populate optional product fields', () => {
  const facts = [fact('height', 4, { unit: 'inch' }), fact('dimensions', [6, 2], { unit: 'inches', note: 'Axes not stated' }), fact('weight', 500, { unit: 'g' }), fact('catalogue_price_quote', 400, { basis: 'Unstated', selling_price_verified: false })];
  const product = buildReviewDraft(row({ facts, price: 999, length: 6, weight: 500, confirmed_selling_price: 400, sourceReview: { status: 'confirmed' } }), { datasetId, photo });
  assert.equal(product.name, 'Working brass diya'); assert.equal(product.photo, photo);
  for (const field of ['length', 'width', 'height', 'weight', 'price']) assert.equal(product[field], '');
  assert.equal(product.dimensionUnit, 'cm'); assert.equal(product.weightUnit, 'g');
  assert.deepEqual(product.sourceReview.facts, facts); assert.notEqual(product.sourceReview.facts[1].value, facts[1].value);
  assert.equal(product.sourceReview.status, 'pending'); assert.equal(sourceReviewNeedsConfirmation(product), true);
  assert.equal(sourceReviewNeedsConfirmation({ ...product, sourceReview: { ...product.sourceReview, status: 'confirmed' } }), false);
  assert.equal(sourceReviewNeedsConfirmation({ ...product, sourceReview: { status: 'CONFIRMED' } }), true);
  assert.equal(sourceReviewNeedsConfirmation({ ...product, sourceReview: null }), true);
  assert.equal(sourceReviewNeedsConfirmation({ id: 'ordinary-product' }), false); assert.equal(sourceReviewNeedsConfirmation(null), false);
});

test('collage rows can never import a supplied photo, including role-only and invalid-path collages', () => {
  for (const input of [row({ category: 'collage_candidate' }), row({ media: [media('assets/collage.jpg', 'collage_reference')] }), row({ media: [media('../collage.jpg', 'collage_reference'), null] })]) {
    assert.equal(isCollageCandidate(input), true); assert.equal(buildReviewDraft(input, { datasetId, photo }).photo, null);
  }
  assert.equal(isCollageCandidate(row({ media: [] })), false);
  assert.equal(isCollageCandidate(row({ media: [media('assets/collage.jpg', 'collage_reference'), media('assets/individual.jpg')] })), false);
  assert.equal(isCollageCandidate(null), false);
});

test('unknown quote currency stays unknown and evidence, dimensions and supplied ordering stay readable', () => {
  const unknown = formatReviewFact(fact('catalogue_price_quote', 1100, { basis: 'Pair unconfirmed', note: 'Currency and tax not stated' }));
  assert.match(unknown, /1100 \(currency not stated\)/); assert.ok(!unknown.includes('₹')); assert.ok(!unknown.includes('INR'));
  assert.match(unknown, /Basis: Pair unconfirmed/); assert.match(unknown, /Confidence: explicit sender text/); assert.match(unknown, /Currency and tax not stated/);
  assert.match(formatReviewFact(fact('catalogue_price_quote', 0, { currency: 'USD' })), /0 USD/);
  assert.match(formatReviewFact(fact('catalogue_price_quote', 120, { currency: 'INR' })), /120 INR/);
  assert.match(formatReviewFact(fact('dimensions', [6, 2, 3.5], { unit: 'inches' })), /6 × 2 × 3.5 inches/);
  assert.match(formatReviewFact(fact('product_configuration', ['red', 'blue'])), /red, blue/);
  assert.equal(formatReviewFact(null), '');
});

test('privacy boundary drops internal fields, raw observations, context and unapproved fact fields', () => {
  const input = row({
    context_facts: [{ field: 'supplier_cost', value: 'PRIVATE_CONTEXT' }], observations: [{ value: 'PRIVATE_OBSERVATION' }], internal_costs_and_orders: 'PRIVATE_ORDERS',
    facts: [fact('supplier_cost', 'PRIVATE_COST'), fact('procurement_price', 'PRIVATE_PRICE'), fact('catalogue_price_quote', 400, { internal_note: 'PRIVATE_NOTE', raw_text: 'PRIVATE_CHAT', source: { cost: 'PRIVATE_NESTED' } }), fact('material', { cost: 'PRIVATE_VALUE' })],
    media: [{ ...media(), context_facts: 'PRIVATE_MEDIA', internal_cost: 200 }],
  });
  const product = buildReviewDraft(input, { datasetId });
  assert.deepEqual(Object.keys(product.sourceReview), ['datasetId', 'candidateId', 'status', 'workingName', 'nameStatus', 'category', 'facts', 'reviewFlags', 'sourceMessageIds', 'media']);
  assert.equal(product.sourceReview.facts.length, 1);
  assert.ok(!JSON.stringify(product).includes('PRIVATE_')); assert.ok(!JSON.stringify(product).includes('internal_cost'));
  assert.equal(product.price, '');
});

test('malformed evidence and inherited properties cannot leak, change prototypes or invoke accessors', () => {
  const polluted = JSON.parse('{"id":"E001","working_name":"Safe","__proto__":{"polluted":true},"facts":[{"field":"material","value":"brass","__proto__":{"polluted":true}}]}');
  const clean = buildReviewDraft(polluted, { datasetId });
  assert.equal({}.polluted, undefined); assert.equal(Object.getPrototypeOf(clean.sourceReview), Object.prototype);
  assert.ok(!JSON.stringify(clean).includes('__proto__'));
  const getter = { id: 'E001' }; Object.defineProperty(getter, 'working_name', { get() { assert.fail('Must not invoke source accessors'); } });
  assert.equal(buildReviewDraft(getter, { datasetId }).name, '');
  const inherited = Object.create({ id: 'E001', working_name: 'Inherited private name' });
  assert.throws(() => buildReviewDraft(inherited, { datasetId }), TypeError);
  const malformed = row({ facts: [null, 'bad', fact('dimensions', [1, { private: 2 }, 3]), fact('weight', Infinity), fact('dimensions', [1, NaN]), fact('material', 'brass')], media: [null, 1, media()], review_flags: [null, {}, 'Check', 'Check'], source_message_ids: [null, {}, 'db1-00779', 'db1-00779', 'bad:id'] });
  const product = buildReviewDraft(malformed, { datasetId });
  assert.equal(product.sourceReview.facts.length, 1); assert.deepEqual(product.sourceReview.reviewFlags, ['Check']); assert.deepEqual(product.sourceReview.sourceMessageIds, ['db1-00779']);
});

test('bounded evidence and names cannot inflate a draft without limit', () => {
  const long = 'x'.repeat(10000), many = Array.from({ length: 1000 }, (_, i) => `flag-${i}`);
  const product = buildReviewDraft(row({ working_name: long, name_status: long, facts: many.map(() => fact('material', long)), review_flags: many, media: many.map((_, i) => media(`assets/${i}.jpg`)) }), { datasetId });
  assert.equal(product.name.length, 160); assert.equal(product.sourceReview.workingName.length, 160);
  assert.equal(product.sourceReview.nameStatus.length, 2000); assert.equal(product.sourceReview.facts.length, 64); assert.equal(product.sourceReview.facts[0].value.length, 2000);
  assert.equal(product.sourceReview.reviewFlags.length, 64); assert.equal(product.sourceReview.media.length, 64);
});
