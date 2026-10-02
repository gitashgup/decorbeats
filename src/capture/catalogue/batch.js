import { newProduct } from './model.js';

export const MAX_BATCH_PHOTOS = 20;
const makeId = () => crypto.randomUUID();
function availableGroupId(preferred, occupied) {
  let value = preferred;
  while (occupied.has(value)) value = `group:${value}`;
  occupied.add(value);
  return value;
}

// The original selection metadata survives compression so selecting a file again
// cannot silently create another product in this batch.
export function batchFileKey(file) {
  return JSON.stringify([file.name || '', file.size || 0, file.type || '', file.lastModified || 0]);
}
export function createBatchEntries(files, existing = [], { maxFiles = MAX_BATCH_PHOTOS, id = makeId } = {}) {
  const entries = [...existing], rejected = [], duplicates = [];
  const seen = new Set(existing.map(entry => entry.fileKey));
  const limit = Math.max(0, Math.min(MAX_BATCH_PHOTOS, maxFiles));
  for (const file of Array.from(files || [])) {
    const fileKey = batchFileKey(file);
    if (seen.has(fileKey)) { duplicates.push(file.name); continue; }
    if (entries.length >= limit) { rejected.push(file.name); continue; }
    seen.add(fileKey);
    entries.push({ id: id(), fileKey, file, name: file.name, status: 'queued', photo: null, error: '' });
  }
  return { entries, rejected, duplicates };
}

// One decoder at a time. Every completed result is published independently, and
// failed or cancelled originals remain available for an explicit retry.
export async function processPhotoBatch(entries, { prepare, signal, ids, onUpdate = () => {} } = {}) {
  if (typeof prepare !== 'function') throw new TypeError('A photo processor is required.');
  let current = entries.map(entry => ({ ...entry }));
  const eligible = new Set(ids || current.filter(entry => entry.status !== 'ready').map(entry => entry.id));
  const publish = () => onUpdate(current.map(entry => ({ ...entry })));
  const change = (index, patch) => { current[index] = { ...current[index], ...patch }; publish(); };
  for (let index = 0; index < current.length; index++) {
    const entry = current[index];
    if (!eligible.has(entry.id) || entry.status === 'ready') continue;
    if (signal?.aborted) break;
    change(index, { status: 'processing', error: '' });
    try {
      const photo = await prepare(entry.file, { signal });
      // Release large originals once a compressed version is safely in review.
      change(index, { status: 'ready', photo, file: null, error: '' });
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError') {
        change(index, { status: 'paused', error: '' });
        break;
      }
      change(index, { status: 'error', error: error?.message || 'This photo could not be opened. Try again.' });
    }
  }
  if (signal?.aborted) {
    current = current.map(entry => eligible.has(entry.id) && ['queued', 'processing'].includes(entry.status) ? { ...entry, status: 'paused' } : entry);
    publish();
  }
  return current;
}

export function appendReadyBatchGroups(groups, entries) {
  const included = new Set(groups.flatMap(group => group.photoIds));
  const extra = entries.filter(entry => entry.status === 'ready' && entry.photo && !included.has(entry.id));
  if (!extra.length) return groups;
  return [...groups, ...extra.map(entry => ({ id: entry.id, photoIds: [entry.id], coverId: entry.id }))];
}

// Selected views become one product. Existing group order and unselected views
// survive, and a view can never belong to two products.
export function groupBatchPhotos(groups, selectedIds) {
  const selected = new Set(selectedIds);
  const ordered = [...new Set(groups.flatMap(group => group.photoIds).filter(id => selected.has(id)))];
  if (ordered.length < 2) return groups;
  const firstIndex = groups.findIndex(group => group.photoIds.some(id => selected.has(id)));
  const first = groups[firstIndex];
  const remainder = first.photoIds.filter(id => !selected.has(id));
  const merged = {
    // A partial selection must not reuse the remaining group's identity.
    id: remainder.length ? availableGroupId(`group:${ordered[0]}`, new Set(groups.map(group => group.id))) : first.id,
    photoIds: ordered,
    coverId: ordered.includes(first.coverId) ? first.coverId : ordered[0],
  };
  const result = [];
  groups.forEach((group, index) => {
    if (index === firstIndex) result.push(merged);
    const photoIds = group.photoIds.filter(id => !selected.has(id));
    if (photoIds.length) result.push(photoIds.length === group.photoIds.length ? group : { ...group, photoIds, coverId: photoIds.includes(group.coverId) ? group.coverId : photoIds[0] });
  });
  return result;
}
export function ungroupBatchPhotos(groups, groupId) {
  const occupied = new Set(groups.map(group => group.id));
  return groups.flatMap(group => group.id !== groupId || group.photoIds.length < 2 ? [group] : group.photoIds.map((id, index) => ({ id: index === 0 ? group.id : availableGroupId(id, occupied), photoIds: [id], coverId: id })));
}
export function chooseBatchCover(groups, groupId, photoId) {
  return groups.map(group => group.id === groupId && group.photoIds.includes(photoId) ? { ...group, coverId: photoId } : group);
}
export function batchProducts(groups, entries) {
  const ready = new Map(entries.filter(entry => entry.status === 'ready' && entry.photo).map(entry => [entry.id, entry.photo]));
  const used = new Set();
  return groups.flatMap(group => {
    const photoIds = group.photoIds.filter(id => {
      if (!ready.has(id) || used.has(id)) return false;
      used.add(id); return true;
    });
    if (!photoIds.length) return [];
    const photos = photoIds.map(id => ready.get(id));
    const coverIndex = photoIds.indexOf(group.coverId);
    return [{ ...newProduct(), id: group.id, photos, photo: photos[Math.max(0, coverIndex)] }];
  });
}

export function removeBatchPhoto(entries, groups, photoId) {
  return {
    entries: entries.filter(entry => entry.id !== photoId),
    groups: groups.flatMap(group => {
      const photoIds = group.photoIds.filter(id => id !== photoId);
      if (!photoIds.length) return [];
      if (photoIds.length === group.photoIds.length) return [group];
      return [{ ...group, photoIds, coverId: photoIds.includes(group.coverId) ? group.coverId : photoIds[0] }];
    }),
  };
}
