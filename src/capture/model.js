export const SHOTS = [
  { id: 'hero', name: 'Main photo', hindi: 'पूरा सामान', icon: '📸', direction: 'पूरा सेट एक ही फ्रेम में। एकदम ऊपर या नीचे से नहीं।', angleHint: 'फोन आँख की ऊँचाई पर रखें।', lightHint: 'मुलायम सामने की रोशनी रखें।', tip: 'Show the whole product or complete set together.' },
  { id: 'front', name: 'Straight front', hindi: 'सामने से फोटो', icon: '⬆️', direction: 'सामने से सीधा। कैमरा ऊपर-नीचे मत हिलाएँ।', angleHint: 'फोन को सीधा रखें, ऊपर-नीचे झुकाव न दें।', lightHint: 'पीछे से तेज़ लाइट मत आने दें।', tip: 'Camera level with the product. Photograph straight from the front.' },
  { id: 'back', name: 'Side or back', hindi: 'साइड से फोटो', icon: '↪️', direction: 'अब साइड एंगल लो। प्रोडक्ट को थोड़ा घुमाओ।', angleHint: 'एक-एक साइड साफ दिखे ऐसा घुमाओ।', lightHint: 'समान रोशनी रखें ताकि दूसरी तरफ दिखे।', tip: 'Turn the product and photograph its side.' },
  { id: 'detail', name: 'Craft detail', hindi: 'नक्काशी पास से', icon: '🔍', direction: 'नक्काशी या टेक्सचर के पास जाएँ।', angleHint: 'पास आएँ, लेकिन पूरा सामान फ्रेम में रहे।', lightHint: 'यह शॉट तेज़ रोशनी में साफ़ आता है — लाइट सीधी रखें।', tip: 'Move closer to show the carving or finish clearly.' },
  { id: 'contents', name: 'Everything included', tip: 'For a set, show all pieces together. Optional for a single piece.' },
];
export const STEPS = ['Match product', 'Photos & video', 'Count & measure', 'Price & review'];
export const captureStepOrder = draft => draft?.product_id ? [0, 1, 2, 3] : [1, 0, 2, 3];
export const nextCaptureStep = (draft, current) => {
  const order = captureStepOrder(draft);
  return order[Math.min(order.indexOf(current) + 1, order.length - 1)];
};
export const SNAPSHOT_KEYS = ['name', 'category', 'material', 'quantity', 'mrp', 'cost_price', 'b2b_price', 'size', 'weight', 'notes', 'image_url', 'image_urls', 'video_urls', 'archived_at'];
export const snapshot = p => Object.fromEntries(SNAPSHOT_KEYS.map(k => [k, p?.[k] ?? null]));
export function newDraft(product, location = '') {
  return { id: crypto.randomUUID(), revision: 0, product_id: product?.id ?? null, status: 'draft',
    baseline: product ? snapshot(product) : null,
    data: { name: product?.name || '', category: product?.category || '', material: product?.material || '',
      sku: product?.sku || '', mrp: product?.mrp ?? '', cost_price: product?.cost_price ?? '', b2b_price: product?.b2b_price ?? '',
      notes: product?.notes || '', unit: '', locations: [{ name: location, sellable: '', damaged: '0' }],
      length: '', width: '', height: '', weight_g: '', packed_length: '', packed_width: '', packed_height: '', packed_weight_g: '',
      photos: {}, video: null, keepExistingPhotos: true, allLocations: false, pricingApproved: false, stockConfirmed: false,
      asin: '', sellerSku: '', step: 1 } };
}
export function countTotal(data, key = 'sellable') {
  return (data.locations || []).reduce((n, p) => n + (Number(p[key]) || 0), 0);
}
export function readiness(draft) {
  const d = draft.data;
  const issues = [];
  if (!d.name.trim()) issues.push('Enter the product name');
  if (d.reviewStatus === 'submitted' && !d.marketing?.description) issues.push('Generate and review the smart website listing');
  if (!d.unit.trim()) issues.push('Describe what one sellable unit contains');
  if (!d.category || !d.material) issues.push('Confirm category and material');
  if (!draft.product_id && d.destination !== 'new') issues.push('Choose create new product or match an existing product');
  if (!SHOTS.slice(0, 4).every(s => d.photos?.[s.id]?.url)) issues.push('Add the four required photographs');
  const locations = d.locations || [];
  if (!locations.length || locations.some(l => !l.name.trim() || l.sellable === '' || !Number.isInteger(Number(l.sellable)) || Number(l.sellable) < 0 || !Number.isInteger(Number(l.damaged)) || Number(l.damaged) < 0)) issues.push('Complete each location and its whole-number count');
  if (new Set(locations.map(l => l.name.trim().toLowerCase())).size !== locations.length) issues.push('Combine duplicate location rows');
  if (!d.allLocations || !d.stockConfirmed) issues.push('Confirm all locations and controlled sellable stock');
  if (['length','width','height','weight_g','packed_length','packed_width','packed_height','packed_weight_g'].some(k => !Number.isFinite(Number(d[k])) || Number(d[k]) <= 0)) issues.push('Complete product and packed measurements');
  if (Number(d.packed_weight_g) < Number(d.weight_g)) issues.push('Packed weight cannot be less than product weight');
  if (!Number.isFinite(Number(d.mrp)) || Number(d.mrp) <= 0 || !d.pricingApproved) issues.push('Confirm the website price with Megha');
  if (d.cost_price === '' || !Number.isFinite(Number(d.cost_price)) || Number(d.cost_price) < 0) issues.push('Enter the confirmed unit cost');
  if (d.b2b_price !== '' && d.b2b_price != null && (!Number.isFinite(Number(d.b2b_price)) || Number(d.b2b_price)<0)) issues.push('Enter a valid B2B price or leave it blank');
  return issues;
}
