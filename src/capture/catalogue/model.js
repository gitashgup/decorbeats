export const MAX_PRODUCTS = 200;
export const MAX_CATALOGUE_PRODUCTS = 200;
export const MAX_EXPORT_PRODUCTS = 50;
export const uid = () => crypto.randomUUID();
export const newProduct = () => ({ id: uid(), name: '', length: '', width: '', height: '', dimensionUnit: 'cm', weight: '', weightUnit: 'g', price: '', photo: null });
export const newCatalogue = () => ({ id: uid(), title: '', productIds: [] });
export function newWorkspace() {
  const catalogue = newCatalogue();
  return { schema: 1, revision: 0, products: [], catalogues: [catalogue], activeCatalogueId: catalogue.id, editingId: null };
}
export const activeCatalogue = state => state.catalogues.find(c => c.id === state.activeCatalogueId);
export const isBlank = value => value == null || String(value).trim() === '';
export function numericError(value, { zero = false, max = 9999999.99, decimals = 3 } = {}) {
  if (isBlank(value)) return '';
  const input = String(value).trim();
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(input)) return 'Use a number without commas or symbols';
  const number = Number(input);
  if (!Number.isFinite(number) || number > max || (zero ? number < 0 : number <= 0)) return `Enter ${zero ? '0' : 'a number above 0'} to ${max.toLocaleString('en-IN')}`;
  return '';
}
export function productErrors(product, requireComplete = false) {
  const errors = {};
  if (requireComplete && !product.name.trim()) errors.name = 'Add a product name';
  if (product.name.length > 160) errors.name = 'Keep the name under 160 characters';
  if (requireComplete && !product.photo?.blob) errors.photo = 'Add a product photo';
  if (requireComplete && (product.sourceReview || product.id?.startsWith('source-review:')) && product.sourceReview?.status !== 'confirmed') errors.sourceReview = 'Confirm this WhatsApp draft before exporting';
  for (const field of ['length', 'width', 'height', 'weight']) {
    const error = numericError(product[field]);
    if (error) errors[field] = error;
  }
  const priceError = numericError(product.price, { zero: true, decimals: 2 });
  if (priceError) errors.price = priceError;
  if (!['mm', 'cm', 'in'].includes(product.dimensionUnit)) errors.dimensionUnit = 'Choose a dimension unit';
  if (!['g', 'kg'].includes(product.weightUnit)) errors.weightUnit = 'Choose a weight unit';
  return errors;
}
export function selectedProducts(state) {
  const byId = new Map(state.products.map(p => [p.id, p]));
  return [...new Set(activeCatalogue(state)?.productIds || [])].map(id => byId.get(id)).filter(Boolean);
}
export function exportProducts(state) {
  const excluded = new Set(activeCatalogue(state)?.exportExcludedIds || []);
  return selectedProducts(state).filter(p => !excluded.has(p.id));
}
export function setPdfSelection(state, includedIds) {
  const catalogue = activeCatalogue(state), included = new Set(includedIds);
  if (!catalogue) return state;
  const excluded = catalogue.productIds.filter(id => !included.has(id));
  if (JSON.stringify(excluded) === JSON.stringify(catalogue.exportExcludedIds || [])) return state;
  return { ...state, catalogues: state.catalogues.map(c => c.id !== catalogue.id ? c : { ...c, exportExcludedIds: excluded }) };
}
export function setProductIncluded(state, id, included) {
  const ids = exportProducts(state).map(p => p.id);
  return setPdfSelection(state, included ? [...ids, id] : ids.filter(value => value !== id));
}
export function reviewSummary(products) {
  return {
    total: products.length,
    incomplete: products.filter(p => Object.keys(productErrors(p, true)).length).length,
    missingPhoto: products.filter(p => !p.photo?.blob).length,
    pendingReview: products.filter(p => (p.sourceReview || p.id?.startsWith('source-review:')) && p.sourceReview?.status !== 'confirmed').length,
    unconfirmedPrice: products.filter(p => isBlank(p.price) && p.sourceReview?.facts?.some(f => f.field === 'catalogue_price_quote')).length,
  };
}
export function exportErrors(state) {
  const selected = exportProducts(state), errors = [];
  if (!selected.length) return ['Choose at least one product for the PDF'];
  if (selected.length > MAX_EXPORT_PRODUCTS) errors.push(`Choose up to ${MAX_EXPORT_PRODUCTS} products for one PDF. All products can stay in your draft`);
  return [...errors, ...selected.flatMap((p, i) => Object.values(productErrors(p, true)).map(error => `Product ${i + 1} (${p.name || 'Untitled'}): ${error}`))];
}
export function moveProduct(ids, id, direction) {
  const unique = [...new Set(ids)];
  const index = unique.indexOf(id), next = index + direction;
  if (index < 0 || next < 0 || next >= unique.length) return unique;
  [unique[index], unique[next]] = [unique[next], unique[index]];
  return unique;
}
export function toggleProduct(state, id) {
  return { ...state, catalogues: state.catalogues.map(c => c.id !== state.activeCatalogueId ? c : { ...c, productIds: c.productIds.includes(id) ? c.productIds.filter(x => x !== id) : [...c.productIds, id] }) };
}
export function formatDetails(product) {
  const dimensions = [['L', product.length], ['W', product.width], ['H', product.height]].filter(([, v]) => !isBlank(v)).map(([label, value]) => `${label} ${value}`);
  return [dimensions.length ? `${dimensions.join(' × ')} ${product.dimensionUnit}` : '', !isBlank(product.weight) ? `${product.weight} ${product.weightUnit}` : ''].filter(Boolean);
}
export function formatPrice(price) { return isBlank(price) ? '' : `₹${Number(price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
