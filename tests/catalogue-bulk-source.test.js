import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BULK_REVIEW_DRAFTS, prepareAllReviewDrafts, mergeBulkReviewDrafts } from '../src/capture/catalogue/bulkSourceReview.js';
import { MAX_CATALOGUE_PRODUCTS, MAX_PRODUCTS, newProduct, newWorkspace } from '../src/capture/catalogue/model.js';
import { buildReviewDraft, formatReviewFact, reviewDraftId } from '../src/capture/catalogue/sourceReview.js';

// Synthetic source data only. No real review pack or private product data belongs
// in the test suite or deployed application bundle.
const datasetId = 'synthetic-review-v1';
const blob = value => new Blob([value], { type: 'image/jpeg' });
const media = (path = 'assets/item.jpg', role = 'product_photo') => ({ asset_path: path, role });
const row = (id, extra = {}) => ({ id, working_name: `Working product ${id}`, name_status: 'visual_working_label', category: 'product_draft', facts: [], review_flags: ['Check product identity'], source_message_ids: ['synthetic-001'], media: [media()], ...extra });
const source = (rows, extra = {}) => ({ datasetId, title: 'Synthetic review', products: rows, assets: { 'assets/item.jpg': blob('image') }, ...extra });
const photo = file => ({ assetId: `photo:${file.name}`, blob: file, name: file.name, width: 900, height: 900 });
const preparePhoto = async file => photo(file);
const freeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || value instanceof Blob) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
};
const ordinary = id => ({ ...newProduct(), id, name: `Existing ${id}` });

test('all 97 candidates become ordered pending drafts; 34 collages stay photo-free', async () => {
  const rows = Array.from({ length: 97 }, (_, index) => row(`C${index + 1}`, index < 34 ? { category: 'collage_candidate', media: [media('assets/item.jpg', 'collage_reference')] } : {}));
  const pack = freeze(source(rows)), existing = freeze([]), progress = [];
  let preparations = 0, active = 0, peak = 0;
  const result = await prepareAllReviewDrafts(pack, existing, { onProgress: update => progress.push(update), preparePhoto: async file => {
    active++; peak = Math.max(peak, active); preparations++;
    await Promise.resolve(); active--; return photo(file);
  } });
  assert.equal(result.length, 97);
  assert.deepEqual(result.map(product => product.id), rows.map(item => reviewDraftId(item, datasetId)));
  assert.equal(preparations, 63); assert.equal(peak, 1);
  assert.equal(result.filter(product => product.photo === null).length, 34);
  assert.ok(result.slice(0, 34).every(product => product.sourceReview.reviewFlags.some(flag => /collage is reference only/.test(flag))));
  for (const product of result) {
    assert.equal(product.sourceReview.status, 'pending');
    for (const field of ['length', 'width', 'height', 'weight', 'price']) assert.equal(product[field], '');
  }
  assert.deepEqual(progress.map(update => update.completed), Array.from({ length: 98 }, (_, index) => index));
  assert.ok(progress.every(update => update.total === 97 && typeof update.message === 'string'));
  const state = newWorkspace(), merged = mergeBulkReviewDrafts(state, result);
  assert.equal(merged.products.length, 97); assert.equal(merged.catalogues[0].productIds.length, 97);
  assert.equal(merged.editingId, result[0].id); assert.equal(state.products.length, 0);
});

test('existing drafts are reused by exact identity, preserving every edit and source field', async () => {
  const input = row('A'), oldPhoto = { blob: blob('edited-photo'), width: 600, height: 700 };
  const existing = freeze({ ...buildReviewDraft(input, { datasetId }), name: 'Edited product', length: '12', price: '750', photo: oldPhoto, photos: [oldPhoto], custom: { keep: true }, sourceReview: { datasetId: 'edited-source', candidateId: 'edited-id', status: 'confirmed', facts: [{ field: 'material', value: 'Edited material' }], reviewFlags: ['Edited warning'], photoPreparationError: 'An old warning' } });
  const pack = freeze(source([input, row('B')], { assets: {} }));
  const result = await prepareAllReviewDrafts(pack, freeze([existing]), { preparePhoto: () => assert.fail('No existing photo should be prepared again') });
  assert.equal(result[0], existing); assert.equal(result[0].photo, oldPhoto); assert.equal(result[0].sourceReview.status, 'confirmed');
  assert.equal(result[1].sourceReview.status, 'pending'); assert.equal(result[1].photo, null);
});

test('primary photo uses a valid local Blob; fallback follows source media order', async () => {
  const assets = { 'assets/first.jpg': blob('first'), 'assets/primary.jpg': blob('primary'), 'assets/last.jpg': blob('last') };
  const items = [media('assets/first.jpg'), media('assets/primary.jpg'), media('assets/last.jpg')];
  const pack = source([
    row('A', { primary_asset_path: 'assets/primary.jpg', media: items }),
    row('B', { primary_asset_path: 'assets/missing.jpg', media: items }),
    row('C', { primary_asset_path: 'https://example.invalid/private.jpg', media: items }),
    row('D', { primary_asset_path: 'assets/missing.jpg', media: [media('assets/missing.jpg'), ...items] }),
  ], { assets });
  const calls = [];
  const result = await prepareAllReviewDrafts(pack, [], { preparePhoto: async file => { calls.push([file.name, await file.text(), file.type]); return photo(file); } });
  assert.deepEqual(calls, [ ['primary.jpg', 'primary', 'image/jpeg'], ['first.jpg', 'first', 'image/jpeg'], ['first.jpg', 'first', 'image/jpeg'], ['first.jpg', 'first', 'image/jpeg'] ]);
  assert.ok(result.every(product => product.photo && !product.sourceReview.photoPreparationError));
});

test('collage references cannot be chosen as a product photo, even as a mixed row primary', async () => {
  const pack = source([
    row('A', { media: [media('assets/item.jpg', 'collage_reference')] }),
    row('B', { category: 'collage_candidate' }),
    row('C', { media: [media('../invalid.jpg', 'collage_reference')] }),
    row('D', { primary_asset_path: 'assets/collage.jpg', media: [media('assets/collage.jpg', 'collage_reference'), media('assets/item.jpg')] }),
  ], { assets: { 'assets/item.jpg': blob('individual'), 'assets/collage.jpg': blob('collage') } });
  const calls = [];
  const result = await prepareAllReviewDrafts(pack, [], { preparePhoto: async file => { calls.push(file.name); return photo(file); } });
  assert.deepEqual(result.slice(0, 3).map(product => product.photo), [null, null, null]);
  assert.deepEqual(calls, ['item.jpg']);
});

test('missing, invalid and text-only photos retain every row with a clear review flag', async () => {
  const pack = source([row('A'), row('B', { media: [] }), row('C', { media: [media('https://example.invalid/a.jpg')] }), row('D', { media: [media('assets/empty.jpg')] })], { assets: { 'assets/item.jpg': 'https://example.invalid/image.jpg', 'assets/empty.jpg': blob('') } });
  const result = await prepareAllReviewDrafts(freeze(pack), [], { preparePhoto: () => assert.fail('There is no valid local Blob') });
  assert.equal(result.length, 4);
  for (const product of result) {
    assert.equal(product.photo, null); assert.equal(product.sourceReview.status, 'pending');
    assert.equal(typeof product.sourceReview.photoPreparationError, 'string');
    assert.match(product.sourceReview.photoPreparationError, /Add a product photo/);
    assert.equal(product.sourceReview.reviewFlags[0], 'Check product identity');
    assert.ok(product.sourceReview.reviewFlags.some(flag => flag.startsWith('Photo needed:')));
  }
});

test('partial decode failures retain pending drafts and later photos are still prepared', async () => {
  const rows = ['good', 'bad', 'later'].map(id => row(id, { media: [media(`assets/${id}.jpg`)] }));
  const pack = source(rows, { assets: Object.fromEntries(rows.map(item => [item.media[0].asset_path, blob(item.id)])) });
  const calls = [];
  const result = await prepareAllReviewDrafts(pack, [], { preparePhoto: async file => { calls.push(file.name); if (file.name === 'bad.jpg') throw new Error('This image could not be decoded.'); return photo(file); } });
  assert.deepEqual(calls, ['good.jpg', 'bad.jpg', 'later.jpg']);
  assert.ok(result[0].photo); assert.equal(result[1].photo, null); assert.ok(result[2].photo);
  assert.equal(result[1].sourceReview.photoPreparationError, 'This image could not be decoded.');
  assert.ok(result.every(product => product.sourceReview.status === 'pending'));
});

test('invalid photo-processor results remain photo-needed drafts', async () => {
  for (const invalid of [null, {}, { blob: 'not-a-blob' }, { blob: blob('') }]) {
    const [product] = await prepareAllReviewDrafts(source([row('A')]), [], { preparePhoto: async () => invalid });
    assert.equal(product.photo, null); assert.match(product.sourceReview.photoPreparationError, /could not be prepared/);
  }
});

test('source quotes, unknown currency and dimensions remain evidence only', async () => {
  const facts = [{ field: 'catalogue_price_quote', value: 400, currency: null, basis: 'Unconfirmed set', selling_price_verified: false }, { field: 'height', value: 12, unit: 'in' }];
  const [product] = await prepareAllReviewDrafts(source([row('A', { facts, price: 400, height: 12 })]), [], { preparePhoto });
  assert.equal(product.price, ''); assert.equal(product.height, '');
  assert.equal(product.sourceReview.facts[0].currency, null);
  assert.match(formatReviewFact(product.sourceReview.facts[0]), /currency not stated/);
  assert.doesNotMatch(formatReviewFact(product.sourceReview.facts[0]), /INR|₹/);
});

test('preparation never fetches remote or hosted assets', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('Bulk import cannot request the network'));
  const inheritedAssets = Object.create({ 'assets/item.jpg': blob('inherited') });
  const pack = source([row('A')], { assetBase: '/hosted-review/', assets: inheritedAssets });
  const [product] = await prepareAllReviewDrafts(pack, [], { preparePhoto: () => assert.fail('Inherited assets must not be read') });
  assert.equal(product.photo, null); assert.equal(fetch.mock.calls.length, 0);
  const [local] = await prepareAllReviewDrafts(source([row('B')], { assets: new Map([['assets/item.jpg', blob('local')]]) }), [], { preparePhoto });
  assert.ok(local.photo); assert.equal(fetch.mock.calls.length, 0);
});

test('source validation rejects duplicate, malformed and sparse IDs before any work', async () => {
  const sparse = [row('A')]; sparse.length = 2;
  for (const rows of [[row('A'), row('A')], [row('A'), row('bad:id')], [row('A'), null], sparse]) {
    let calls = 0, progress = 0;
    await assert.rejects(prepareAllReviewDrafts(source(rows), [], { preparePhoto: () => { calls++; }, onProgress: () => { progress++; } }), TypeError);
    assert.equal(calls, 0); assert.equal(progress, 0);
  }
  await assert.rejects(prepareAllReviewDrafts(source([row('A')], { datasetId: '../invalid' }), [], { preparePhoto }), TypeError);
  await assert.rejects(prepareAllReviewDrafts({ datasetId, products: {} }, [], { preparePhoto }), TypeError);
});

test('a pre-aborted import rejects without preparing, publishing progress or mutating', async () => {
  const controller = new AbortController(); controller.abort();
  const pack = freeze(source([row('A')])), existing = freeze([]);
  await assert.rejects(prepareAllReviewDrafts(pack, existing, { signal: controller.signal, preparePhoto: () => assert.fail(), onProgress: () => assert.fail() }), { name: 'AbortError' });
  assert.equal(existing.length, 0);
});

test('cancel after a ready photo rejects the whole preparation and leaves inputs unchanged', async () => {
  const controller = new AbortController(), pack = freeze(source([row('A'), row('B'), row('C')])), state = freeze(newWorkspace());
  const before = structuredClone(state), progress = [];
  let calls = 0;
  await assert.rejects(prepareAllReviewDrafts(pack, state.products, { signal: controller.signal, preparePhoto: async file => { calls++; if (calls === 2) controller.abort(); return photo(file); }, onProgress: update => progress.push(update.completed) }), { name: 'AbortError' });
  assert.equal(calls, 2); assert.deepEqual(progress, [0, 1]); assert.deepEqual(state, before);
});

test('cancel rejects promptly even when an injected decoder ignores the signal', async () => {
  const controller = new AbortController();
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const preparation = prepareAllReviewDrafts(source([row('A'), row('B')]), [], { signal: controller.signal, preparePhoto: () => { entered(); return new Promise(() => {}); } });
  await started; controller.abort();
  await assert.rejects(preparation, { name: 'AbortError' });
});

test('a photo timeout aborts its decoder before continuing and ignores a late result', async () => {
  const pack = source([row('slow', { media: [media('assets/slow.jpg')] }), row('next', { media: [media('assets/next.jpg')] })], { assets: { 'assets/slow.jpg': blob('slow'), 'assets/next.jpg': blob('next') } });
  let completeSlow, slowSignal, calls = 0;
  const result = await prepareAllReviewDrafts(pack, [], { photoTimeoutMs: 10, preparePhoto: (file, { signal }) => {
    calls++;
    if (file.name === 'slow.jpg') {
      slowSignal = signal;
      return new Promise(resolve => { completeSlow = () => resolve(photo(file)); });
    }
    assert.equal(slowSignal.aborted, true);
    return photo(file);
  } });
  assert.equal(calls, 2); assert.equal(slowSignal.aborted, true);
  assert.equal(result[0].photo, null); assert.match(result[0].sourceReview.photoPreparationError, /too long/);
  assert.equal(result[1].photo.name, 'next.jpg');
  completeSlow(); await Promise.resolve(); await Promise.resolve();
  assert.equal(result[0].photo, null); assert.equal(result[0].sourceReview.status, 'pending');
});

test('cancellation from final progress cannot return a partially accepted result', async () => {
  const controller = new AbortController();
  await assert.rejects(prepareAllReviewDrafts(source([row('A')]), [], { signal: controller.signal, preparePhoto, onProgress: update => { if (update.completed === 1) controller.abort(); } }), { name: 'AbortError' });
});

test('merge appends source-order IDs, preserves other catalogues and export choices, and is idempotent', async () => {
  const imported = await prepareAllReviewDrafts(source([row('A'), row('B'), row('C')]), [], { preparePhoto });
  const regular = ordinary('regular'), edited = { ...imported[1], name: 'Later user edit', price: '925', sourceReview: { ...imported[1].sourceReview, status: 'confirmed' } };
  const state = newWorkspace(); state.products = [regular, edited]; state.editingId = regular.id;
  state.catalogues[0] = { ...state.catalogues[0], title: 'Keep my title', productIds: [regular.id, edited.id, edited.id], exportProductIds: [regular.id] };
  const other = { id: 'other-catalogue', title: 'Other', productIds: [edited.id], exportProductIds: [edited.id] };
  state.catalogues.push(other); state.exportSelection = [regular.id];
  freeze(state);
  const result = mergeBulkReviewDrafts(state, imported);
  assert.deepEqual(result.products.map(product => product.id), [regular.id, edited.id, imported[0].id, imported[2].id]);
  assert.equal(result.products[0], regular); assert.equal(result.products[1], edited);
  assert.deepEqual(result.catalogues[0].productIds, [regular.id, edited.id, imported[0].id, imported[2].id]);
  assert.equal(result.catalogues[0].title, 'Keep my title');
  assert.equal(result.catalogues[1], other); assert.equal(result.catalogues[0].exportProductIds, state.catalogues[0].exportProductIds);
  assert.equal(result.exportSelection, state.exportSelection); assert.equal(result.editingId, imported[0].id);
  assert.equal(mergeBulkReviewDrafts(result, imported), result);
  assert.equal(state.products.length, 2); assert.equal(state.catalogues[0].productIds.length, 3);
});

test('merge opens the first pending imported product using latest existing review status', async () => {
  const imported = await prepareAllReviewDrafts(source([row('A'), row('B'), row('C')]), [], { preparePhoto });
  const state = newWorkspace();
  state.products = imported.map((product, index) => index < 2 ? { ...product, sourceReview: { ...product.sourceReview, status: 'confirmed' } } : product);
  state.catalogues[0].productIds = imported.map(product => product.id);
  const result = mergeBulkReviewDrafts(state, imported);
  assert.equal(result.products, state.products); assert.equal(result.editingId, imported[2].id);
  const confirmed = { ...state, products: state.products.map(product => ({ ...product, sourceReview: { ...product.sourceReview, status: 'confirmed' } })) };
  assert.equal(mergeBulkReviewDrafts(confirmed, imported).editingId, imported[0].id);
});

test('empty imports are harmless and an empty catalogue title is preserved', async () => {
  const state = freeze(newWorkspace());
  assert.deepEqual(await prepareAllReviewDrafts(source([]), [], { preparePhoto }), []);
  assert.equal(mergeBulkReviewDrafts(state, []), state);
  const imported = await prepareAllReviewDrafts(source([row('A')]), [], { preparePhoto });
  assert.equal(mergeBulkReviewDrafts(state, imported).catalogues[0].title, '');
});

test('200-row and library capacity guards fail before photo preparation', async () => {
  assert.equal(MAX_BULK_REVIEW_DRAFTS, 200); assert.equal(MAX_PRODUCTS, 200); assert.equal(MAX_CATALOGUE_PRODUCTS, 200);
  const excessive = Array.from({ length: 201 }, (_, index) => row(`C${index}`));
  await assert.rejects(prepareAllReviewDrafts(source(excessive), [], { preparePhoto: () => assert.fail() }), /up to 200/);
  const existing = freeze(Array.from({ length: MAX_PRODUCTS }, (_, index) => ordinary(`P${index}`)));
  await assert.rejects(prepareAllReviewDrafts(source([row('new')]), existing, { preparePhoto: () => assert.fail() }), /200-product workspace limit/);
  const existingReview = buildReviewDraft(row('saved'), { datasetId });
  const full = [...existing.slice(1), existingReview];
  assert.equal((await prepareAllReviewDrafts(source([row('saved')]), full, { preparePhoto: () => assert.fail() }))[0], existingReview);
});

test('merge capacity failure is atomic against the latest workspace and draft selection', () => {
  const product = buildReviewDraft(row('A'), { datasetId });
  const state = newWorkspace(); state.products = Array.from({ length: MAX_PRODUCTS }, (_, index) => ordinary(`P${index}`));
  freeze(state); const before = structuredClone(state);
  assert.throws(() => mergeBulkReviewDrafts(state, [product]), /workspace limit/); assert.deepEqual(state, before);
  const fullDraft = newWorkspace(); fullDraft.products = [product]; fullDraft.catalogues[0].productIds = Array.from({ length: MAX_CATALOGUE_PRODUCTS }, (_, index) => `existing-${index}`);
  freeze(fullDraft); const beforeDraft = structuredClone(fullDraft);
  assert.throws(() => mergeBulkReviewDrafts(fullDraft, [product]), /draft limit/); assert.deepEqual(fullDraft, beforeDraft);
});

test('merge rejects duplicate or invalid imported IDs without changing the workspace', () => {
  const state = freeze(newWorkspace()), product = buildReviewDraft(row('A'), { datasetId });
  assert.throws(() => mergeBulkReviewDrafts(state, [product, { ...product }]), /duplicate product IDs/);
  assert.throws(() => mergeBulkReviewDrafts(state, [ordinary('not-a-review-id')]), /invalid draft ID/);
  assert.equal(state.products.length, 0); assert.equal(state.catalogues[0].productIds.length, 0);
});

test('200 candidates can be selected together and a repeated import never consumes more capacity', async () => {
  const pack = source(Array.from({ length: 200 }, (_, index) => row(`C${index}`, { media: [] })), { assets: {} });
  const products = await prepareAllReviewDrafts(pack, [], { preparePhoto: () => assert.fail() });
  const result = mergeBulkReviewDrafts(newWorkspace(), products);
  assert.equal(result.products.length, 200); assert.equal(result.catalogues[0].productIds.length, 200);
  const reused = await prepareAllReviewDrafts(pack, result.products, { preparePhoto: () => assert.fail() });
  assert.ok(reused.every((product, index) => product === products[index]));
  assert.equal(mergeBulkReviewDrafts(result, reused), result);
});
