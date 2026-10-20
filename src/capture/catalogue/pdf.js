import { fontCoverage } from './assets/font-coverage.js';
import { sans, serif, logo } from './assets/pdf-assets.js';

export const MAX_PDF_PRODUCTS = 50;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_PHOTO_BYTES = 100 * 1024 * 1024;
const MAX_NUMBER = 1_000_000_000;
const PAGE = { width: 210, height: 297, margin: 17 };
const COLORS = {
  navy: '#08376B', blue: '#2F90B0', ice: '#C7E1EA',
  muted: '#50657B', line: '#D4E2ED', white: '#FFFFFF',
};

// Verified against src/App.jsx's public website, WhatsApp and contact footer.
export const CATALOGUE_BRAND = Object.freeze({
  name: 'Decorbeats', website: 'www.decorbeats.com',
  websiteUrl: 'https://www.decorbeats.com',
  phone: '+91 98111 33661', whatsappUrl: 'https://wa.me/919811133661',
  email: 'meghagoel@decorbeats.com',
});

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function ensureSupportedText(text, label) {
  for (const character of text) {
    const point = character.codePointAt(0);
    if (point > 0xffff || !fontCoverage.some(([start, end]) => point >= start && point <= end)) {
      throw new Error(`${label} contains a character this PDF font cannot display (${character}). Please use Latin-script text without emoji for this review version.`);
    }
  }
}

function optionalNumber(value, label, allowZero = false) {
  if (value == null || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    throw new Error(`${label} must be a number without currency symbols or commas.`);
  }
  const number = Number(text);
  if (!Number.isFinite(number) || number > MAX_NUMBER || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(`${label} must be ${allowZero ? 'zero or a positive number' : 'a positive number'} no greater than 1,000,000,000.`);
  }
  return number;
}

const measurementNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 6 });
const priceNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** Blank measurements, weight and price stay absent, including their labels. */
export function formatProductDetails(product) {
  const dimensionUnit = product.dimensionUnit || 'cm';
  const weightUnit = product.weightUnit || 'g';
  if (!['cm', 'in', 'mm'].includes(dimensionUnit)) throw new Error('Choose cm, in or mm for dimensions.');
  if (!['g', 'kg'].includes(weightUnit)) throw new Error('Choose g or kg for weight.');
  const dimensions = ['length', 'width', 'height'].flatMap((key) => {
    const number = optionalNumber(product[key], key[0].toUpperCase() + key.slice(1));
    return number == null ? [] : [`${key[0].toUpperCase() + key.slice(1)} ${measurementNumber.format(number)} ${dimensionUnit}`];
  });
  const weight = optionalNumber(product.weight, 'Weight');
  const price = optionalNumber(product.price, 'Price', true);
  return {
    dimensions: dimensions.join('  ·  '),
    weight: weight == null ? '' : `Weight ${measurementNumber.format(weight)} ${weightUnit}`,
    price: price == null ? '' : `₹${priceNumber.format(price)}`,
  };
}

export function catalogueFilename(title) {
  const stem = cleanText(title).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 70).replace(/-$/g, '');
  return `decorbeats-${stem || 'product-catalogue'}.pdf`;
}

export function containPhoto(width, height, box) {
  if (![width, height, box.width, box.height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('The photograph has invalid dimensions. Please choose it again.');
  }
  const scale = Math.min(box.width / width, box.height / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    x: box.x + (box.width - fittedWidth) / 2,
    y: box.y + (box.height - fittedHeight) / 2,
    width: fittedWidth, height: fittedHeight,
  };
}

export function validateCatalogueInput({ title, products } = {}) {
  const normalizedTitle = cleanText(title) || 'Product catalogue';
  ensureSupportedText(normalizedTitle, 'Catalogue title');
  if (normalizedTitle.length > 160) throw new Error('Keep the catalogue title within 160 characters.');
  if (!Array.isArray(products) || products.length === 0) throw new Error('Add at least one product to export a catalogue.');
  if (products.length > MAX_PDF_PRODUCTS) throw new Error(`A catalogue can contain up to ${MAX_PDF_PRODUCTS} products.`);
  let bytes = 0;
  const normalizedProducts = products.map((product, index) => {
    if ((product?.sourceReview || product?.id?.startsWith('source-review:')) && product.sourceReview?.status !== 'confirmed') throw new Error(`Confirm WhatsApp draft ${index + 1} before exporting.`);
    const name = cleanText(product?.name);
    ensureSupportedText(name, `Product ${index + 1} name`);
    if (!name) throw new Error(`Enter a name for product ${index + 1}.`);
    if (name.length > 160) throw new Error(`Keep the name of product ${index + 1} within 160 characters.`);
    const blob = product.photo?.blob;
    if (!blob || typeof blob.arrayBuffer !== 'function' || !Number.isFinite(blob.size) || blob.size <= 0) {
      throw new Error(`Choose a photograph for ${name}.`);
    }
    if (blob.size > MAX_PHOTO_BYTES) throw new Error(`The photograph for ${name} is too large. Choose a photo under 12 MB.`);
    bytes += blob.size;
    return { ...product, name, details: formatProductDetails(product) };
  });
  if (bytes > MAX_TOTAL_PHOTO_BYTES) throw new Error('These photographs are too large to export together. Use smaller photos or split this catalogue.');
  return { title: normalizedTitle, products: normalizedProducts };
}

function setFont(doc, family, size, color = COLORS.navy) {
  doc.setFont(family, 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color);
}

/** Fit the entire supplied text. Shrinks the font instead of silently truncating. */
function fitText(doc, text, { font, width, maxLines, maxSize, minSize, maxHeight }) {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    setFont(doc, font, size);
    const lines = doc.splitTextToSize(text, width);
    const lineHeight = size * 0.352778 * 1.22;
    if (lines.length <= maxLines && lines.length * lineHeight <= maxHeight) return { lines, size, lineHeight };
  }
  throw new Error('This title or product name cannot fit on the page. Please shorten it.');
}

function drawTextLines(doc, fit, x, baseline) {
  doc.setFontSize(fit.size);
  fit.lines.forEach((line, index) => doc.text(line, x, baseline + index * fit.lineHeight));
}

function drawFooter(doc, pageNumber, pageCount) {
  doc.setFillColor(COLORS.ice);
  doc.rect(PAGE.margin, 280, PAGE.width - 2 * PAGE.margin, 0.5, 'F');
  setFont(doc, 'CatalogueSans', 7.5, COLORS.navy);
  doc.text(CATALOGUE_BRAND.website, PAGE.margin, 286);
  doc.link(PAGE.margin, 282.5, 42, 5, { url: CATALOGUE_BRAND.websiteUrl });
  doc.text(`WhatsApp ${CATALOGUE_BRAND.phone}`, 85, 286);
  doc.link(85, 282.5, 66, 5, { url: CATALOGUE_BRAND.whatsappUrl });
  doc.text(`${String(pageNumber).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`, 193, 286, { align: 'right' });
  setFont(doc, 'CatalogueSans', 7.2, COLORS.muted);
  doc.text(CATALOGUE_BRAND.email, PAGE.margin, 291);
  doc.link(PAGE.margin, 287.8, 62, 4, { url: `mailto:${CATALOGUE_BRAND.email}` });
}

function drawPageFrame(doc, title, pageNumber, pageCount) {
  doc.setFillColor(COLORS.white);
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F');
  doc.setFillColor(COLORS.navy);
  doc.rect(0, 0, PAGE.width, 2.4, 'F');
  doc.addImage(logo, 'PNG', PAGE.margin - 1, 11, 27, 27, 'decorbeats-logo', 'FAST');
  setFont(doc, 'CatalogueSans', 18);
  doc.text('Decorbeats', 46, 27.5);
  setFont(doc, 'CatalogueSans', 7.5, COLORS.muted);
  doc.text('PRODUCT CATALOGUE', 193, 26, { align: 'right' });
  doc.setFillColor(COLORS.ice);
  doc.rect(PAGE.margin, 40, 176, 0.65, 'F');
  doc.setFillColor(COLORS.blue);
  doc.rect(PAGE.margin, 40, 23, 0.65, 'F');
  const fit = fitText(doc, title, {
    font: 'CatalogueSans', width: 176, maxLines: 5, maxSize: 25, minSize: 10, maxHeight: 25,
  });
  drawTextLines(doc, fit, PAGE.margin, 53);
  drawFooter(doc, pageNumber, pageCount);
}

function drawProductText(doc, product, index) {
  doc.setFillColor(COLORS.ice);
  doc.roundedRect(PAGE.margin, 223, 29, 6, 1.2, 1.2, 'F');
  setFont(doc, 'CatalogueSans', 7.5, COLORS.navy);
  doc.text(`PRODUCT ${String(index + 1).padStart(2, '0')}`, PAGE.margin + 3, 227.2);
  const hasPrice = Boolean(product.details.price);
  const fit = fitText(doc, product.name, {
    font: 'CatalogueSans', width: hasPrice ? 123 : 176,
    maxLines: 5, maxSize: 21, minSize: 10, maxHeight: 27,
  });
  drawTextLines(doc, fit, PAGE.margin, 239);
  if (hasPrice) {
    setFont(doc, 'CatalogueSans', 7, COLORS.muted);
    doc.text('PRICE', 193, 231, { align: 'right' });
    const priceFit = fitText(doc, product.details.price, {
      font: 'CatalogueSans', width: 45, maxLines: 1, maxSize: 17, minSize: 9, maxHeight: 9,
    });
    setFont(doc, 'CatalogueSans', priceFit.size);
    doc.text(product.details.price, 193, 241, { align: 'right' });
  }
  setFont(doc, 'CatalogueSans', 8.5, COLORS.muted);
  if (product.details.dimensions) {
    const lines = doc.splitTextToSize(product.details.dimensions, 176);
    lines.forEach((line, index) => doc.text(line, PAGE.margin, 266 + index * 4));
  }
  if (product.details.weight) doc.text(product.details.weight, PAGE.margin, 275);
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Catalogue export cancelled.', 'AbortError');
}

/**
 * Creates a real, searchable A4 PDF entirely on-device. One photograph and product
 * per page; no cover-only pages. Only JPEG blobs are accepted, never remote URLs.
 * The embedded brand assets/fonts make this work without font or image requests.
 *
 * Optional onProgress({ completed, total }) and AbortSignal support busy/cancel UI.
 * The caller owns downloading/sharing the returned Blob and revoking object URLs.
 * No preview URLs are created here, so generation itself never leaks object URLs.
 */
export async function generateCataloguePdf(input = {}) {
  throwIfAborted(input.signal);
  const { title, products } = validateCatalogueInput(input);
  const { jsPDF } = await import('jspdf');
  throwIfAborted(input.signal);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.addFileToVFS('CatalogueSans.ttf', sans);
  doc.addFont('CatalogueSans.ttf', 'CatalogueSans', 'normal');
  doc.addFileToVFS('CatalogueSerif.ttf', serif);
  doc.addFont('CatalogueSerif.ttf', 'CatalogueSerif', 'normal');
  doc.setProperties({ title, author: CATALOGUE_BRAND.name, subject: 'Product catalogue', creator: 'Decorbeats catalogue' });
  doc.setLanguage('en-IN');
  doc.setDisplayMode('fullwidth', 'continuous');
  input.onProgress?.({ completed: 0, total: products.length });

  for (let index = 0; index < products.length; index += 1) {
    throwIfAborted(input.signal);
    const product = products[index];
    const bytes = new Uint8Array(await product.photo.blob.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error(`The photograph for ${product.name} is not a JPEG. Please choose it again.`);
    }
    let image;
    try {
      image = doc.getImageProperties(bytes);
      if (!image.width || !image.height) throw new Error('Invalid photograph');
    } catch {
      throw new Error(`The photograph for ${product.name} could not be read. Please choose it again.`);
    }
    throwIfAborted(input.signal);
    if (index) doc.addPage();
    drawPageFrame(doc, title, index + 1, products.length);
    doc.setFillColor(COLORS.white);
    doc.setDrawColor(COLORS.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(PAGE.margin, 77, 176, 139, 2, 2, 'FD');
    // Read the actual JPEG dimensions, rather than trusting stale editor metadata.
    const photo = containPhoto(image.width, image.height, { x: 19, y: 79, width: 172, height: 135 });
    doc.addImage(bytes, 'JPEG', photo.x, photo.y, photo.width, photo.height, `product-${index}`, 'NONE');
    drawProductText(doc, product, index);
    input.onProgress?.({ completed: index + 1, total: products.length });
    // Keep the browser responsive between pages and give cancellation a chance.
    if (index < products.length - 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throwIfAborted(input.signal);
  return {
    blob: new Blob([doc.output('arraybuffer')], { type: 'application/pdf' }),
    filename: catalogueFilename(title), pageCount: products.length,
  };
}
