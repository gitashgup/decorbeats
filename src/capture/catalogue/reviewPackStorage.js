// A separate, device-local inbox. This never writes capture drafts or inventory.
const DB_NAME = 'decorbeats-catalogue-review-pack-v1';
const MAX_BYTES = 30 * 1024 * 1024;
const TIMEOUT = 10000;
export function reviewPackStorageMessage(error) {
  if (error?.name === 'ReviewPackConflictError') return 'The review inbox changed in another tab. Reload this page before importing again. Your catalogue products are unchanged.';
  if (error?.name === 'QuotaExceededError') return 'There is not enough device storage for the review pack. Free some space and retry. Your existing catalogue products are unchanged.';
  if (error?.name === 'ReviewPackStorageTimeout') return 'The review-pack save could not be confirmed. Keep the original ZIP, close other catalogue tabs and reload to check. Your catalogue products are unchanged.';
  return 'The review inbox could not be saved on this device. Keep the original ZIP and retry outside private browsing. Your catalogue products are unchanged.';
}
function timeoutError() { const error = new Error('Device storage did not respond in time'); error.name = 'ReviewPackStorageTimeout'; return error; }
function open(factory = globalThis.indexedDB, timeoutMs = TIMEOUT) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
    const timer = setTimeout(() => finish(reject, timeoutError()), timeoutMs);
    let request;
    try { if (!factory) throw new Error('Device storage unavailable'); request = factory.open(DB_NAME, 1); }
    catch (e) { finish(reject, e); return; }
    request.onupgradeneeded = () => { if (settled) { request.transaction?.abort(); return; } if (!request.result.objectStoreNames.contains('packs')) request.result.createObjectStore('packs'); };
    request.onerror = () => finish(reject, request.error);
    request.onblocked = () => finish(reject, new Error('Close other catalogue tabs'));
    request.onsuccess = () => { if (settled) { request.result.close(); return; } request.result.onversionchange = () => request.result.close(); finish(resolve, request.result); };
  });
}
function transaction(db, mode, operation, timeoutMs = TIMEOUT) {
  return new Promise((resolve, reject) => {
    let tx, settled = false, result, customError;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); db.close(); fn(value); };
    const fail = error => { customError = error; try { tx?.abort(); } catch {} finish(reject, error); };
    const timer = setTimeout(() => fail(timeoutError()), timeoutMs);
    try {
      tx = db.transaction('packs', mode); tx.oncomplete = () => finish(resolve, result); tx.onerror = tx.onabort = () => finish(reject, customError || tx.error || new Error('Save interrupted'));
      operation(tx.objectStore('packs'), value => { result = value; }, fail);
    } catch (e) { fail(e); }
  });
}
export async function loadReviewPack(owner, factory, timeoutMs = TIMEOUT) {
  const db = await open(factory, timeoutMs);
  return transaction(db, 'readonly', (store, done) => { const request = store.get(owner); request.onsuccess = () => done(request.result || null); }, timeoutMs);
}
export async function saveReviewPack(owner, file, source, expectedRevision = 0, factory, timeoutMs = TIMEOUT) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BYTES || typeof file.arrayBuffer !== 'function') throw new Error('Choose a review ZIP under 30 MB');
  const db = await open(factory, timeoutMs);
  return transaction(db, 'readwrite', (store, done, fail) => {
    const request = store.get(owner);
    request.onsuccess = () => {
      try {
        if ((request.result?.revision || 0) !== expectedRevision) { const error = new Error('Review pack changed'); error.name = 'ReviewPackConflictError'; fail(error); return; }
        const value = { blob: file, datasetId: source.datasetId, title: source.title, count: source.products.length, revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
        store.put(value, owner); done(value);
      } catch (e) { fail(e); }
    };
  }, timeoutMs);
}
