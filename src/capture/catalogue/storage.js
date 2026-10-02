// Catalogue-only, device-local storage. No Supabase or inventory dependencies.
const DB_NAME = 'decorbeats-catalogue-device-v1';
const MAX_BYTES = 100 * 1024 * 1024;
const DEFAULT_TIMEOUT = 10000;
function photosFor(product) { return [...(product.photos || []), ...(product.photo ? [product.photo] : [])]; }
function photoKey(owner, product, photo) { return `${owner}:${product.id}:${photo.assetId || 'initial'}`; }
export class SaveConflictError extends Error {
  constructor() { super('This workspace changed in another tab, or a previous save finished late. Keep this page open, then reload the latest saved version before editing here.'); this.name = 'SaveConflictError'; }
}
export class StorageTimeoutError extends Error {
  constructor() { super('Device storage did not respond in time'); this.name = 'StorageTimeoutError'; }
}
export function storageMessage(error) {
  if (error?.name === 'StorageTimeoutError') return 'The device save could not be confirmed in time. Your current product is still on this screen. Close other catalogue tabs and retry saving. You can still preview and download a PDF.';
  if (error?.name === 'CatalogueCapacityError') return 'This workspace has reached its 100 MB photo limit. Your latest changes are not saved. Replace a large photo with a smaller one and retry.';
  if (error?.name === 'SaveConflictError') return error.message;
  if (error?.name === 'QuotaExceededError') return 'This device is out of storage. Your latest changes are not saved. Keep this page open and free some device storage, then retry.';
  return 'Could not save on this device. Keep this page open and retry. Private browsing or browser storage settings may prevent saving.';
}
export function openCatalogueDb(factory = globalThis.indexedDB, timeoutMs = DEFAULT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (!factory) { reject(new Error('Device storage is unavailable')); return; }
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
    const timer = setTimeout(() => finish(reject, new StorageTimeoutError()), timeoutMs);
    let request;
    try { request = factory.open(DB_NAME, 2); } catch (error) { finish(reject, error); return; }
    request.onupgradeneeded = () => {
      if (settled) { request.transaction?.abort(); return; }
      if (!request.result.objectStoreNames.contains('workspaces')) request.result.createObjectStore('workspaces');
      if (!request.result.objectStoreNames.contains('photos')) request.result.createObjectStore('photos');
    };
    request.onerror = () => finish(reject, request.error);
    request.onblocked = () => finish(reject, new Error('Close other catalogue tabs and retry'));
    request.onsuccess = () => {
      // An open request cannot be cancelled. Close a late connection immediately.
      if (settled) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close(); finish(resolve, request.result);
    };
  });
}
function transact(db, mode, timeoutMs, operation) {
  return new Promise((resolve, reject) => {
    let tx, settled = false, result, customError;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); db.close(); fn(value); };
    const fail = error => { customError = error; try { tx?.abort(); } catch {} finish(reject, error); };
    const timer = setTimeout(() => fail(new StorageTimeoutError()), timeoutMs);
    try {
      tx = db.transaction(['workspaces', 'photos'], mode);
      tx.oncomplete = () => finish(resolve, result);
      tx.onabort = tx.onerror = () => finish(reject, customError || tx.error || new Error('Save interrupted'));
      operation(tx, value => { result = value; }, fail);
    } catch (error) { fail(error); }
  });
}
export async function loadWorkspace(owner, factory, timeoutMs = DEFAULT_TIMEOUT) {
  const db = await openCatalogueDb(factory, timeoutMs);
  return transact(db, 'readonly', timeoutMs, (tx, done, fail) => {
    const request = tx.objectStore('workspaces').get(owner);
    request.onsuccess = () => {
      try {
        const loaded = request.result || null; done(loaded);
        const targets = new Map();
        for (const product of loaded?.products || []) {
          for (const photo of photosFor(product)) {
            if (photo?.storageKey) targets.set(photo.storageKey, [...(targets.get(photo.storageKey) || []), photo]);
          }
        }
        for (const [key, references] of targets) {
          const photo = tx.objectStore('photos').get(key);
          photo.onsuccess = () => { for (const reference of references) reference.blob = photo.result; };
        }
      } catch (error) { fail(error); }
    };
  });
}
export async function saveWorkspace(owner, state, expectedRevision, factory, timeoutMs = DEFAULT_TIMEOUT) {
  const uniquePhotos = new Map();
  for (const product of state.products) for (const photo of photosFor(product)) if (photo?.blob) uniquePhotos.set(photoKey(owner, product, photo), photo.blob.size);
  const bytes = [...uniquePhotos.values()].reduce((sum, size) => sum + size, 0);
  if (bytes > MAX_BYTES) { const error = new Error('Catalogue photo capacity reached'); error.name = 'CatalogueCapacityError'; throw error; }
  const db = await openCatalogueDb(factory, timeoutMs);
  return transact(db, 'readwrite', timeoutMs, (tx, done, fail) => {
    const store = tx.objectStore('workspaces'), request = store.get(owner);
    request.onsuccess = () => {
      try {
        if ((request.result?.revision || 0) !== expectedRevision) { fail(new SaveConflictError()); return; }
        const saved = { ...state, revision: expectedRevision + 1, updatedAt: new Date().toISOString() }; done(saved);
        const photos = tx.objectStore('photos'), keys = new Set();
        const products = saved.products.map(product => {
          function metadataFor(photo) {
            if (!photo?.blob) return photo;
            const storageKey = photoKey(owner, product, photo);
            if (!keys.has(storageKey)) {
              keys.add(storageKey);
              const existingPhoto = photos.getKey(storageKey);
              existingPhoto.onsuccess = () => { try { if (!existingPhoto.result) photos.put(photo.blob, storageKey); } catch (error) { fail(error); } };
            }
            const { blob, ...metadata } = photo;
            return { ...metadata, storageKey };
          }
          return { ...product, photo: metadataFor(product.photo), ...(product.photos ? { photos: product.photos.map(metadataFor) } : {}) };
        });
        for (const previous of request.result?.products || []) {
          for (const photo of photosFor(previous)) { const oldKey = photo?.storageKey; if (oldKey && !keys.has(oldKey)) photos.delete(oldKey); }
        }
        store.put({ ...saved, products }, owner);
      } catch (error) { fail(error); }
    };
  });
}
