import { Inflate } from 'fflate';
import { buildReviewDraft, safeAssetPath } from './sourceReview.js';
import { abortError } from './tasks.js';

export const REVIEW_PACK_LIMITS = Object.freeze({
  zipBytes: 30 * 1024 * 1024,
  files: 200,
  expandedBytes: 40 * 1024 * 1024,
  photoBytes: 20 * 1024 * 1024,
  metadataBytes: 1024 * 1024,
});
const METADATA = new Set(['products.json', 'asset_manifest.json', 'README.txt', 'product_review.csv', 'coverage.json', 'approved_asset_paths.txt']);
const REQUIRED = ['products.json', 'asset_manifest.json'];
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const fail = message => { throw new Error(`This review ZIP ${message}`); };
const checkAbort = signal => { if (signal?.aborted) throw abortError(); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value, max) => value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const crcTable = Uint32Array.from({ length: 256 }, (_, byte) => {
  let n = byte;
  for (let i = 0; i < 8; i++) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function extraFields(view, start, length) {
  const end = start + length;
  for (let offset = start; offset < end;) {
    if (offset + 4 > end) fail('has a malformed ZIP extra field.');
    const tag = view.getUint16(offset, true), size = view.getUint16(offset + 2, true);
    // ZIP64, alternative Unicode paths and encryption extensions are not part
    // of the approved format. Never let a second pathname override our checks.
    if ([0x0001, 0x7075, 0x0017, 0x9901].includes(tag)) fail('uses an unsupported ZIP extension.');
    offset += 4 + size;
    if (offset > end) fail('has a malformed ZIP extra field.');
  }
}
function entryName(bytes) {
  if (!bytes.length || bytes.length > 255 || bytes.some(byte => byte < 32 || byte > 126)) fail('contains an unsafe file path.');
  const name = textDecoder.decode(bytes);
  if (!METADATA.has(name) && !safeAssetPath(name)) fail('contains an unsupported file or unsafe file path. Use the sanitized review ZIP.');
  return name;
}

// Inspect every central and local header before inflation. This intentionally
// accepts a narrow, single-disk ZIP format, not arbitrary exports or chat ZIPs.
function inspectZip(bytes) {
  if (bytes.length > REVIEW_PACK_LIMITS.zipBytes) fail('is larger than the 30 MB limit.');
  if (bytes.length < 22) fail('is incomplete or is not a ZIP file.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
  }
  if (end < 0) fail('has no valid ZIP directory.');
  const count = view.getUint16(end + 10, true), directorySize = view.getUint32(end + 12, true), directory = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count) fail('uses an unsupported multi-disk ZIP.');
  if (!count || count > REVIEW_PACK_LIMITS.files) fail('must contain between 1 and 200 files.');
  if (directory === 0xffffffff || directorySize === 0xffffffff || directory + directorySize !== end) fail('has an invalid ZIP directory or uses ZIP64.');
  const entries = [], names = new Set();
  let cursor = directory, expandedBytes = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) fail('has an invalid ZIP directory entry.');
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true), expanded = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end) fail('has a truncated ZIP directory entry.');
    if (flags & ~0x080e) fail('contains encrypted files or unsupported ZIP flags.');
    if (![0, 8].includes(method)) fail('uses an unsupported compression method.');
    if (view.getUint16(cursor + 6, true) > 20 || view.getUint16(cursor + 34, true) || compressed === 0xffffffff || expanded === 0xffffffff) fail('uses an unsupported ZIP format.');
    const attributes = view.getUint32(cursor + 38, true), type = (attributes >>> 16) & 0xf000;
    if ((type && type !== 0x8000) || (attributes & 0x10)) fail('contains a symlink, directory or other unsupported file type.');
    const name = entryName(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (names.has(name.toLowerCase())) fail('contains duplicate file paths.');
    names.add(name.toLowerCase());
    const isAsset = Boolean(safeAssetPath(name));
    if (expanded > (isAsset ? REVIEW_PACK_LIMITS.photoBytes : REVIEW_PACK_LIMITS.metadataBytes)) fail(isAsset ? 'contains a photo larger than 20 MB.' : 'contains metadata larger than 1 MB.');
    expandedBytes += expanded;
    if (expandedBytes > REVIEW_PACK_LIMITS.expandedBytes) fail('expands beyond the 40 MB limit.');
    if ((method === 0 && compressed !== expanded) || (expanded && !compressed)) fail('has inconsistent ZIP file sizes.');
    extraFields(view, cursor + 46 + nameLength, extraLength);
    entries.push({ name, flags, method, compressed, expanded, crc: view.getUint32(cursor + 16, true), offset: view.getUint32(cursor + 42, true) });
    cursor = next;
  }
  if (cursor !== end) fail('has unexpected ZIP directory data.');
  for (const required of REQUIRED) if (!entries.some(entry => entry.name === required)) fail(`is missing ${required}.`);
  entries.sort((a, b) => a.offset - b.offset);
  if (entries[0].offset !== 0) fail('has unexpected data before its first file.');
  entries.forEach((entry, index) => {
    const offset = entry.offset, boundary = entries[index + 1]?.offset ?? directory;
    if (offset + 30 > boundary || boundary > directory || view.getUint32(offset, true) !== 0x04034b50) fail('has overlapping or invalid local file headers.');
    const nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLength + extraLength, dataEnd = dataStart + entry.compressed;
    if (dataEnd > boundary || dataStart > boundary) fail('has overlapping or truncated file data.');
    if (view.getUint16(offset + 4, true) > 20 || view.getUint16(offset + 6, true) !== entry.flags || view.getUint16(offset + 8, true) !== entry.method) fail('has mismatched local and directory headers.');
    if (entryName(bytes.subarray(offset + 30, offset + 30 + nameLength)) !== entry.name) fail('has mismatched local file paths.');
    extraFields(view, offset + 30 + nameLength, extraLength);
    const localValues = [view.getUint32(offset + 14, true), view.getUint32(offset + 18, true), view.getUint32(offset + 22, true)];
    const expected = [entry.crc, entry.compressed, entry.expanded];
    if (localValues.some((value, i) => value !== expected[i] && (!(entry.flags & 8) || value !== 0))) fail('has mismatched local file sizes or checksums.');
    if (entry.flags & 8) {
      const length = boundary - dataEnd;
      if (![12, 16].includes(length) || (length === 16 && view.getUint32(dataEnd, true) !== 0x08074b50)) fail('has an invalid ZIP data descriptor.');
      const start = dataEnd + (length === 16 ? 4 : 0);
      if (expected.some((value, i) => view.getUint32(start + i * 4, true) !== value)) fail('has a mismatched ZIP data descriptor.');
    } else if (dataEnd !== boundary) fail('has unexpected data between ZIP files.');
    entry.dataStart = dataStart;
  });
  return entries;
}

function expandEntry(bytes, entry, signal) {
  checkAbort(signal);
  const compressed = bytes.subarray(entry.dataStart, entry.dataStart + entry.compressed);
  let output;
  if (entry.method === 0) output = compressed.slice();
  else {
    // Do not trust declared sizes or unzip the archive in one operation. Feed
    // only 1 KiB of compressed input at a time (bounded DEFLATE expansion), and
    // stop at the first chunk exceeding the already-validated declared size.
    output = new Uint8Array(entry.expanded);
    let written = 0;
    const inflater = new Inflate(chunk => {
      if (written + chunk.length > entry.expanded) fail('expands beyond its declared file size.');
      output.set(chunk, written);
      written += chunk.length;
    });
    try {
      for (let offset = 0; offset < compressed.length; offset += 1024) {
        checkAbort(signal);
        const end = Math.min(offset + 1024, compressed.length);
        inflater.push(compressed.subarray(offset, end), end === compressed.length);
      }
      if (!compressed.length) inflater.push(new Uint8Array(), true);
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.startsWith('This review ZIP')) throw error;
      fail('contains invalid compressed data.');
    }
    if (written !== entry.expanded) fail('has an incorrect expanded file size.');
  }
  if (crc32(output) !== entry.crc) fail('contains a damaged file (checksum mismatch).');
  return output;
}
function parseJson(bytes, label) {
  try { return JSON.parse(textDecoder.decode(bytes)); }
  catch { fail(`contains invalid ${label}.`); }
}
function datasetIdFor(source) {
  const period = source.coverage?.requested_period;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!record(period) || period.inclusive !== true || !validDate(period.start) || !validDate(period.end) || period.start > period.end) fail('has an invalid inclusive review period.');
  return `wa-${period.start}_${period.end}-v1`;
}
function manifestFor(manifest, entries) {
  if (!Array.isArray(manifest) || manifest.length > REVIEW_PACK_LIMITS.files) fail('has an invalid asset manifest.');
  const images = new Map(entries.filter(entry => safeAssetPath(entry.name)).map(entry => [entry.name, entry]));
  const approved = new Map();
  for (const item of manifest) {
    if (!record(item) || !safeAssetPath(item.asset_path) || !/^[a-f0-9]{64}$/i.test(item.sha256 ?? '') || !Number.isSafeInteger(item.size_bytes) || item.size_bytes <= 0 || item.review_status !== 'visually_checked_product_reference') fail('has an invalid or unapproved asset manifest entry.');
    if (approved.has(item.asset_path)) fail('contains duplicate asset manifest paths.');
    if (images.get(item.asset_path)?.expanded !== item.size_bytes) fail('has a missing asset or a manifest size mismatch.');
    approved.set(item.asset_path, { sha256: item.sha256.toLowerCase(), size: item.size_bytes });
  }
  if (approved.size !== images.size) fail('contains images outside the approved asset manifest.');
  return approved;
}
function sanitizeProducts(source, datasetId, manifest) {
  if (!Array.isArray(source.products) || !source.products.length || source.products.length > 2000) fail('has an invalid product list.');
  const ids = new Set();
  return source.products.map(row => {
    if (!record(row) || typeof row.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(row.id) || typeof row.working_name !== 'string' || typeof row.name_status !== 'string' || typeof row.category !== 'string') fail('has an invalid product candidate.');
    if (ids.has(row.id)) fail('contains duplicate candidate IDs.');
    ids.add(row.id);
    for (const field of ['media', 'facts', 'review_flags', 'source_message_ids']) if (!Array.isArray(row[field]) || row[field].length > 64) fail('has invalid or excessive candidate evidence.');
    for (const media of row.media) {
      const approved = record(media) && manifest.get(media.asset_path);
      if (!approved || !safeAssetPath(media.asset_path)) fail('references an image outside the approved asset manifest.');
      if (typeof media.role !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/.test(media.role)) fail('has an image without a valid evidence role.');
      if (media.sha256 != null && (typeof media.sha256 !== 'string' || media.sha256.toLowerCase() !== approved.sha256)) fail('has a mismatched candidate image hash.');
    }
    if (row.primary_asset_path != null && (!safeAssetPath(row.primary_asset_path) || !manifest.has(row.primary_asset_path) || !row.media.some(media => media.asset_path === row.primary_asset_path))) fail('has an invalid primary image reference.');
    // Reuse the established allowlist; never return raw source, observations,
    // context facts, purchase data, source archives or unknown metadata fields.
    const clean = buildReviewDraft(row, { datasetId }).sourceReview;
    return {
      id: clean.candidateId, working_name: clean.workingName, name_status: clean.nameStatus,
      category: clean.category, facts: clean.facts, review_flags: clean.reviewFlags,
      source_message_ids: clean.sourceMessageIds, media: clean.media,
      ...(row.primary_asset_path ? { primary_asset_path: row.primary_asset_path } : {}),
    };
  });
}
function imageType(bytes, path) {
  if (/\.jpe?g$/i.test(path) && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (/\.png$/i.test(path) && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return 'image/png';
  if (/\.webp$/i.test(path) && bytes.length >= 12 && [82, 73, 70, 70].every((n, i) => bytes[i] === n) && [87, 69, 66, 80].every((n, i) => bytes[i + 8] === n)) return 'image/webp';
  fail('contains a photo whose content does not match its image file type.');
}

// No network, URL creation or persistence happens here. The caller receives
// only allowlisted review rows and verified image Blobs for local storage.
export async function parseReviewPack(input, { signal, onProgress } = {}) {
  checkAbort(signal);
  const bytes = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes) throw new TypeError('Review ZIP data must be an ArrayBuffer or Uint8Array.');
  const entries = inspectZip(bytes), byName = new Map(entries.map(entry => [entry.name, entry]));
  onProgress?.({ stage: 'validating', completed: 0, total: entries.length, message: 'Checking review ZIP and approved image manifest…' });
  const source = parseJson(expandEntry(bytes, byName.get('products.json'), signal), 'products.json');
  if (!record(source) || source.schema_version !== '1.0' || source.review_only !== true || typeof source.title !== 'string' || !cleanText(source.title, 200)) fail('is not a supported review-only product dataset.');
  const datasetId = datasetIdFor(source);
  const manifest = manifestFor(parseJson(expandEntry(bytes, byName.get('asset_manifest.json'), signal), 'asset_manifest.json'), entries);
  const products = sanitizeProducts(source, datasetId, manifest), assets = {};
  if (!globalThis.crypto?.subtle) throw new Error('Secure image verification is unavailable in this browser. Open the app over HTTPS in Safari or Chrome.');
  let completed = 0;
  for (const [path, approved] of manifest) {
    checkAbort(signal);
    const data = expandEntry(bytes, byName.get(path), signal);
    const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data));
    checkAbort(signal);
    if (Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('') !== approved.sha256) fail('has a photo that failed SHA-256 verification.');
    assets[path] = new Blob([data], { type: imageType(data, path) });
    onProgress?.({ stage: 'photos', completed: ++completed, total: manifest.size, message: `Verifying photo ${completed} of ${manifest.size}…` });
  }
  checkAbort(signal);
  return { datasetId, title: cleanText(source.title, 200), products, assets };
}
