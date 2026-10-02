import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React from 'react';
import { MAX_BATCH_PHOTOS, appendReadyBatchGroups, batchProducts, chooseBatchCover, createBatchEntries, groupBatchPhotos, processPhotoBatch, removeBatchPhoto, ungroupBatchPhotos } from '../src/capture/catalogue/batch.js';

let serial = 0;
const id = () => `entry-${++serial}`;
const file = (name, lastModified = 1) => new File([name], name, { type: 'image/jpeg', lastModified });
const photo = name => ({ assetId: `asset:${name}`, blob: new Blob([name], { type: 'image/jpeg' }), width: 1200, height: 900, name, warning: '' });
const readyEntries = names => createBatchEntries(names.map(name => file(name)), [], { id }).entries.map(entry => ({ ...entry, file: null, status: 'ready', photo: photo(entry.name) }));

test('intake caps total files at 20 and reports every skipped or duplicate selection', () => {
  const files = Array.from({ length: 22 }, (_, i) => file(`${i}.jpg`));
  const first = createBatchEntries(files, [], { id });
  assert.equal(first.entries.length, MAX_BATCH_PHOTOS);
  assert.deepEqual(first.rejected, ['20.jpg', '21.jpg']);
  const again = createBatchEntries([files[0], file('extra.jpg')], first.entries, { id });
  assert.deepEqual(again.duplicates, ['0.jpg']);
  assert.deepEqual(again.rejected, ['extra.jpg']);
  assert.equal(again.entries[0], first.entries[0]);
});

test('sequential preparation keeps good files when another fails and retries only that file', async () => {
  const { entries } = createBatchEntries(['a.jpg', 'bad.jpg', 'b.jpg'].map(name => file(name)), [], { id });
  let active = 0, peak = 0; const calls = [], snapshots = [];
  const prepared = await processPhotoBatch(entries, { prepare: async value => {
    calls.push(value.name); active++; peak = Math.max(peak, active); await Promise.resolve(); active--;
    if (value.name === 'bad.jpg') throw new Error('Unreadable image');
    return photo(value.name);
  }, onUpdate: value => snapshots.push(value) });
  assert.equal(peak, 1); assert.deepEqual(calls, ['a.jpg', 'bad.jpg', 'b.jpg']);
  assert.deepEqual(prepared.map(entry => entry.status), ['ready', 'error', 'ready']);
  assert.equal(prepared[0].file, null); assert.equal(prepared[1].file, entries[1].file);
  assert.equal(prepared[1].error, 'Unreadable image'); assert.equal(entries[0].status, 'queued');
  assert.ok(snapshots.some(value => value[0].status === 'ready' && value[1].status === 'processing'));
  const retried = await processPhotoBatch(prepared, { ids: [entries[1].id], prepare: async value => photo(value.name) });
  assert.deepEqual(retried.map(entry => entry.status), ['ready', 'ready', 'ready']);
  assert.equal(retried[0].photo, prepared[0].photo); assert.equal(retried[2].photo, prepared[2].photo);
});

test('cancellation preserves completed photos and pauses original files for resuming', async () => {
  const { entries } = createBatchEntries(['a.jpg', 'b.jpg', 'c.jpg'].map(name => file(name)), [], { id });
  const controller = new AbortController(), calls = [];
  const result = await processPhotoBatch(entries, { signal: controller.signal, prepare: async value => {
    calls.push(value.name);
    if (value.name === 'b.jpg') { controller.abort(); throw new DOMException('Cancelled', 'AbortError'); }
    return photo(value.name);
  } });
  assert.deepEqual(calls, ['a.jpg', 'b.jpg']);
  assert.deepEqual(result.map(entry => entry.status), ['ready', 'paused', 'paused']);
  assert.equal(result[0].photo.name, 'a.jpg'); assert.equal(result[1].file, entries[1].file);
  const resumed = await processPhotoBatch(result, { prepare: async value => photo(value.name) });
  assert.deepEqual(resumed.map(entry => entry.status), ['ready', 'ready', 'ready']);
  assert.equal(resumed[0].photo, result[0].photo);
});

test('abort before processing starts has no decoder calls or lost originals', async () => {
  const { entries } = createBatchEntries([file('a.jpg')], [], { id });
  const controller = new AbortController(); controller.abort();
  const result = await processPhotoBatch(entries, { signal: controller.signal, prepare: () => assert.fail('Must not decode') });
  assert.equal(result[0].status, 'paused'); assert.equal(result[0].file, entries[0].file);
});

test('grouping is stable, deduplicates selected views and preserves untouched products', () => {
  const entries = readyEntries(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  const groups = appendReadyBatchGroups([], entries);
  assert.equal(appendReadyBatchGroups(groups, entries), groups);
  const selected = [entries[2].id, entries[0].id, entries[0].id];
  const merged = groupBatchPhotos(groups, selected);
  assert.equal(merged.length, 3); assert.equal(merged[0].id, groups[0].id);
  assert.deepEqual(merged[0].photoIds, [entries[0].id, entries[2].id]);
  assert.equal(merged[1], groups[1]); assert.equal(merged[2], groups[3]);
  assert.equal(new Set(merged.flatMap(group => group.photoIds)).size, 4);
  assert.deepEqual(groupBatchPhotos(merged, selected), merged);
  assert.equal(groupBatchPhotos(merged, ['unknown']), merged);
});

test('partial regrouping and ungrouping keep unique identities and valid covers', () => {
  const entries = readyEntries(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
  let groups = appendReadyBatchGroups([], entries);
  groups = groupBatchPhotos(groups, entries.slice(0, 3).map(entry => entry.id));
  groups = chooseBatchCover(groups, groups[0].id, entries[1].id);
  groups = groupBatchPhotos(groups, [entries[1].id, entries[3].id]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].coverId, entries[1].id);
  assert.equal(groups[1].coverId, entries[0].id);
  groups = ungroupBatchPhotos(groups, groups[0].id);
  groups = ungroupBatchPhotos(groups, groups.at(-1).id);
  assert.equal(groups.length, 4);
  assert.equal(new Set(groups.map(group => group.id)).size, 4);
  assert.equal(new Set(groups.flatMap(group => group.photoIds)).size, 4);
  assert.ok(groups.every(group => group.photoIds.includes(group.coverId)));
});

test('products use stable group IDs, blank names and the exact selected cover reference', () => {
  const entries = readyEntries(['a.jpg', 'b.jpg', 'c.jpg']);
  let groups = groupBatchPhotos(appendReadyBatchGroups([], entries), entries.slice(0, 2).map(entry => entry.id));
  groups = chooseBatchCover(groups, groups[0].id, entries[1].id);
  const products = batchProducts(groups, entries), repeated = batchProducts(groups, entries);
  assert.equal(products.length, 2); assert.deepEqual(products.map(product => product.id), repeated.map(product => product.id));
  assert.equal(products[0].name, ''); assert.equal(products[0].dimensionUnit, 'cm'); assert.equal(products[0].price, '');
  assert.equal(products[0].photo, products[0].photos[1]); assert.equal(products[0].photo, entries[1].photo);
  const malformed = [{ ...groups[0], photoIds: [entries[0].id, entries[0].id] }, { ...groups[1], photoIds: [entries[0].id, entries[2].id] }];
  assert.deepEqual(batchProducts(malformed, entries).map(product => product.photos.length), [1, 1]);
  assert.deepEqual(chooseBatchCover(groups, groups[0].id, 'missing'), groups);
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.HTMLElement = dom.window.HTMLElement; globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
await mkdir('.catalogue-test-build', { recursive: true });
await build({ entryPoints: ['src/capture/catalogue/BatchIntake.jsx'], outfile: '.catalogue-test-build/BatchIntake.mjs', bundle: true, format: 'esm', platform: 'node', packages: 'external', loader: { '.css': 'empty' }, plugins: [{ name: 'mock-photo-preparation', setup(builder) {
  builder.onResolve({ filter: /\/photos\.js$/ }, () => ({ path: 'mock-photos', namespace: 'batch-test' }));
  builder.onLoad({ filter: /.*/, namespace: 'batch-test' }, () => ({ contents: 'export const prepareCataloguePhoto = (...args) => globalThis.__batchPrepare(...args);' }));
} }] });
const { default: BatchIntake } = await import('../.catalogue-test-build/BatchIntake.mjs');
const { render, screen, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
afterEach(() => { cleanup(); delete globalThis.__batchPrepare; });
function selectFiles(names) { fireEvent.change(screen.getByLabelText('Choose product photos'), { target: { files: names.map(name => file(name)) } }); }

test('UI imports one grouped product with chosen cover and locks repeated clicks', async () => {
  globalThis.__batchPrepare = async value => photo(value.name);
  let finish, calls = 0, received;
  render(React.createElement(BatchIntake, { onImport: products => { received = products; calls++; return new Promise(resolve => { finish = resolve; }); }, onClose() {} }));
  selectFiles(['front.jpg', 'side.jpg']);
  await screen.findByRole('button', { name: 'Edit 2 products' });
  fireEvent.click(screen.getByLabelText('Select front.jpg for grouping')); fireEvent.click(screen.getByLabelText('Select side.jpg for grouping'));
  fireEvent.click(screen.getByRole('button', { name: 'Group selected (2)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Use as cover: side.jpg' }));
  const submit = screen.getByRole('button', { name: 'Edit 1 product' }); fireEvent.click(submit); fireEvent.click(submit);
  assert.equal(calls, 1); assert.equal(received.length, 1); assert.equal(received[0].photos.length, 2); assert.equal(received[0].photo, received[0].photos[1]);
  finish(true); await waitFor(() => assert.ok(!screen.queryByLabelText('Select front.jpg for grouping')));
});

test('UI close and false import preserve review; retry uses the same product identities', async () => {
  globalThis.__batchPrepare = async value => photo(value.name);
  const calls = []; let closed = 0;
  const props = { onImport: async products => { calls.push(products); return false; }, onClose: () => closed++ };
  const view = render(React.createElement(BatchIntake, props)); selectFiles(['front.jpg']);
  await screen.findByRole('button', { name: 'Edit 1 product' });
  fireEvent.click(screen.getByRole('button', { name: 'Close photo intake' })); assert.equal(closed, 1);
  view.rerender(React.createElement(BatchIntake, { ...props, hidden: true }));
  view.rerender(React.createElement(BatchIntake, props));
  fireEvent.click(screen.getByRole('button', { name: 'Edit 1 product' })); await screen.findByRole('alert');
  assert.ok(screen.getByLabelText('Select front.jpg for grouping'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit 1 product' }));
  await waitFor(() => assert.equal(calls.length, 2)); assert.equal(calls[0][0].id, calls[1][0].id);
});

test('UI partial failures are retryable and capacity blocks until views are grouped', async () => {
  let reject = true;
  globalThis.__batchPrepare = async value => { if (value.name === 'bad.jpg' && reject) throw new Error('Cannot decode this file'); return photo(value.name); };
  render(React.createElement(BatchIntake, { maxProducts: 1, onImport: async () => true, onClose() {} }));
  selectFiles(['front.jpg', 'bad.jpg']);
  await screen.findByRole('button', { name: 'Edit 1 product' }); assert.ok(screen.getByText('Cannot decode this file'));
  reject = false; fireEvent.click(screen.getByRole('button', { name: 'Retry bad.jpg' }));
  const edit = await screen.findByRole('button', { name: 'Edit 2 products' }); assert.equal(edit.disabled, true);
  assert.match(screen.getByRole('alert').textContent, /room for 1 more product/);
  fireEvent.click(screen.getByLabelText('Select front.jpg for grouping')); fireEvent.click(screen.getByLabelText('Select bad.jpg for grouping'));
  fireEvent.click(screen.getByRole('button', { name: 'Group selected (2)' }));
  assert.equal(screen.getByRole('button', { name: 'Edit 1 product' }).disabled, false);
});


test('repeated partial grouping and splitting never reuse a live group identity', () => {
  const entries = readyEntries(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']);
  const [a, b, c, d, e] = entries.map(entry => entry.id);
  let groups = groupBatchPhotos(appendReadyBatchGroups([], entries), [a, b, c]);
  groups = groupBatchPhotos(groups, [a, b, d]);
  const firstPartialId = groups[0].id;
  groups = groupBatchPhotos(groups, [a, e]);
  assert.notEqual(groups[0].id, firstPartialId);
  assert.equal(new Set(groups.map(group => group.id)).size, groups.length);
  for (const group of [...groups]) groups = ungroupBatchPhotos(groups, group.id);
  assert.equal(groups.length, entries.length);
  assert.equal(new Set(groups.map(group => group.id)).size, entries.length);
  assert.equal(new Set(groups.flatMap(group => group.photoIds)).size, entries.length);
});

test('removing a staged cover repairs the group and keeps untouched photos', () => {
  const entries = readyEntries(['a.jpg', 'b.jpg', 'c.jpg']);
  const groups = groupBatchPhotos(appendReadyBatchGroups([], entries), entries.slice(0, 2).map(entry => entry.id));
  const result = removeBatchPhoto(entries, groups, entries[0].id);
  assert.equal(result.entries.length, 2); assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].coverId, entries[1].id);
  assert.equal(result.groups[0].id, groups[0].id); assert.equal(result.groups[1], groups[1]);
  const final = removeBatchPhoto(result.entries, result.groups, entries[1].id);
  assert.equal(final.groups.length, 1); assert.equal(final.entries[0], entries[2]);
});

test('UI a full invalid batch can remove a file and choose a replacement', async () => {
  globalThis.__batchPrepare = async () => { throw new Error('Invalid photo'); };
  render(React.createElement(BatchIntake, { onImport: async () => true, onClose() {} }));
  selectFiles(Array.from({ length: 20 }, (_, i) => `${i}.jpg`));
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Retry 19.jpg' }).disabled, false));
  assert.equal(screen.getByRole('button', { name: 'Add more photos' }).disabled, true);
  fireEvent.click(screen.getByRole('button', { name: 'Remove 0.jpg from batch' }));
  assert.equal(screen.getByRole('button', { name: 'Add more photos' }).disabled, false);
  globalThis.__batchPrepare = async value => photo(value.name);
  selectFiles(['replacement.jpg']);
  await screen.findByRole('button', { name: 'Edit 1 product' });
  assert.ok(screen.getByLabelText('Select replacement.jpg for grouping'));
});

test('UI accepted good photos leave failed originals available for retry', async () => {
  globalThis.__batchPrepare = async value => { if (value.name === 'bad.jpg') throw new Error('Bad image'); return photo(value.name); };
  let metadata;
  render(React.createElement(BatchIntake, { onImport: async (products, detail) => { metadata = detail; return true; }, onClose() {} }));
  selectFiles(['good.jpg', 'bad.jpg']);
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Edit 1 product' }).disabled, false));
  fireEvent.click(screen.getByRole('button', { name: 'Edit 1 product' }));
  await waitFor(() => assert.ok(!screen.queryByLabelText('Select good.jpg for grouping')));
  assert.deepEqual(metadata, { unfinishedCount: 1 });
  assert.ok(screen.getByRole('button', { name: 'Retry bad.jpg' }));
});

test('UI closing during preparation aborts and reopening resumes without losing ready photos', async () => {
  let closed = 0; const decoded = [];
  globalThis.__batchPrepare = async (value, { signal }) => {
    decoded.push(value.name);
    if (value.name === 'slow.jpg') return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }));
    return photo(value.name);
  };
  const props = { onImport: async () => true, onClose: () => closed++ };
  const view = render(React.createElement(BatchIntake, props)); selectFiles(['ready.jpg', 'slow.jpg', 'waiting.jpg']);
  await screen.findByLabelText('Select ready.jpg for grouping');
  fireEvent.click(screen.getByRole('button', { name: 'Close photo intake' }));
  assert.equal(closed, 1);
  view.rerender(React.createElement(BatchIntake, { ...props, hidden: true }));
  view.rerender(React.createElement(BatchIntake, props));
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Retry slow.jpg' }).disabled, false));
  assert.deepEqual(decoded, ['ready.jpg', 'slow.jpg']);
  assert.ok(screen.getByLabelText('Select ready.jpg for grouping'));
  globalThis.__batchPrepare = async value => photo(value.name);
  fireEvent.click(screen.getByRole('button', { name: 'Retry unfinished photos' }));
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Edit 3 products' }).disabled, false));
  assert.equal(screen.getAllByRole('article').length, 3);
});

test('UI removing an extra ready product resolves capacity without grouping unrelated items', async () => {
  globalThis.__batchPrepare = async value => photo(value.name);
  render(React.createElement(BatchIntake, { maxProducts: 1, onImport: async () => true, onClose() {} }));
  selectFiles(['bowl.jpg', 'lamp.jpg']);
  await waitFor(() => assert.equal(screen.getByRole('button', { name: 'Remove lamp.jpg from batch' }).disabled, false));
  assert.equal(screen.getByRole('button', { name: 'Edit 2 products' }).disabled, true);
  fireEvent.click(screen.getByRole('button', { name: 'Remove lamp.jpg from batch' }));
  assert.equal(screen.getByRole('button', { name: 'Edit 1 product' }).disabled, false);
  assert.ok(screen.getByLabelText('Select bowl.jpg for grouping'));
  assert.ok(!screen.queryByLabelText('Select lamp.jpg for grouping'));
});
