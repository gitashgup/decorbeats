export const CAPTURE_PHOTO_KEYS = ['hero', 'front', 'back', 'detail', 'contents'];
export const MAX_EDITED_PHOTOS = 12;
export function editedPhotoEntries(photos = {}) {
  return Object.entries(photos).filter(([key, photo]) => key.startsWith('edited_') && photo?.url).sort(([a], [b]) => a.localeCompare(b));
}
