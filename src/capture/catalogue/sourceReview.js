import { newProduct } from './model.js';

// This boundary accepts the sanitized review dataset, never chat text or internal
// purchasing data. Evidence stays separate from the editable catalogue fields.
const MAX_ITEMS = 64;
const MAX_VALUE_ITEMS = 32;
const MAX_TEXT = 2000;
const FACT_FIELDS = new Set([
  'name', 'category', 'material', 'finish', 'colour', 'color',
  'product_configuration', 'sale_basis', 'dimensions', 'board_dimensions',
  'length', 'width', 'height', 'diameter', 'size', 'plate_size', 'weight',
  'capacity', 'bottle_capacity', 'glass_capacity', 'catalogue_price_quote',
]);
const MEDIA_TEXT_FIELDS = [
  'filename', 'message_id', 'date', 'sender', 'sender_identity', 'group', 'role',
  'association_confidence', 'note', 'source_pdf_filename', 'source_video_filename',
  'frame_filename', 'duplicate_of_source_filename',
];

const record = value => value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
// Only JSON-like own data properties are read; inherited fields and accessors
// cannot smuggle private metadata or run code while the boundary is inspected.
const own = (value, key) => record(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const text = (value, max = MAX_TEXT) => typeof value === 'string'
  ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';
const list = value => Array.isArray(value) ? value.slice(0, MAX_ITEMS) : [];
const nullableText = value => text(value) || null;
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value) ? value : '';
const strings = value => [...new Set(list(value).map(item => text(item)).filter(Boolean))];
const sourceIds = value => [...new Set(list(value).map(identifier).filter(Boolean))];

export function safeAssetPath(value) {
  if (typeof value !== 'string' || value.length > 255 || !value.startsWith('assets/') || value.includes('..')) return '';
  return /^assets\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/i.test(value) ? value : '';
}

export function getReviewAssets(row) {
  const seen = new Set(), assets = [];
  for (const media of list(own(row, 'media'))) {
    const asset_path = safeAssetPath(own(media, 'asset_path'));
    if (!asset_path || seen.has(asset_path)) continue;
    seen.add(asset_path);
    const clean = { asset_path };
    for (const key of MEDIA_TEXT_FIELDS) {
      const value = text(own(media, key));
      if (value) clean[key] = value;
    }
    const page = own(media, 'source_pdf_page');
    if (Number.isSafeInteger(page) && page > 0 && page <= 100000) clean.source_pdf_page = page;
    const hash = own(media, 'sha256');
    if (typeof hash === 'string' && /^[a-f0-9]{64}$/i.test(hash)) clean.sha256 = hash;
    const position = own(media, 'tile_position');
    if (record(position)) {
      const tile = {};
      for (const key of ['row', 'column', 'rows', 'columns']) {
        const value = own(position, key);
        if (Number.isSafeInteger(value) && value > 0 && value <= 100) tile[key] = value;
      }
      if (Object.keys(tile).length) clean.tile_position = tile;
    }
    assets.push(clean);
  }
  return assets;
}

export function isCollageCandidate(row) {
  if (own(row, 'category') === 'collage_candidate') return true;
  // Examine roles before path filtering or deduplication, so an invalid path
  // cannot turn a collage-only row into an ordinary product-photo candidate.
  const media = list(own(row, 'media')).filter(record);
  return media.length > 0 && media.every(item => own(item, 'role') === 'collage_reference');
}

function factValue(value) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return text(value);
  if (Array.isArray(value)) {
    // Never stringify objects or compact invalid dimension axes into new ones.
    const values = value.slice(0, MAX_VALUE_ITEMS);
    if (values.some(item => item !== null && !['string', 'number', 'boolean'].includes(typeof item))) return undefined;
    const result = values.map(factValue);
    return result.some(item => item === undefined) ? undefined : result;
  }
  return undefined;
}

function sanitizeFact(fact) {
  const field = own(fact, 'field'), value = factValue(own(fact, 'value'));
  if (!FACT_FIELDS.has(field) || value === undefined) return null;
  const clean = { field, value };
  for (const key of ['unit', 'currency', 'basis', 'confidence', 'note', 'price_type']) {
    const value = own(fact, key);
    if (value === null || typeof value === 'string') clean[key] = nullableText(value);
  }
  clean.source_message_ids = sourceIds(own(fact, 'source_message_ids'));
  const verified = own(fact, 'selling_price_verified');
  if (typeof verified === 'boolean') clean.selling_price_verified = verified;
  return clean;
}

export function reviewDraftId(row, datasetId) {
  const dataset = identifier(datasetId), candidate = identifier(own(row, 'id'));
  if (!dataset || !candidate) throw new TypeError('This review candidate needs a valid dataset and candidate ID');
  return `source-review:${dataset}:${candidate}`;
}

export function buildReviewDraft(row, options = {}) {
  const datasetId = own(options, 'datasetId'), photo = own(options, 'photo') ?? null;
  const id = reviewDraftId(row, datasetId);
  const workingName = text(own(row, 'working_name'), 160);
  return {
    ...newProduct(), id, name: workingName,
    photo: isCollageCandidate(row) ? null : photo,
    sourceReview: {
      datasetId, candidateId: own(row, 'id'), status: 'pending', workingName,
      nameStatus: text(own(row, 'name_status')),
      category: text(own(row, 'category'), 160),
      facts: list(own(row, 'facts')).map(sanitizeFact).filter(Boolean),
      reviewFlags: strings(own(row, 'review_flags')),
      sourceMessageIds: sourceIds(own(row, 'source_message_ids')),
      media: getReviewAssets(row),
    },
  };
}

export function sourceReviewNeedsConfirmation(product) {
  const review = own(product, 'sourceReview');
  if (review != null) return own(review, 'status') !== 'confirmed';
  // A partially corrupted saved import must not silently lose its review gate.
  return typeof own(product, 'id') === 'string' && own(product, 'id').startsWith('source-review:');
}

const label = value => value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
function displayValue(value, isDimensions = false) {
  if (Array.isArray(value)) return value.map(item => displayValue(item)).join(isDimensions ? ' × ' : ', ');
  return value === null ? 'not stated' : String(value);
}

export function formatReviewFact(fact) {
  const clean = sanitizeFact(fact);
  if (!clean) return '';
  const isQuote = clean.field === 'catalogue_price_quote';
  let value = displayValue(clean.value, ['dimensions', 'board_dimensions'].includes(clean.field));
  if (clean.unit) value += ` ${clean.unit}`;
  // Preserve explicitly supplied currency verbatim. Never infer INR from the
  // workspace's price field, source location or a contextual note.
  if (clean.currency) value += ` ${clean.currency}`;
  else if (isQuote) value += ' (currency not stated)';
  const evidence = [];
  if (clean.basis) evidence.push(`Basis: ${clean.basis}`);
  if (clean.confidence) evidence.push(`Confidence: ${clean.confidence.replaceAll('_', ' ')}`);
  if (clean.note) evidence.push(clean.note);
  return [`${label(clean.field)}: ${value}`, ...evidence].join(' · ');
}
