import { waitForTask } from './tasks.js';
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export function checkPhotoFile(file) {
  if (!file || !file.size) throw new Error('Choose a photo that is not empty.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo smaller than 20 MB.');
  if (!/\.(jpe?g|png|webp|hei[cf])$/i.test(file.name) && !/^image\/(jpeg|png|webp|hei[cf])$/i.test(file.type)) throw new Error('Choose a JPEG, PNG, WebP or iPhone photo.');
}
export async function prepareCataloguePhoto(file, { signal, timeoutMs = 15000 } = {}) {
  checkPhotoFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await waitForTask(image.decode(), { signal, timeoutMs, message: 'Photo decoding timed out. Try a smaller JPEG photo.' }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new Error('This browser could not open that photo. On iPhone, share or export it as JPEG, or choose Camera → Formats → Most Compatible and take a new photo. Your previous photo is unchanged.'); }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This photo has no readable image. Choose another.');
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await waitForTask(new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9)), { signal, timeoutMs, message: 'Photo processing timed out. Try a smaller JPEG photo. Your previous photo is unchanged.' });
    if (!blob) throw new Error('Photo could not be processed. Please try again.');
    return { assetId: crypto.randomUUID(), blob, width: canvas.width, height: canvas.height, name: file.name, warning: Math.min(image.naturalWidth, image.naturalHeight) < 600 ? 'Small photo: it may look soft in the PDF. A larger photo will print better.' : '' };
  } finally { URL.revokeObjectURL(url); }
}
