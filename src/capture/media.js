import { supabase } from '../lib/supabase';

async function decode(file) {
  let blob = file;
  if (/hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) {
    const { default: convert } = await import('heic2any');
    blob = await convert({ blob: file, toType: 'image/jpeg', quality: 0.95 });
    if (Array.isArray(blob)) blob = blob[0];
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

export async function preparePhoto(file) {
  if (file.size > 35 * 1024 * 1024) throw new Error('Choose a photo smaller than 35 MB.');
  const img = await decode(file).catch(() => { throw new Error('This photo could not be opened. Choose JPEG/HEIC, or set iPhone Camera → Formats → Most Compatible and retake.'); });
  const size = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
  if (!blob) throw new Error('Photo processing failed. Please try again.');
  return { blob, width: img.naturalWidth, height: img.naturalHeight,
    warning: Math.min(img.naturalWidth, img.naturalHeight) < 1000 ? 'Low resolution. Retake closer for crisp detail.' : '' };
}

async function upload(bucket, path, file, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType, cacheControl: '31536000' });
  if (error) throw new Error(`Upload failed: ${error.message}. Keep this page open and retry.`);
}

export async function uploadPhoto(draftId, shot, file, progress) {
  progress('Fitting your photo…');
  const processed = await preparePhoto(file);
  const id = crypto.randomUUID();
  const ext = file.name.split('.').pop().replace(/[^a-z0-9]/gi, '').slice(0,8) || 'jpg';
  const original = `${draftId}/${shot}-${id}.${ext}`;
  progress('Saving original…');
  await upload('capture-originals', original, file, file.type || 'application/octet-stream');
  const path = `capture/${draftId}/${shot}-${id}.webp`;
  progress('Saving website photo…');
  await upload('products', path, processed.blob, 'image/webp');
  const { data } = supabase.storage.from('products').getPublicUrl(path);
  return { url: data.publicUrl, original, filename: file.name, width: processed.width, height: processed.height, bytes: processed.blob.size, warning: processed.warning };
}

export async function uploadVideo(draftId, file, progress) {
  if (file.size > 45 * 1024 * 1024) throw new Error('Keep the turntable clip under 45 MB. Record 10–20 seconds at 1080p / 30 fps.');
  if (!/\.(mp4|mov|webm)$/i.test(file.name)) throw new Error('Choose an MP4, MOV or WebM video.');
  progress('Checking video…');
  const objectUrl = URL.createObjectURL(file);
  let duration;
  try {
    duration = await new Promise((resolve, reject) => {
      const v = document.createElement('video'); v.muted = true; v.preload = 'metadata';
      const timer = setTimeout(() => { v.removeAttribute('src'); v.load(); reject(new Error('Video check timed out. Try a shorter MP4 clip.')); }, 15000);
      v.onloadedmetadata = () => { clearTimeout(timer); const d = v.duration; v.removeAttribute('src'); v.load(); resolve(d); };
      v.onerror = () => { clearTimeout(timer); reject(new Error('This browser cannot play the video. Record with Camera → Formats → Most Compatible (H.264).')); };
      v.src = objectUrl;
    });
  } finally { URL.revokeObjectURL(objectUrl); }
  if (!Number.isFinite(duration) || duration > 60) throw new Error('Use one complete rotation, up to 60 seconds.');
  const id = crypto.randomUUID(), ext = file.name.split('.').pop().toLowerCase();
  const type = file.type || (ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4');
  const original = `${draftId}/turntable-${id}.${ext}`;
  progress('Saving original video…'); await upload('capture-originals', original, file, type);
  const path = `capture/${draftId}/turntable-${id}.${ext}`;
  progress('Saving product video…'); await upload('products', path, file, type);
  return { url: supabase.storage.from('products').getPublicUrl(path).data.publicUrl, original, filename: file.name, duration, bytes: file.size };
}
