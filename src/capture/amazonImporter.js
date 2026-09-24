import { parseAsin } from '../../api/import-amazon-product.js';

export { parseAsin };

export async function fetchAmazonListing(urlOrAsin) {
  const res = await fetch('/api/import-amazon-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urlOrAsin })
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch product details from Amazon.');
  }
  return payload;
}

export async function fetchImageAsFile(imageUrl, filename = 'amazon-photo.jpg') {
  let blob;
  try {
    // Direct fetch with Amazon CDN's Access-Control-Allow-Origin: *
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    // Fallback to proxy
    const proxyRes = await fetch('/api/import-amazon-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'proxy_image', imageUrl })
    });
    if (!proxyRes.ok) throw new Error('Could not download image from Amazon.');
    const { base64, contentType } = await proxyRes.json();
    const fetched = await fetch(base64);
    blob = await fetched.blob();
  }

  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

export async function importAmazonPhotosIntoDraft(draftId, imageUrls, uploadPhoto, onProgress) {
  const photos = {};
  const requiredSlots = ['hero', 'front', 'back', 'detail'];
  const maxPhotos = 12;
  const list = imageUrls.slice(0, maxPhotos);

  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    const isRequired = i < requiredSlots.length;
    const slot = isRequired ? requiredSlots[i] : `edited_${crypto.randomUUID()}`;
    const filename = `amazon-${slot}.jpg`;

    onProgress?.(`Importing image ${i + 1} of ${list.length} from Amazon…`);

    const file = await fetchImageAsFile(url, filename);
    const uploaded = await uploadPhoto(draftId, slot, file, onProgress);
    photos[slot] = {
      ...uploaded,
      filename: isRequired ? `${slot.toUpperCase()} View` : `Amazon Product Image ${i + 1}`
    };
  }

  return photos;
}

export async function updateCatalogListing(supabaseClient, productId, updates) {
  try {
    const res = await fetch('/api/import-amazon-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_catalog', productId, updates })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.updated) return data.updated;
    }
  } catch (apiErr) {
    console.warn('API catalog update fallback to client:', apiErr);
  }

  if (!supabaseClient) throw new Error('Database client is not available.');
  const { data, error } = await supabaseClient
    .from('products')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
