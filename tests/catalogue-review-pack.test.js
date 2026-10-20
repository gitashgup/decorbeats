import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import { parseReviewPack, REVIEW_PACK_LIMITS } from '../src/capture/catalogue/reviewPack.js';
import { createReviewPackTask } from '../src/capture/catalogue/reviewPackTask.js';
import { buildReviewDraft } from '../src/capture/catalogue/sourceReview.js';

// Entirely synthetic fixtures. Private review archives are never test assets.
const jpeg = Uint8Array.of(255, 216, 255, 224, 0, 4, 65, 66, 255, 217);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const assetPath = 'assets/item.jpg';
function fixture() {
  return {
    source: {
      schema_version: '1.0', title: 'Synthetic review', review_only: true,
      coverage: { requested_period: { start: '2026-09-13', end: '2026-10-02', inclusive: true }, raw_private: 'PRIVATE_COVERAGE' },
      sources: [{ raw_text: 'PRIVATE_CHAT', source_drive_url: 'https://private.invalid/source' }],
      merge_log: ['PRIVATE_MERGE'], limitations: ['PRIVATE_LIMIT'],
      products: [{
        id: 'E001', working_name: 'Sample dish', name_status: 'working_label', category: 'product_draft',
        media: [{ asset_path: assetPath, role: 'original_product_photo', sha256: sha256(jpeg), raw_text: 'PRIVATE_MEDIA' }],
        primary_asset_path: assetPath, source_message_ids: ['sample-001'],
        facts: [
          { field: 'dimensions', value: [6, 2], unit: 'inches', source_message_ids: ['sample-001'] },
          { field: 'catalogue_price_quote', value: 300, currency: null, source_message_ids: ['sample-001'], private_detail: 'PRIVATE_FACT_EXTRA' },
          { field: 'supplier_cost', value: 'PRIVATE_COST' },
          { field: 'material', value: { raw: 'PRIVATE_NESTED_FACT' } },
        ],
        review_flags: ['Confirm sale basis'], observations: ['PRIVATE_OBSERVATION'], context_facts: ['PRIVATE_CONTEXT'],
        internal_costs_and_orders: 'PRIVATE_ORDERS', confirmed_selling_price: 300, confirmed_availability: true,
      }],
    },
    manifest: [{ asset_path: assetPath, sha256: sha256(jpeg), size_bytes: jpeg.length, review_status: 'visually_checked_product_reference', private_note: 'PRIVATE_MANIFEST' }],
    assets: { [assetPath]: jpeg },
  };
}
function filesFor({ source, manifest, assets }) {
  return { 'products.json': strToU8(JSON.stringify(source)), 'asset_manifest.json': strToU8(JSON.stringify(manifest)), ...assets };
}
const pack = (f = fixture(), extra = {}) => zipSync({ ...filesFor(f), ...extra }, { level: 6 });
function records(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), end = bytes.length - 22;
  let offset = view.getUint32(end + 16, true);
  const entries = [];
  while (offset < end) {
    const nameLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.push({ name, central: offset, local: view.getUint32(offset + 42, true), nameLength });
    offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return { view, entries, end };
}
function changeSize(bytes, name, size) {
  const { view, entries } = records(bytes), entry = entries.find(item => item.name === name);
  view.setUint32(entry.central + 24, size, true);
  view.setUint32(entry.local + 22, size, true);
  return bytes;
}
function renameEntry(bytes, oldName, newName, local = true) {
  const { entries } = records(bytes), entry = entries.find(item => item.name === oldName);
  assert.equal(newName.length, oldName.length);
  bytes.set(strToU8(newName), entry.central + 46);
  if (local) bytes.set(strToU8(newName), entry.local + 30);
  return bytes;
}

test('review import returns stable, minimal allowlisted rows and verified local image Blobs', async () => {
  const progress = [], result = await parseReviewPack(pack(), { onProgress: value => progress.push(value) });
  assert.deepEqual(Object.keys(result), ['datasetId', 'title', 'products', 'assets']);
  assert.equal(result.datasetId, 'wa-2026-09-13_2026-10-02-v1');
  assert.equal(result.title, 'Synthetic review');
  assert.equal(result.products.length, 1);
  assert.deepEqual(Object.keys(result.products[0]), ['id', 'working_name', 'name_status', 'category', 'facts', 'review_flags', 'source_message_ids', 'media', 'primary_asset_path']);
  assert.equal(result.products[0].facts.length, 2);
  assert.deepEqual(result.products[0].facts[0].value, [6, 2]);
  assert.equal(result.products[0].facts[1].currency, null);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
  assert.ok(!JSON.stringify(result).includes('https://'));
  assert.equal(result.assets[assetPath].type, 'image/jpeg');
  assert.deepEqual(new Uint8Array(await result.assets[assetPath].arrayBuffer()), jpeg);
  assert.equal(progress.at(-1).completed, 1);
  assert.equal(progress.at(-1).total, 1);
  assert.ok(progress.every(item => typeof item.message === 'string'));
  const again = await parseReviewPack(pack());
  assert.equal(buildReviewDraft(result.products[0], { datasetId: result.datasetId }).id, buildReviewDraft(again.products[0], { datasetId: again.datasetId }).id);
  const draft = buildReviewDraft(result.products[0], { datasetId: result.datasetId });
  assert.equal(draft.sourceReview.status, 'pending');
  for (const field of ['length', 'width', 'height', 'weight', 'price']) assert.equal(draft[field], '');
});

test('collage references stay intact without creating a cropped product photo', async () => {
  const f = fixture(), row = f.source.products[0];
  row.category = 'collage_candidate';
  row.media[0].role = 'collage_reference';
  row.media[0].tile_position = { row: 2, column: 1, rows: 3, columns: 2, raw: 'PRIVATE_TILE' };
  const result = await parseReviewPack(pack(f));
  assert.deepEqual(result.products[0].media[0].tile_position, { row: 2, column: 1, rows: 3, columns: 2 });
  assert.equal(result.assets[assetPath].size, jpeg.length);
  assert.equal(buildReviewDraft(result.products[0], { datasetId: result.datasetId, photo: result.assets[assetPath] }).photo, null);
});

test('known documentation metadata is ignored, never returned as source data', async () => {
  const extras = Object.fromEntries(['README.txt', 'product_review.csv', 'coverage.json', 'approved_asset_paths.txt'].map(name => [name, strToU8('PRIVATE_IGNORED')]));
  const result = await parseReviewPack(pack(fixture(), extras));
  assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
});

test('both stored and deflated approved ZIP entries are supported', async () => {
  const result = await parseReviewPack(zipSync(filesFor(fixture()), { level: 0 }));
  assert.equal(result.products.length, 1);
});

test('unsupported files, nested paths, traversal, URLs and control bytes are rejected before decompression', async () => {
  for (const path of ['../photo.jpg', '/assets/item.jpg', 'assets/../item.jpg', 'assets/sub/item.jpg', 'assets\\item.jpg', 'assets/item.svg', 'assets/item.jpg.js', 'assets/item.jpg\0', 'https://example.invalid/a.jpg', 'internal_costs_and_orders.json', '_chat.txt', 'README.txt/']) {
    await assert.rejects(parseReviewPack(pack(fixture(), { [path]: strToU8('private') })), /unsafe file path|unsupported file|unsupported file type/);
  }
});

test('duplicate paths, case-collisions, mismatched names and overlapping file headers are rejected', async () => {
  const doubled = pack(fixture(), { 'assets/copy.jpg': jpeg });
  await assert.rejects(parseReviewPack(renameEntry(doubled, 'assets/copy.jpg', assetPath)), /duplicate file paths/);
  await assert.rejects(parseReviewPack(pack(fixture(), { 'assets/ITEM.jpg': jpeg })), /duplicate file paths/);
  await assert.rejects(parseReviewPack(renameEntry(pack(), assetPath, 'assets/copy.jpg', false)), /mismatched local file paths/);
  const overlap = pack(), { view, entries } = records(overlap);
  view.setUint32(entries[1].central + 42, entries[0].local, true);
  await assert.rejects(parseReviewPack(overlap), /overlapping or invalid/);
});

test('encrypted, symlink, unsupported-method and ZIP64 entries fail preflight', async () => {
  for (const mutate of [
    ({ view, entries: [entry] }) => view.setUint16(entry.central + 8, 1, true),
    ({ view, entries: [entry] }) => view.setUint32(entry.central + 38, 0xa1ff0000, true),
    ({ view, entries: [entry] }) => view.setUint16(entry.central + 10, 99, true),
    ({ view, entries: [entry] }) => view.setUint32(entry.central + 24, 0xffffffff, true),
    ({ view, end }) => view.setUint16(end + 4, 1, true),
  ]) {
    const bytes = pack(); mutate(records(bytes));
    await assert.rejects(parseReviewPack(bytes), /encrypted|symlink|unsupported/);
  }
});

test('truncated archives, central-directory overflows and local header inconsistencies fail safely', async () => {
  await assert.rejects(parseReviewPack(pack().subarray(0, 50)), /valid ZIP directory/);
  const size = pack(), directory = records(size);
  directory.view.setUint32(directory.end + 12, 0xffffffff, true);
  await assert.rejects(parseReviewPack(size), /invalid ZIP directory/);
  const name = pack(), n = records(name);
  n.view.setUint16(n.entries[0].central + 28, 65535, true);
  await assert.rejects(parseReviewPack(name), /truncated ZIP directory/);
  const local = pack(), l = records(local);
  l.view.setUint32(l.entries[0].local + 22, 123, true);
  await assert.rejects(parseReviewPack(local), /mismatched local file sizes/);
});

test('declared archive, file-count, metadata, image and aggregate expansion limits are enforced before inflation', async () => {
  await assert.rejects(parseReviewPack(new Uint8Array(REVIEW_PACK_LIMITS.zipBytes + 1)), /30 MB/);
  const count = pack(), { view, end } = records(count);
  view.setUint16(end + 8, 201, true); view.setUint16(end + 10, 201, true);
  await assert.rejects(parseReviewPack(count), /200 files/);
  await assert.rejects(parseReviewPack(changeSize(pack(), 'products.json', REVIEW_PACK_LIMITS.metadataBytes + 1)), /metadata larger than 1 MB/);
  await assert.rejects(parseReviewPack(changeSize(pack(), assetPath, REVIEW_PACK_LIMITS.photoBytes + 1)), /photo larger than 20 MB/);
  const aggregate = pack(fixture(), { 'assets/second.jpg': jpeg, 'assets/third.jpg': jpeg });
  for (const path of [assetPath, 'assets/second.jpg', 'assets/third.jpg']) changeSize(aggregate, path, 15 * 1024 * 1024);
  await assert.rejects(parseReviewPack(aggregate), /40 MB/);
});

test('a lying small expanded-size header cannot inflate a ZIP bomb into an unbounded allocation', async () => {
  const files = filesFor(fixture());
  files['products.json'] = new Uint8Array(3 * 1024 * 1024).fill(65);
  const bomb = changeSize(zipSync(files, { level: 9 }), 'products.json', 100);
  assert.ok(bomb.length < 10000);
  await assert.rejects(parseReviewPack(bomb), /expands beyond its declared file size/);
});

test('missing metadata, malformed JSON, unsupported schema and non-review datasets are rejected', async () => {
  for (const name of ['products.json', 'asset_manifest.json']) {
    const files = filesFor(fixture()); delete files[name];
    await assert.rejects(parseReviewPack(zipSync(files)), /is missing/);
  }
  await assert.rejects(parseReviewPack(pack(fixture(), { 'products.json': strToU8('{bad') })), /invalid products.json/);
  for (const change of [source => { source.review_only = false; }, source => { source.review_only = 'true'; }, source => { source.schema_version = '2.0'; }, source => { source.title = ''; }, source => { source.products = []; }]) {
    const f = fixture(); change(f.source);
    await assert.rejects(parseReviewPack(pack(f)), /review-only|product list/);
  }
});

test('dataset identity requires valid, ordered inclusive calendar dates', async () => {
  for (const period of [null, { start: '2026-02-30', end: '2026-10-02', inclusive: true }, { start: '2026-10-03', end: '2026-10-02', inclusive: true }, { start: '2026-09-13', end: '2026-10-02', inclusive: false }, { start: '../2026-09-13', end: '2026-10-02', inclusive: true }]) {
    const f = fixture(); f.source.coverage.requested_period = period;
    await assert.rejects(parseReviewPack(pack(f)), /invalid inclusive review period/);
  }
});

test('manifest must approve exactly the archived images with unique paths and matching sizes', async () => {
  for (const change of [
    f => { f.manifest = {}; }, f => { f.manifest = []; },
    f => { f.manifest.push({ ...f.manifest[0] }); },
    f => { f.manifest[0].asset_path = '../item.jpg'; },
    f => { f.manifest[0].sha256 = 'invalid'; },
    f => { f.manifest[0].size_bytes++; },
    f => { f.manifest[0].review_status = 'unreviewed'; },
    f => { delete f.assets[assetPath]; },
    f => { f.assets['assets/extra.jpg'] = jpeg; },
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(parseReviewPack(pack(f)), /manifest|missing asset/);
  }
});

test('SHA-256 verification, file signature and CRC verification reject modified image payloads', async () => {
  const badHash = fixture(); badHash.manifest[0].sha256 = '0'.repeat(64); delete badHash.source.products[0].media[0].sha256;
  await assert.rejects(parseReviewPack(pack(badHash)), /failed SHA-256/);
  const html = fixture(); html.assets[assetPath] = strToU8('<html>bad</html>');
  html.manifest[0].sha256 = sha256(html.assets[assetPath]); html.manifest[0].size_bytes = html.assets[assetPath].length;
  html.source.products[0].media[0].sha256 = html.manifest[0].sha256;
  await assert.rejects(parseReviewPack(pack(html)), /image file type/);
  const damaged = zipSync(filesFor(fixture()), { level: 0 });
  const { view, entries } = records(damaged), entry = entries.find(item => item.name === assetPath);
  const start = entry.local + 30 + view.getUint16(entry.local + 26, true) + view.getUint16(entry.local + 28, true);
  damaged[start + 5] ^= 1;
  await assert.rejects(parseReviewPack(damaged), /checksum mismatch/);
});

test('duplicate candidate IDs, unsafe references, absent roles and conflicting media hashes are rejected', async () => {
  for (const change of [
    f => f.source.products.push(structuredClone(f.source.products[0])),
    f => { f.source.products[0].id = '../unsafe'; },
    f => { f.source.products[0].media[0].asset_path = 'assets/missing.jpg'; },
    f => { f.source.products[0].primary_asset_path = 'https://example.invalid/photo.jpg'; },
    f => { f.source.products[0].primary_asset_path = 'assets/missing.jpg'; },
    f => { f.source.products[0].media[0].sha256 = '1'.repeat(64); },
    f => { delete f.source.products[0].media[0].role; },
    f => { f.source.products[0].facts = {}; },
    f => { f.source.products[0].media = Array.from({ length: 65 }, () => f.source.products[0].media[0]); },
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(parseReviewPack(pack(f)), /duplicate candidate|invalid product|approved asset manifest|invalid primary|image hash|evidence role|candidate evidence/);
  }
});

test('text-only candidates and an empty image manifest remain reviewable', async () => {
  const f = fixture(); f.assets = {}; f.manifest = [];
  const row = f.source.products[0]; row.media = []; delete row.primary_asset_path; row.category = 'text_only_candidate';
  const result = await parseReviewPack(pack(f));
  assert.deepEqual(result.assets, {}); assert.equal(result.products.length, 1);
});

test('caller-owned ArrayBuffer views respect their byte offsets and parser abort is honored', async () => {
  const bytes = pack(), padded = new Uint8Array(bytes.length + 8); padded.set(bytes, 4);
  assert.equal((await parseReviewPack(padded.subarray(4, -4))).products.length, 1);
  assert.equal((await parseReviewPack(bytes.buffer)).products.length, 1);
  await assert.rejects(parseReviewPack('zip'), TypeError);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(parseReviewPack(bytes, { signal: controller.signal }), { name: 'AbortError' });
  const mid = new AbortController();
  await assert.rejects(parseReviewPack(bytes, { signal: mid.signal, onProgress: () => mid.abort() }), { name: 'AbortError' });
});

function workerHarness(behavior = () => {}) {
  let terminated = 0, created = 0, sent;
  const worker = { terminate() { terminated++; }, postMessage(data, transfer) { sent = { data, transfer }; behavior(worker, data, transfer); } };
  return { worker, createWorker: () => { created++; return worker; }, terminated: () => terminated, created: () => created, sent: () => sent };
}
const fakeFile = () => new File([pack()], 'review.zip', { type: 'application/zip' });

test('worker task transfers isolated file bytes, reports progress, resolves and terminates once', async () => {
  const expected = { datasetId: 'synthetic', title: 'Test', products: [], assets: {} }, progress = [];
  const h = workerHarness((worker, data, transfer) => {
    assert.equal(transfer.length, 1); assert.equal(transfer[0], data.bytes); assert.ok(data.bytes instanceof ArrayBuffer);
    queueMicrotask(() => {
      worker.onmessage({ data: { type: 'progress', message: 'Checking…' } });
      worker.onmessage({ data: { type: 'complete', result: expected } });
    });
  });
  assert.equal(await createReviewPackTask(fakeFile(), { createWorker: h.createWorker, onProgress: message => progress.push(message) }), expected);
  assert.equal(progress.length, 1); assert.equal(h.terminated(), 1); assert.equal(h.created(), 1);
  h.worker.onmessage({ data: { type: 'complete', result: {} } }); assert.equal(h.terminated(), 1);
});

test('stalled read and worker time out; cancellation terminates once and ignores late results', async () => {
  const h = workerHarness();
  await assert.rejects(createReviewPackTask(fakeFile(), { createWorker: h.createWorker, timeoutMs: 5 }), /timed out/);
  assert.equal(h.terminated(), 1);
  const reading = workerHarness();
  await assert.rejects(createReviewPackTask({ size: 100, arrayBuffer: () => new Promise(() => {}) }, { createWorker: reading.createWorker, timeoutMs: 5 }), /timed out/);
  assert.equal(reading.created(), 0);
  const c = new AbortController(), cancelled = workerHarness();
  const promise = createReviewPackTask(fakeFile(), { createWorker: cancelled.createWorker, signal: c.signal });
  await new Promise(resolve => setTimeout(resolve, 1));
  c.abort(); await assert.rejects(promise, { name: 'AbortError' });
  assert.equal(cancelled.terminated(), 1);
  cancelled.worker.onmessage({ data: { type: 'complete', result: {} } }); assert.equal(cancelled.terminated(), 1);
});

test('aborting a pending file read cannot start a worker when the read eventually completes', async () => {
  let finishRead;
  const c = new AbortController(), h = workerHarness();
  const promise = createReviewPackTask({ size: 100, arrayBuffer: () => new Promise(resolve => { finishRead = resolve; }) }, { createWorker: h.createWorker, signal: c.signal });
  await Promise.resolve(); c.abort();
  await assert.rejects(promise, { name: 'AbortError' });
  finishRead(new ArrayBuffer(100)); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.created(), 0);
  const pre = new AbortController(); pre.abort();
  await assert.rejects(createReviewPackTask(fakeFile(), { signal: pre.signal, createWorker: h.createWorker }), { name: 'AbortError' });
  assert.equal(h.created(), 0);
});

test('oversized or failed file reads and worker startup/errors release the task for a retry', async () => {
  for (const file of [null, { size: REVIEW_PACK_LIMITS.zipBytes + 1, arrayBuffer() { assert.fail('Must not read oversized files'); } }, { size: 100, arrayBuffer: async () => new ArrayBuffer(20) }, { size: 100, arrayBuffer: async () => { throw new Error('Read failed'); } }]) {
    const h = workerHarness();
    await assert.rejects(createReviewPackTask(file, { createWorker: h.createWorker }), /30 MB|completely|Read failed/);
    assert.equal(h.created(), 0);
  }
  await assert.rejects(createReviewPackTask(fakeFile(), { createWorker() { throw new Error('Worker unavailable'); } }), /Worker unavailable/);
  for (const event of ['onerror', 'onmessageerror']) {
    const h = workerHarness(worker => queueMicrotask(() => worker[event]({})));
    await assert.rejects(createReviewPackTask(fakeFile(), { createWorker: h.createWorker }), /could not load|could not be read/);
    assert.equal(h.terminated(), 1);
  }
  const error = workerHarness(worker => queueMicrotask(() => worker.onmessage({ data: { type: 'error', message: 'Invalid manifest' } })));
  await assert.rejects(createReviewPackTask(fakeFile(), { createWorker: error.createWorker }), /Invalid manifest/);
  assert.equal(error.terminated(), 1);
});
