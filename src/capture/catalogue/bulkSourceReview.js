import { activeCatalogue, MAX_CATALOGUE_PRODUCTS, MAX_PRODUCTS } from './model.js';
import { prepareCataloguePhoto } from './photos.js';
import { buildReviewDraft, getReviewAssets, isCollageCandidate, reviewDraftId, safeAssetPath, sourceReviewNeedsConfirmation } from './sourceReview.js';
import { abortError, waitForTask } from './tasks.js';

export const MAX_BULK_REVIEW_DRAFTS = 200;

const own = (value, key) => value && typeof value === 'object'
  ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const throwIfAborted = signal => { if (signal?.aborted) throw abortError(); };

function indexProducts(products, label) {
  if (!Array.isArray(products)) throw new TypeError(`${label} must be a product list.`);
  const byId = new Map();
  for (const product of products) {
    const id = own(product, 'id');
    if (typeof id !== 'string' || !id) throw new TypeError(`${label} contains a product without a valid ID.`);
    if (byId.has(id)) throw new TypeError(`${label} contains duplicate product IDs.`);
    byId.set(id, product);
  }
  return byId;
}

function checkLibraryCapacity(existingCount, addedCount) {
  if (existingCount + addedCount > MAX_PRODUCTS) {
    throw new RangeError(`These drafts would exceed this device's ${MAX_PRODUCTS}-product workspace limit. Existing drafts are unchanged.`);
  }
}

function sourceRows(source) {
  const rows = own(source, 'products'), datasetId = own(source, 'datasetId');
  if (!Array.isArray(rows)) throw new TypeError('This review source needs a candidate list.');
  if (rows.length > MAX_BULK_REVIEW_DRAFTS) throw new RangeError(`Add up to ${MAX_BULK_REVIEW_DRAFTS} review candidates at a time.`);
  // Validate even an empty source, and validate every row before decoding any
  // photos. An invalid late row must not result in a partly prepared import.
  reviewDraftId({ id: 'validation' }, datasetId);
  const seen = new Set();
  return Array.from(rows, row => {
    const id = reviewDraftId(row, datasetId);
    if (seen.has(id)) throw new TypeError('This review source contains duplicate candidate IDs.');
    seen.add(id);
    return { row, id };
  });
}

function localPhoto(source, row) {
  const assets = own(source, 'assets');
  const media = getReviewAssets(row).filter(item => item.role !== 'collage_reference');
  const primary = safeAssetPath(own(row, 'primary_asset_path'));
  const preferred = media.find(item => item.asset_path === primary);
  const ordered = preferred ? [preferred, ...media.filter(item => item !== preferred)] : media;
  for (const item of ordered) {
    const blob = assets instanceof Map ? assets.get(item.asset_path) : own(assets, item.asset_path);
    if (blob instanceof Blob && blob.size) return { blob, path: item.asset_path };
  }
  return null;
}

function withPhotoProblem(product, message) {
  const detail = typeof message === 'string' ? message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500) : '';
  const error = detail || 'The source photo could not be prepared. Add an individual product photo before confirming this draft.';
  return { ...product, photo: null, sourceReview: {
    ...product.sourceReview,
    photoPreparationError: error,
    reviewFlags: [...new Set([...product.sourceReview.reviewFlags, `Photo needed: ${error}`])],
  } };
}

async function prepareLocalPhoto(local, preparePhoto, signal, timeoutMs) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    throwIfAborted(signal);
    const file = new File([local.blob], local.path.split('/').at(-1), { type: local.blob.type });
    return await waitForTask(preparePhoto(file, { signal: controller.signal, timeoutMs }), {
      signal: controller.signal, timeoutMs,
      message: 'This source photo took too long to prepare. Add a product photo before confirming this draft.',
    });
  } finally {
    // A timed-out decoder must receive cancellation before the next row starts.
    // Its late result cannot replace the pending draft produced for this row.
    controller.abort();
    signal?.removeEventListener('abort', cancel);
  }
}

// All results stay local until the caller commits the returned array once. The
// source and existing products are never changed, including during cancellation.
export async function prepareAllReviewDrafts(source, existingProducts = [], { signal, onProgress = () => {}, preparePhoto = prepareCataloguePhoto, photoTimeoutMs = 15000 } = {}) {
  throwIfAborted(signal);
  if (typeof preparePhoto !== 'function' || typeof onProgress !== 'function') throw new TypeError('Review preparation needs valid photo and progress handlers.');
  if (!Number.isFinite(photoTimeoutMs) || photoTimeoutMs <= 0 || photoTimeoutMs > 60000) throw new TypeError('Photo preparation needs a timeout between 1 and 60,000 milliseconds.');
  const rows = sourceRows(source), existing = indexProducts(existingProducts, 'The workspace');
  checkLibraryCapacity(existing.size, rows.filter(({ id }) => !existing.has(id)).length);
  const products = [], total = rows.length;
  onProgress({ completed: 0, total, message: `Preparing ${total} review drafts…` });
  for (const { row, id } of rows) {
    throwIfAborted(signal);
    let product = existing.get(id);
    if (!product) {
      product = buildReviewDraft(row, { datasetId: own(source, 'datasetId') });
      if (isCollageCandidate(row)) {
        product.sourceReview.reviewFlags = [...new Set([...product.sourceReview.reviewFlags, 'Add an individual product photo. The source collage is reference only.'])];
      } else {
        const local = localPhoto(source, row);
        if (!local) {
          product = withPhotoProblem(product, 'No usable individual photo is available in this review pack. Add a product photo before confirming this draft.');
        } else {
          try {
            const photo = await prepareLocalPhoto(local, preparePhoto, signal, photoTimeoutMs);
            throwIfAborted(signal);
            if (!photo?.blob || !(photo.blob instanceof Blob) || !photo.blob.size) throw new Error('The source photo could not be prepared. Add a product photo before confirming this draft.');
            product = { ...product, photo };
          } catch (error) {
            if (signal?.aborted || error?.name === 'AbortError') throw abortError();
            product = withPhotoProblem(product, error?.message);
          }
        }
      }
    }
    throwIfAborted(signal);
    products.push(product);
    onProgress({ completed: products.length, total, message: `Prepared ${products.length} of ${total} review drafts` });
  }
  throwIfAborted(signal);
  return products;
}

// Merge against the latest workspace at commit time. A user-edited saved draft
// wins even if the incoming preparation was based on an older workspace snapshot.
export function mergeBulkReviewDrafts(state, products) {
  const incoming = indexProducts(products, 'The review import');
  if (incoming.size > MAX_BULK_REVIEW_DRAFTS) throw new RangeError(`Add up to ${MAX_BULK_REVIEW_DRAFTS} review candidates at a time.`);
  for (const id of incoming.keys()) {
    if (!/^source-review:[A-Za-z0-9][A-Za-z0-9._-]{0,159}:[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(id)) throw new TypeError('This review import contains an invalid draft ID.');
  }
  const existing = indexProducts(state?.products, 'The workspace');
  if (!Array.isArray(state?.catalogues)) throw new TypeError('Choose a catalogue draft before importing these candidates.');
  const catalogue = activeCatalogue(state);
  if (!catalogue || !Array.isArray(catalogue.productIds)) throw new TypeError('Choose a catalogue draft before importing these candidates.');
  const added = products.filter(product => !existing.has(product.id));
  checkLibraryCapacity(existing.size, added.length);
  const selectedIds = [...new Set([...catalogue.productIds, ...incoming.keys()])];
  if (selectedIds.length > MAX_CATALOGUE_PRODUCTS) throw new RangeError(`These drafts would exceed this catalogue's ${MAX_CATALOGUE_PRODUCTS}-product draft limit. Existing drafts are unchanged.`);
  const imported = products.map(product => existing.get(product.id) || product);
  const editingId = (imported.find(sourceReviewNeedsConfirmation) || imported[0])?.id || state.editingId;
  const selectionChanged = selectedIds.length !== catalogue.productIds.length || selectedIds.some((id, index) => id !== catalogue.productIds[index]);
  if (!added.length && !selectionChanged && editingId === state.editingId) return state;
  return {
    ...state,
    products: added.length ? [...state.products, ...added] : state.products,
    editingId,
    catalogues: selectionChanged ? state.catalogues.map(item => item !== catalogue ? item : { ...item, productIds: selectedIds }) : state.catalogues,
  };
}
