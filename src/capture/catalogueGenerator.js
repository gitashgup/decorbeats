/**
 * Decorbeats — Diwali Stock Catalogue, Digital Detail Book & Promo Video / Flow Generator
 *
 * Features:
 * 1. Unified normalization for both live `products` and `capture_drafts` (lightbox captures).
 * 2. Prominent Weight storytelling (grams + kg + Heirloom Solid Brass tier).
 * 3. Dual-unit Dimensions formatting (cm + inches).
 * 4. Pure-JS Multi-Page 9:16 Mobile PDF compiler (1080 × 1920 px per page) with embedded
 *    clickable WhatsApp & Website URI annotations on every page.
 * 5. Individual 9:16 Product Spec Sheet (JPG + 1-page PDF) for instant WhatsApp sharing.
 * 6. Client-side 9:16 Animated Promo Video Reel generator (WebM/MP4 via MediaRecorder).
 * 7. Google Flow (Veo) 10-second cinematic video prompt & 9:16 reference frame generator.
 */

import { cmToInches, formatWeight } from './photoEnhancer.js';
import { countTotal } from './model.js';

export const DECORBEATS_BRAND = {
  name: 'DECORBEATS',
  legalName: 'decorbeats(OPC) Pvt Ltd',
  tagline: 'The Brass House of India',
  subtitle: 'Artisanal Brass Handicrafts, Sacred Pooja Accents & Luxury Festive Gifting',
  whatsappNumber: '919811133661',
  phoneDisplay: '+91 98111 33661',
  email: 'meghagoel@decorbeats.com',
  website: 'https://www.decorbeats.com',
  websiteDisplay: 'www.decorbeats.com',
  experienceCenter:
    'No.126, Nirmaalya, Ground Floor, 1st A Cross, 1st Main Road, Supreme Residency Layout, Kodichikkanahalli, Bengaluru — 560076',
  registeredOffice:
    'decorbeats(OPC) Pvt Ltd, B140, Deen Dayal Nagar, Brass City, Moradabad, UP — 244001',
  gstPresence: 'Karnataka · Tamil Nadu · Maharashtra',
  craftPromise:
    'Every Decorbeats creation is hand-cast in solid metal by master artisans of Moradabad (Pital Nagri). We celebrate genuine weight, heirloom thickness, and timeless devotion — never hollow sheet metal.'
};

/**
 * Classifies brass weight into an evocative quality badge so customers appreciate the solid casting.
 */
export function describeWeightBadge(weightG) {
  const g = Number(weightG);
  if (!Number.isFinite(g) || g <= 0) {
    return {
      shortLabel: 'Solid Artisan Brass',
      gramsText: '',
      kgText: '',
      fullText: 'Handcrafted Solid Brass',
      tier: 'Heirloom Solid Metal Casting',
      story: 'Hand-cast in solid Moradabad brass with authentic artisanal heft and balance.'
    };
  }

  const roundedG = Math.round(g);
  const gramsText = `${roundedG.toLocaleString('en-IN')} g`;
  const kgText = roundedG >= 1000 ? `${(roundedG / 1000).toFixed(2)} kg` : `${(roundedG / 1000).toFixed(2)} kg`;
  const primaryReadout = roundedG >= 1000 ? `${(roundedG / 1000).toFixed(2)} kg (${gramsText})` : gramsText;

  let tier = 'Solid Hand-Cast Brass';
  let story = 'Substantial solid metal casting — feels rich, balanced, and authentic in hand.';

  if (roundedG >= 2000) {
    tier = 'Monumental Heirloom Weight';
    story = 'Extra-heavy temple-grade solid brass casting built to be treasured for generations.';
  } else if (roundedG >= 1000) {
    tier = 'Heavy Statement Casting';
    story = 'Over 1 kg of pure solid metal — unmistakable luxury heft for grand festive decor & gifting.';
  } else if (roundedG >= 500) {
    tier = 'Substantial Heirloom Weight';
    story = 'Dense, thick-walled Moradabad casting that radiates warmth and permanence.';
  } else if (roundedG >= 200) {
    tier = 'Solid Artisan Weight';
    story = 'Pure solid brass construction with reassuring stability and resonant finish.';
  }

  return {
    weightG: roundedG,
    shortLabel: primaryReadout,
    gramsText,
    kgText,
    fullText: formatWeight(roundedG),
    tier,
    story
  };
}

/**
 * Parses and formats product dimensions in both cm and inches.
 */
export function formatDimensionsSpec({ length, width, height, sizeText } = {}) {
  let l = Number(length) || 0;
  let w = Number(width) || 0;
  let h = Number(height) || 0;

  if (!l && !w && !h && sizeText) {
    const nums = String(sizeText)
      .match(/\d+(?:\.\d+)?/g)
      ?.map(Number)
      .filter((n) => n > 0);
    if (nums?.length >= 3) {
      [l, w, h] = nums;
    } else if (nums?.length === 2) {
      [w, h] = nums;
    } else if (nums?.length === 1) {
      h = nums[0];
    }
  }

  const partsCm = [];
  const partsIn = [];
  const labels = [];

  if (h > 0) {
    partsCm.push(`H ${h}`);
    partsIn.push(`${cmToInches(h)}"`);
    labels.push({ key: 'Height', cm: `${h} cm`, inches: `${cmToInches(h)} in` });
  }
  if (w > 0) {
    partsCm.push(`W ${w}`);
    partsIn.push(`${cmToInches(w)}"`);
    labels.push({ key: 'Width', cm: `${w} cm`, inches: `${cmToInches(w)} in` });
  }
  if (l > 0) {
    partsCm.push(`D ${l}`);
    partsIn.push(`${cmToInches(l)}"`);
    labels.push({ key: 'Depth', cm: `${l} cm`, inches: `${cmToInches(l)} in` });
  }

  if (!partsCm.length) {
    return {
      hasDimensions: false,
      cmSummary: sizeText ? String(sizeText).trim() : 'Standard Artisan Size',
      inchSummary: '',
      combinedSummary: sizeText ? String(sizeText).trim() : 'Standard Artisan Size',
      labels: [],
      length: '',
      width: '',
      height: ''
    };
  }

  const cmSummary = `${partsCm.join(' × ')} cm`;
  const inchSummary = `${partsIn.join(' × ')}`;
  return {
    hasDimensions: true,
    cmSummary,
    inchSummary,
    combinedSummary: `${cmSummary} (${inchSummary})`,
    labels,
    length: l ? String(l) : '',
    width: w ? String(w) : '',
    height: h ? String(h) : ''
  };
}

/**
 * Extracts a numeric weight in grams from a product or draft record.
 */
export function parseWeightGrams(rawWeightG, rawWeightText) {
  if (rawWeightG != null && rawWeightG !== '') {
    const n = Number(rawWeightG);
    if (Number.isFinite(n) && n > 0) {
      // If someone stored kg < 25 with decimal e.g. 1.45 in a kg field, caller passes grams; here rawWeightG is grams
      return Math.round(n);
    }
  }
  if (rawWeightText) {
    const str = String(rawWeightText).toLowerCase().replace(/,/g, '');
    const kgMatch = str.match(/(\d+(?:\.\d+)?)\s*kg/);
    if (kgMatch) {
      return Math.round(Number(kgMatch[1]) * 1000);
    }
    const gMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams)\b/);
    if (gMatch) {
      return Math.round(Number(gMatch[1]));
    }
    const plainNum = str.match(/(\d+(?:\.\d+)?)/);
    if (plainNum) {
      const val = Number(plainNum[1]);
      return val > 0 && val < 15 && str.includes('.') ? Math.round(val * 1000) : Math.round(val);
    }
  }
  return 0;
}

/**
 * Normalizes a Capture Studio draft (`capture_drafts`) or a live product (`products`)
 * into a unified Catalogue Item ready for the Digital Detail Book, PDF Lookbook, and Video Studio.
 */
export function normalizeCatalogueItem(record, sourceType = 'auto') {
  if (!record) return null;

  const isDraft =
    sourceType === 'draft' ||
    (sourceType === 'auto' &&
      ((record.data && typeof record.data === 'object' && ('photos' in record.data || 'locations' in record.data)) ||
        'primary_photo' in record ||
        'whatsapp_synced' in record));

  if (isDraft) {
    const d = record.data || record || {};
    const base = record.baseline || {};
    const photosObj = d.photos && !Array.isArray(d.photos) ? d.photos : {};

    // Prefer studio cleaned preview if present, then hero, then any other captured angle
    const photoOrder = ['hero', 'front', 'back', 'detail', 'contents'];
    const allPhotoUrls = [];

    if (record.primary_photo) {
      allPhotoUrls.push(record.primary_photo);
    }
    if (photosObj.hero?.cleanedPreview?.url && !allPhotoUrls.includes(photosObj.hero.cleanedPreview.url)) {
      allPhotoUrls.push(photosObj.hero.cleanedPreview.url);
    }
    for (const slot of photoOrder) {
      if (photosObj[slot]?.url && !allPhotoUrls.includes(photosObj[slot].url)) {
        allPhotoUrls.push(photosObj[slot].url);
      }
    }
    for (const [, val] of Object.entries(photosObj)) {
      if (val?.url && !allPhotoUrls.includes(val.url)) {
        allPhotoUrls.push(val.url);
      }
    }
    if (Array.isArray(record.photos)) {
      for (const pUrl of record.photos) {
        const u = typeof pUrl === 'string' ? pUrl : pUrl?.url;
        if (u && !allPhotoUrls.includes(u)) {
          allPhotoUrls.push(u);
        }
      }
    }
    if (!allPhotoUrls.length && base.image_url) {
      allPhotoUrls.push(base.image_url);
    }

    const hasLocationsCount =
      Array.isArray(d.locations) && d.locations.some((loc) => loc.sellable !== '' && loc.sellable != null);
    const quantity = hasLocationsCount
      ? countTotal(d)
      : Number.isFinite(Number(d.quantity ?? record.quantity ?? base.quantity))
      ? Number(d.quantity ?? record.quantity ?? base.quantity)
      : 0;

    const weightG = parseWeightGrams(d.weight_g ?? record.weight_g, base.weight);
    const dims = formatDimensionsSpec({
      length: d.length ?? d.length_cm ?? record.length_cm,
      width: d.width ?? d.width_cm ?? record.width_cm,
      height: d.height ?? d.height_cm ?? record.height_cm,
      sizeText: base.size
    });

    const mrp = Number(d.mrp || record.mrp || base.mrp || base.price || 0) || 0;
    const bulkPrice = Number(d.b2b_price || record.bulk_price || base.b2b_price || (mrp ? Math.round(mrp * 0.82) : 0)) || 0;

    const highlights =
      Array.isArray(d.marketing?.highlights) && d.marketing.highlights.filter(Boolean).length
        ? d.marketing.highlights.filter(Boolean)
        : [];

    const material = d.material || record.material || base.material || 'Solid Brass (Moradabad Handcrafted)';

    return {
      id: `draft-${record.id}`,
      rawId: record.id,
      productId: record.product_id || null,
      source: record.status === 'published' ? 'published_draft' : 'draft',
      whatsappSynced: Boolean(d.whatsapp_synced || record.whatsapp_synced),
      stockNote: d.stock_note || record.stock_note || '',
      sku: d.sku || d.sellerSku || record.sku || base.sku || `DB-${String(record.id || '').slice(0, 6).toUpperCase()}`,
      name: (d.name || record.name || base.name || 'Handcrafted Moradabad Brass Accent').trim(),
      category: d.category || record.category || base.category || 'Decor',
      material,
      unit: d.unit || record.unit || '1 Complete Set / Unit',
      quantity,
      weightG,
      weightSpec: describeWeightBadge(weightG),
      length: dims.length,
      width: dims.width,
      height: dims.height,
      dimensionsSpec: dims,
      mrp,
      bulkPrice,
      description:
        (d.notes || d.description || record.description || d.marketing?.description || base.notes || '').trim() ||
        'Exquisitely handcrafted by master artisans of Moradabad. Features rich traditional detailing, verified studio weight, and a warm festive luster ideal for pooja mandirs, home styling, and prestigious Diwali gifting.',
      highlights,
      imageUrl: allPhotoUrls[0] || '',
      galleryUrls: allPhotoUrls.slice(0, 4),
      videoUrl: d.video?.url || '',
      locationName: (d.locations || []).map((l) => l.name).filter(Boolean).join(', ') || record.location || '',
      updatedAt: record.updated_at || new Date().toISOString()
    };
  }

  // Otherwise normalize a live `products` row
  const p = record;
  const gallery = [];
  if (p.image_url) gallery.push(p.image_url);
  if (p.imageUrl && !gallery.includes(p.imageUrl)) gallery.push(p.imageUrl);
  if (Array.isArray(p.image_urls)) {
    for (const u of p.image_urls) {
      if (u && !gallery.includes(u)) gallery.push(u);
    }
  }

  const weightG = parseWeightGrams(
    p.weight_g || (p.weightsKg?.net ? Number(p.weightsKg.net) * 1000 : null),
    p.weight
  );
  const dims = formatDimensionsSpec({
    length: p.length || p.dimensionsCm?.product?.length,
    width: p.width || p.dimensionsCm?.product?.breadth || p.dimensionsCm?.product?.width,
    height: p.height || p.dimensionsCm?.product?.height,
    sizeText: p.size
  });

  const mrp = Number(p.mrp ?? p.price ?? p.pricing?.mrp ?? 0) || 0;
  const bulkPrice = Number(p.b2b_price ?? p.pricing?.b2b ?? (mrp ? Math.round(mrp * 0.82) : 0)) || 0;

  return {
    id: `product-${p.id}`,
    rawId: p.id,
    productId: p.id,
    source: 'inventory',
    sku: p.sku || `DB-${p.id}`,
    name: (p.name || 'Handcrafted Moradabad Brass Accent').trim(),
    category: p.category || 'Decor',
    material: p.material || 'Solid Brass',
    unit: p.unit || '1 Sellable Unit',
    quantity: Number(p.quantity ?? 0) || 0,
    weightG,
    weightSpec: describeWeightBadge(weightG),
    length: dims.length,
    width: dims.width,
    height: dims.height,
    dimensionsSpec: dims,
    mrp,
    bulkPrice,
    description:
      (p.notes || p.description || '').trim() ||
      'Handcrafted in solid metal by Moradabad master artisans. Designed for festive celebrations, home mandirs, and memorable gifting.',
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    imageUrl: gallery[0] || '',
    galleryUrls: gallery.slice(0, 4),
    videoUrl: Array.isArray(p.video_urls) && p.video_urls[0] ? p.video_urls[0] : p.videoUrl || '',
    locationName: '',
    updatedAt: p.updated_at || new Date().toISOString()
  };
}

/**
 * Merges `capture_drafts` and `products` into a deduplicated list of Catalogue Items,
 * preferring active/recent lightbox drafts over older baseline rows when matched by `product_id`.
 */
export function buildMergedCataloguePool(products = [], drafts = []) {
  const byProductId = new Map();
  const standaloneDrafts = [];

  for (const draft of drafts) {
    const item = normalizeCatalogueItem(draft, 'draft');
    if (!item) continue;
    // Skip empty drafts that have neither name nor photo
    if (!item.imageUrl && (!draft.data?.name || draft.data?.name === 'New product')) continue;

    if (item.productId) {
      if (!byProductId.has(item.productId)) {
        byProductId.set(item.productId, item);
      }
    } else {
      standaloneDrafts.push(item);
    }
  }

  const merged = [...standaloneDrafts];

  for (const product of products) {
    if (product.archived_at || product.archivedAt) continue;
    if (byProductId.has(product.id)) {
      const draftItem = byProductId.get(product.id);
      const prodItem = normalizeCatalogueItem(product, 'product');
      // Fill any missing photo/specs from baseline product
      merged.push({
        ...prodItem,
        ...draftItem,
        imageUrl: draftItem.imageUrl || prodItem.imageUrl,
        galleryUrls: draftItem.galleryUrls.length ? draftItem.galleryUrls : prodItem.galleryUrls,
        weightG: draftItem.weightG || prodItem.weightG,
        weightSpec: describeWeightBadge(draftItem.weightG || prodItem.weightG),
        dimensionsSpec: draftItem.dimensionsSpec.hasDimensions ? draftItem.dimensionsSpec : prodItem.dimensionsSpec,
        mrp: draftItem.mrp || prodItem.mrp,
        bulkPrice: draftItem.bulkPrice || prodItem.bulkPrice
      });
      byProductId.delete(product.id);
    } else {
      merged.push(normalizeCatalogueItem(product, 'product'));
    }
  }

  return merged.sort((a, b) => {
    const score = (x) =>
      (x.source !== 'inventory' ? 100 : 0) +
      (x.weightG > 0 ? 40 : 0) +
      (x.dimensionsSpec?.hasDimensions ? 20 : 0) +
      (x.quantity > 0 ? 10 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

/**
 * Builds a pre-filled WhatsApp inquiry URL for a specific product or the entire catalogue.
 */
export function buildProductWhatsAppUrl(item, { asOfDate = '', priceMode = 'show_price', customPrice = 0 } = {}) {
  const weightPart = item.weightG ? ` · Weight: ${item.weightSpec.shortLabel}` : '';
  const dimPart = item.dimensionsSpec?.hasDimensions ? ` · Size: ${item.dimensionsSpec.cmSummary}` : '';
  const stockPart = item.quantity > 0 ? ` (${item.quantity} units available${asOfDate ? ` as of ${asOfDate}` : ''})` : '';
  const cleanCustomPrice = Number(customPrice) || 0;
  const pricePart =
    cleanCustomPrice > 0
      ? ` · Quoted Price: ₹${cleanCustomPrice.toLocaleString('en-IN')}/pc`
      : priceMode !== 'hide_price' && item.mrp > 0
      ? ` · Price: ₹${Number(item.mrp).toLocaleString('en-IN')}`
      : '';

  const text = `Hi Decorbeats! I am interested in *${item.name}* [SKU: ${item.sku}]${weightPart}${dimPart}${stockPart}${pricePart}. Please share availability and ordering details.`;
  return `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a rich WhatsApp caption text for sharing an individual product card.
 */
export function buildProductShareText(
  item,
  { asOfDate = '', priceMode = 'show_price', customPrice = 0, customPriceNote = '', shareUrl = '' } = {}
) {
  const cleanCustomPrice = Number(customPrice) || 0;
  const lines = [
    `🪔 *${item.name}*`,
    `✦ *Decorbeats — The Brass House of India*`,
    `✦ *SKU:* ${item.sku} | *Material:* ${item.material}`
  ];
  if (item.weightG > 0) {
    lines.push(`⚖️ *Weight:* ${item.weightSpec.shortLabel}`);
  }
  if (item.dimensionsSpec?.hasDimensions) {
    lines.push(`📐 *Size:* ${item.dimensionsSpec.combinedSummary}`);
  }
  if (item.quantity > 0) {
    lines.push(`📦 *Ready Stock:* ${item.quantity} Units Available`);
  }
  if (cleanCustomPrice > 0) {
    lines.push(
      `💰 *Festive Price:* ₹${cleanCustomPrice.toLocaleString('en-IN')} / pc${
        customPriceNote ? ` (${customPriceNote})` : ''
      }`
    );
  } else if (priceMode === 'show_price' && item.mrp > 0) {
    lines.push(`💰 *Price:* ₹${Number(item.mrp).toLocaleString('en-IN')}`);
  } else if (priceMode === 'show_bulk' && item.mrp > 0) {
    lines.push(
      `💰 *MRP:* ₹${Number(item.mrp).toLocaleString('en-IN')} | *Bulk (50+ pcs):* ₹${Number(
        item.bulkPrice || Math.round(item.mrp * 0.82)
      ).toLocaleString('en-IN')}`
    );
  }
  if (shareUrl) {
    lines.push(`\n🔗 *View All Angles & Order:* ${shareUrl}`);
  } else {
    lines.push(`\n📲 *WhatsApp:* ${DECORBEATS_BRAND.phoneDisplay} | 🌐 ${DECORBEATS_BRAND.website}/diwali-stock`);
  }
  return lines.join('\n');
}

/**
 * Generates a cinema-grade 10-second Google Flow (Veo) prompt for a specific product,
 * incorporating its true physical scale, weight, craft details, and festive Diwali ambiance.
 */
export function generateGoogleFlowPrompt(item, sceneStyle = 'festive_diwali') {
  const name = item.name || 'Handcrafted Solid Brass Artifact';
  const weightDesc =
    item.weightG > 0
      ? `substantial ${item.weightSpec.shortLabel} solid sand-cast brass piece`
      : 'substantial solid sand-cast Moradabad brass piece';
  const dimDesc = item.dimensionsSpec?.hasDimensions
    ? `true physical proportions (${item.dimensionsSpec.cmSummary})`
    : 'authentic physical tabletop proportions';

  const sceneDescriptions = {
    festive_diwali:
      'resting on a dark polished Burmese teakwood surface surrounded by softly glowing brass tealight diyas, fresh orange marigold petals, and warm golden bokeh lights in the background',
    pooja_mandir:
      'placed reverently in a serene Indian home temple (Pooja Mandir) with carved warm sandstone pillars, subtle incense smoke drifting gently in golden morning sunbeams, and fresh jasmine flowers',
    luxury_pedestal:
      'resting on a minimal dark Emperador marble pedestal in a luxury architectural studio with dramatic warm rim lighting that caresses every hand-carved groove and metallic highlight'
  };

  const setting = sceneDescriptions[sceneStyle] || sceneDescriptions.festive_diwali;

  return {
    title: `Google Flow 9:16 Commercial Prompt — ${name}`,
    aspectRatio: '9:16 Vertical (1080×1920)',
    duration: '10 seconds',
    prompt: `Cinematic 9:16 vertical luxury commercial video of the exact ${name} from the reference frame — a ${weightDesc} with ${dimDesc}, ${setting}. Slow, ultra-smooth orbital macro camera movement around the brass centerpiece at eye level. Warm 2700K golden directional key light catches the authentic hand-burnished Moradabad brass patina, intricate engravings, and rich specular metallic reflections, conveying unmistakable heavy heirloom weight and solidity. Shallow depth of field (85mm f/2.0 cinema prime lens), natural contact shadows, photorealistic live-action commercial cinematography, zero morphing of product geometry, no text or watermarks.`,
    negativePrompt:
      'deformed brass geometry, melting metal, changing product shape, artificial text overlays, watermarks, harsh flat flash lighting, plastic texture, shaky camera'
  };
}

/**
 * Pure-JS Multi-Page PDF Compiler (PDF 1.4).
 * Embeds an array of JPEG byte arrays (`Uint8Array`) as full-bleed 9:16 pages (540 × 960 pt = 1080 × 1920 at 2x DPI)
 * and attaches clickable URI link annotations (e.g., WhatsApp & Website links) on each page!
 *
 * @param {Array<{ jpegBytes: Uint8Array, width: number, height: number, links?: Array<{ x: number, y: number, w: number, h: number, url: string }> }>} pages
 * @returns {Uint8Array} Valid PDF binary
 */
export function compileJpegPagesToPdf(pages) {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('At least one page is required to compile a PDF.');
  }

  const encoder = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [0]; // 1-indexed PDF object byte offsets

  function pushStr(str) {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    offset += bytes.length;
  }

  function pushBytes(bytes) {
    chunks.push(bytes);
    offset += bytes.length;
  }

  function startObj(id) {
    offsets[id] = offset;
    pushStr(`${id} 0 obj\n`);
  }

  function endObj() {
    pushStr(`\nendobj\n`);
  }

  // PDF Header with binary comment marker
  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object allocation:
  // 1: Catalog
  // 2: Pages root
  // For each page i (0..N-1):
  //   pageObjId, contentObjId, imageObjId, plus optional link annotation objects
  let nextObjId = 3;
  const pageRefs = pages.map((page) => {
    const pageObjId = nextObjId++;
    const contentObjId = nextObjId++;
    const imageObjId = nextObjId++;
    const annotIds = (page.links || []).map(() => nextObjId++);
    return { pageObjId, contentObjId, imageObjId, annotIds, page };
  });

  // Obj 1: Catalog
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  // Obj 2: Pages
  startObj(2);
  const kidsList = pageRefs.map((r) => `${r.pageObjId} 0 R`).join(' ');
  pushStr(`<< /Type /Pages /Count ${pages.length} /Kids [ ${kidsList} ] >>`);
  endObj();

  // Standard 9:16 page size in PDF points (72 pt/inch): 540 x 960 pt (7.5" x 13.33")
  const pagePtW = 540;
  const pagePtH = 960;

  for (let i = 0; i < pageRefs.length; i++) {
    const { pageObjId, contentObjId, imageObjId, annotIds, page } = pageRefs[i];
    const imgW = page.width || 1080;
    const imgH = page.height || 1920;
    const imgName = `/Im${i + 1}`;

    // Page Object
    startObj(pageObjId);
    const annotPart = annotIds.length ? ` /Annots [ ${annotIds.map((id) => `${id} 0 R`).join(' ')} ]` : '';
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${pagePtW} ${pagePtH} ] /Resources << /XObject << ${imgName} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R${annotPart} >>`
    );
    endObj();

    // Content Stream (draws the image scaled to full page)
    const contentStream = `q\n${pagePtW} 0 0 ${pagePtH} 0 0 cm\n${imgName} Do\nQ\n`;
    const contentBytes = encoder.encode(contentStream);
    startObj(contentObjId);
    pushStr(`<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBytes(contentBytes);
    pushStr(`\nendstream`);
    endObj();

    // Image XObject (raw JPEG stream via DCTDecode)
    const jpegBytes = page.jpegBytes;
    startObj(imageObjId);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    pushBytes(jpegBytes);
    pushStr(`\nendstream`);
    endObj();

    // Clickable URI Link Annotations (coordinates converted from top-left canvas px to bottom-left PDF pt)
    const links = page.links || [];
    for (let l = 0; l < links.length; l++) {
      const link = links[l];
      const annotId = annotIds[l];
      const scaleX = pagePtW / imgW;
      const scaleY = pagePtH / imgH;
      const x1 = (link.x * scaleX).toFixed(2);
      const x2 = ((link.x + link.w) * scaleX).toFixed(2);
      const y2 = (pagePtH - link.y * scaleY).toFixed(2);
      const y1 = (pagePtH - (link.y + link.h) * scaleY).toFixed(2);
      const safeUrl = String(link.url || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

      startObj(annotId);
      pushStr(
        `<< /Type /Annot /Subtype /Link /Rect [ ${x1} ${y1} ${x2} ${y2} ] /Border [ 0 0 0 ] /A << /Type /Action /S /URI /URI (${safeUrl}) >> >>`
      );
      endObj();
    }
  }

  // Cross-reference table (xref)
  const xrefOffset = offset;
  const totalObjects = nextObjId;
  pushStr(`xref\n0 ${totalObjects}\n`);
  pushStr(`0000000000 65535 f \n`);
  for (let id = 1; id < totalObjects; id++) {
    const padded = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }

  // Trailer
  pushStr(`trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  // Concatenate all chunks
  const result = new Uint8Array(offset);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

// ============================================================================
// Canvas Rendering Engine (9:16 Luxury Mobile Lookbook · 1080 × 1920 px)
// ============================================================================

const W = 1080;
const H = 1920;

const PALETTE = {
  obsidian: '#161311',
  charcoal: '#211D1A',
  emeraldDeep: '#13332D',
  emeraldBadge: '#17423A',
  gold: '#C59B43',
  goldLight: '#E5C878',
  goldDark: '#8F6B24',
  cream: '#FAF6EE',
  ivoryCard: '#FFFDF9',
  softSand: '#F2E9D8',
  borderGold: '#D8C398',
  textDark: '#1E1A17',
  textMuted: '#63584E',
  textCream: '#FAF6EE',
  rustAccent: '#9E3B24'
};

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(ctx, text, maxWidth, maxLines = 4) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        // Last allowed line: append remaining words and truncate if needed
        const rest = [current, ...words.slice(i + 1)].join(' ');
        let truncated = rest;
        while (truncated.length > 3 && ctx.measureText(`${truncated}…`).width > maxWidth) {
          truncated = truncated.slice(0, -1).trim();
        }
        lines.push(truncated === rest ? rest : `${truncated}…`);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

const imageCache = new Map();

export async function loadCanvasImage(url) {
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imageCache.set(url, promise);
  return promise;
}

function drawImageContainFramed(ctx, img, x, y, w, h, bgColor = '#FFFFFF') {
  ctx.save();
  drawRoundRect(ctx, x, y, w, h, 24);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.clip();

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const pad = 24;
    const availW = w - pad * 2;
    const availH = h - pad * 2;
    const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = PALETTE.softSand;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.goldDark;
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DECORBEATS SOLID BRASS', x + w / 2, y + h / 2);
  }
  ctx.restore();

  ctx.save();
  drawRoundRect(ctx, x, y, w, h, 24);
  ctx.strokeStyle = PALETTE.borderGold;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawOrnamentalBorder(ctx, darkTheme = false) {
  // Top and bottom gold bars
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, PALETTE.goldDark);
  grad.addColorStop(0.5, PALETTE.goldLight);
  grad.addColorStop(1, PALETTE.goldDark);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 18);
  ctx.fillRect(0, H - 18, W, 18);

  // Subtle inner frame hairline
  ctx.save();
  drawRoundRect(ctx, 28, 38, W - 56, H - 76, 20);
  ctx.strokeStyle = darkTheme ? 'rgba(197, 155, 67, 0.32)' : 'rgba(197, 155, 67, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Renders Page 1: Luxury Cover Page (1080 × 1920)
 */
export async function renderCoverSlideCanvas(items, config = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const title = config.title || 'DEEPAWALI 2026 READY STOCK EDIT';
  const subtitle =
    config.subtitle ||
    'Handcrafted Moradabad Solid Brass · Verified Warehouse Stock & Dimensions';
  const asOfDate =
    config.asOfDate ||
    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Background
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(0, 0, W, H);

  // Royal Dark Header Banner
  const headerH = 510;
  const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  headerGrad.addColorStop(0, PALETTE.obsidian);
  headerGrad.addColorStop(1, PALETTE.charcoal);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, headerH);

  // Gold ribbon divider
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, headerH, W, 12);

  drawOrnamentalBorder(ctx, false);

  // Brand Eyebrow Pill
  ctx.save();
  drawRoundRect(ctx, 72, 68, 540, 44, 22);
  ctx.fillStyle = 'rgba(197, 155, 67, 0.18)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦  BRASS EXPERTS FROM PITAL NAGRI · MORADABAD', 94, 90);
  ctx.restore();

  // Brand Name
  ctx.fillStyle = PALETTE.textCream;
  ctx.font = 'bold 74px Georgia, "Times New Roman", serif';
  ctx.textBaseline = 'top';
  ctx.fillText('DECORBEATS', 72, 136);

  // Catalogue Title
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const titleLines = wrapTextLines(ctx, title.toUpperCase(), W - 144, 2);
  let ty = 236;
  for (const line of titleLines) {
    ctx.fillText(line, 72, ty);
    ty += 42;
  }

  // Subtitle
  ctx.fillStyle = '#D7CBB8';
  ctx.font = '25px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const subLines = wrapTextLines(ctx, subtitle, W - 144, 2);
  ty += 8;
  for (const line of subLines) {
    ctx.fillText(line, 72, ty);
    ty += 34;
  }

  // Stock As-Of Date & Stats Bar
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalWeightKg = (
    items.reduce((sum, item) => sum + (Number(item.weightG) || 0), 0) / 1000
  ).toFixed(1);

  ctx.save();
  drawRoundRect(ctx, 72, 412, W - 144, 68, 16);
  ctx.fillStyle = PALETTE.emeraldDeep;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`📦 AVAILABLE STOCK AS OF ${asOfDate.toUpperCase()}`, 98, 446);

  ctx.fillStyle = PALETTE.goldLight;
  ctx.textAlign = 'right';
  ctx.fillText(`${items.length} Designs · ${totalUnits} Ready Units`, W - 98, 446);
  ctx.restore();

  // Featured 6-Product Collage Grid (2 columns × 3 rows)
  const gridItems = items.filter((x) => x.imageUrl).slice(0, 6);
  const loadedImages = await Promise.all(gridItems.map((x) => loadCanvasImage(x.imageUrl)));

  const startY = 562;
  const colW = 452;
  const rowH = 340;
  const gapX = 32;
  const gapY = 28;

  for (let idx = 0; idx < 6; idx++) {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 72 + col * (colW + gapX);
    const y = startY + row * (rowH + gapY);
    const item = gridItems[idx] || items[idx];
    const img = loadedImages[idx];

    drawImageContainFramed(ctx, img, x, y, colW, rowH, '#FFFFFF');

    if (item) {
      // Bottom overlay pill on each cover tile showing Name + Weight
      ctx.save();
      drawRoundRect(ctx, x + 14, y + rowH - 64, colW - 28, 50, 12);
      ctx.fillStyle = 'rgba(22, 19, 17, 0.88)';
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      const shortName = item.name.length > 24 ? `${item.name.slice(0, 22)}…` : item.name;
      ctx.fillText(shortName, x + 28, y + rowH - 39);

      if (item.weightG > 0) {
        ctx.fillStyle = PALETTE.goldLight;
        ctx.textAlign = 'right';
        ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(`⚖️ ${item.weightSpec.gramsText}`, x + colW - 26, y + rowH - 39);
      }
      ctx.restore();
    }
  }

  // Bottom Brand & Contact Strip
  const footerY = 1668;
  ctx.save();
  drawRoundRect(ctx, 72, footerY, W - 144, 186, 20);
  ctx.fillStyle = PALETTE.charcoal;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('BENGALURU EXPERIENCE CENTER  ·  MORADABAD ATELIER  ·  PAN-INDIA DISPATCH', 100, footerY + 24);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`📲 WhatsApp / Call: ${DECORBEATS_BRAND.phoneDisplay}`, 100, footerY + 62);

  ctx.fillStyle = '#E0D6C5';
  ctx.font = '21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`✉️ ${DECORBEATS_BRAND.email}   |   🌐 ${DECORBEATS_BRAND.websiteDisplay}`, 100, footerY + 102);
  ctx.fillText(
    `📍 Kodichikkanahalli, Bengaluru — 560076  ·  GST: ${DECORBEATS_BRAND.gstPresence}`,
    100,
    footerY + 138
  );
  ctx.restore();

  const links = [
    {
      x: 72,
      y: footerY,
      w: W - 144,
      h: 186,
      url: `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}?text=${encodeURIComponent(
        `Hi Decorbeats! I'm viewing your ${title} (${asOfDate}). Please help me shortlist items.`
      )}`
    }
  ];

  return { canvas, links, totalWeightKg };
}

/**
 * Renders Page 2: Brand & Solid Brass Weight Story Page (1080 × 1920)
 * "Everyone should love the weight and should also talk about the brand and all that stuff."
 */
export async function renderBrandStorySlideCanvas(items, config = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Deep Heritage Obsidian background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, PALETTE.obsidian);
  bgGrad.addColorStop(0.5, '#1D1814');
  bgGrad.addColorStop(1, PALETTE.obsidian);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  drawOrnamentalBorder(ctx, true);

  // Header
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('✦  THE DECORBEATS CRAFTSMANSHIP PROMISE', 76, 86);

  ctx.fillStyle = PALETTE.textCream;
  ctx.font = 'bold 62px Georgia, "Times New Roman", serif';
  ctx.fillText('Brass Never Lies.', 76, 130);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('Why Weight Matters.', 76, 206);

  ctx.fillStyle = '#E2D8C5';
  ctx.font = '27px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const introLines = wrapTextLines(
    ctx,
    'Born in Moradabad (Pital Nagri) and backed by our Bengaluru Experience Center, every Decorbeats creation is cast in solid metal by master artisans. In authentic Indian metalcraft, true gram weight is the ultimate signature of purity, longevity, and value.',
    W - 152,
    4
  );
  let y = 298;
  for (const line of introLines) {
    ctx.fillText(line, 76, y);
    y += 38;
  }

  // Three Pillar Cards Celebrating Weight, Craft & Gifting
  const pillars = [
    {
      badge: '01 · PURE SOLID WEIGHT — NEVER HOLLOW SHEET',
      title: '⚖️  Every Gram is Verified on Our Studio Scale',
      body: 'When you hold a Decorbeats idol, urli, or diya, you immediately feel the dense, reassuring heft of solid virgin brass. Unlike lightweight electroplated iron or hollow pressed sheet metal, our thick-walled castings retain their sacred resonance and structural beauty for generations.'
    },
    {
      badge: '02 · HERITAGE ARTISANS OF PITAL NAGRI, MORADABAD',
      title: '🔥  Hand-Cast & Hand-Engraved by Master Craftsmen',
      body: 'Each motif — from intricate temple carvings and blooming lotus pedestals to hand-buffed antique finishes — is shaped through traditional sand-casting and detailed by hand in our Moradabad atelier before undergoing strict multi-angle lightbox inspection.'
    },
    {
      badge: '03 · RETAIL, FESTIVE & CORPORATE GIFTING EXCELLENCE',
      title: '🎁  Single Pieces to Bulk · Custom Boxes · Multi-State GST',
      body: 'Whether you are choosing statement accents for your home or curating auspicious Deepawali gifts for clients and teams, we offer velvet-lined gift boxes, custom branding, GST billing across KA, TN & MH, and express dispatch from Bengaluru.'
    }
  ];

  y = 478;
  for (const pillar of pillars) {
    ctx.save();
    drawRoundRect(ctx, 72, y, W - 144, 305, 22);
    ctx.fillStyle = 'rgba(255, 253, 248, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(197, 155, 67, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(pillar.badge, 104, y + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 31px Georgia, "Times New Roman", serif';
    ctx.fillText(pillar.title, 104, y + 66);

    ctx.fillStyle = '#D9CEBA';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const bLines = wrapTextLines(ctx, pillar.body, W - 208, 5);
    let by = y + 118;
    for (const bl of bLines) {
      ctx.fillText(bl, 104, by);
      by += 34;
    }
    ctx.restore();
    y += 332;
  }

  // Bottom Authenticity Seal Bar
  ctx.save();
  drawRoundRect(ctx, 72, 1500, W - 144, 340, 22);
  ctx.fillStyle = PALETTE.emeraldDeep;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('✦  HOW TO READ EVERY PRODUCT PAGE IN THIS CATALOGUE', 104, 1532);

  const guidePoints = [
    '⚖️  SOLID WEIGHT SEAL: Exact net weight in grams & kilograms measured at our lightbox station.',
    '📐  TRUE DIMENSIONS: Complete Height × Width × Depth in both Centimeters (cm) and Inches (in).',
    '📦  LIVE WAREHOUSE STOCK: Verified ready-to-ship units physically counted in our warehouse.',
    '📲  1-TAP WHATSAPP ORDERING: Tap any product page button to enquire or reserve stock instantly.'
  ];
  let gy = 1582;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '23px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  for (const pt of guidePoints) {
    const lines = wrapTextLines(ctx, pt, W - 208, 2);
    for (const l of lines) {
      ctx.fillText(l, 104, gy);
      gy += 31;
    }
    gy += 12;
  }
  ctx.restore();

  return { canvas, links: [] };
}

/**
 * Renders a 9:16 Single-Product Hero Page (1080 × 1920)
 * Celebrates the photo, the exact gram/kg Weight Seal, cm + inch Dimensions, Available Stock, and Brand details.
 */
export async function renderProductSlideCanvas(item, index, totalCount, config = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const priceMode = config.priceMode || 'show_price';
  const asOfDate =
    config.asOfDate ||
    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Warm Ivory Background
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(0, 0, W, H);
  drawOrnamentalBorder(ctx, false);

  // Top Header Strip
  ctx.fillStyle = PALETTE.charcoal;
  ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('DECORBEATS  ·  THE BRASS HOUSE OF INDIA', 68, 72);

  // Page index pill
  ctx.save();
  drawRoundRect(ctx, W - 220, 48, 152, 46, 23);
  ctx.fillStyle = PALETTE.charcoal;
  ctx.fill();
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ITEM ${String(index).padStart(2, '0')} / ${String(totalCount).padStart(2, '0')}`, W - 144, 71);
  ctx.restore();

  // Divider line
  ctx.fillStyle = PALETTE.borderGold;
  ctx.fillRect(68, 108, W - 136, 2);

  // Hero Product Image Frame (1080 wide -> 944px frame width, 820px height)
  const imgX = 68;
  const imgY = 128;
  const imgW = W - 136;
  const imgH = 810;

  const heroImg = await loadCanvasImage(item.imageUrl);
  drawImageContainFramed(ctx, heroImg, imgX, imgY, imgW, imgH, '#FFFFFF');

  // Top-Left Floating Category + SKU Badge on Image
  ctx.save();
  drawRoundRect(ctx, imgX + 20, imgY + 20, 340, 48, 14);
  ctx.fillStyle = 'rgba(22, 19, 17, 0.86)';
  ctx.fill();
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  const skuLabel = `${item.category.toUpperCase()}  ·  ${item.sku}`.slice(0, 32);
  ctx.fillText(skuLabel, imgX + 38, imgY + 44);
  ctx.restore();

  // Top-Right Floating AVAILABLE STOCK Badge on Image
  const stockText =
    item.quantity > 0 ? `✓ ${item.quantity} IN STOCK` : item.stockNote ? 'ENQUIRE STOCK' : 'MADE TO ORDER';
  ctx.save();
  drawRoundRect(ctx, imgX + imgW - 270, imgY + 20, 250, 52, 14);
  ctx.fillStyle = item.quantity > 0 ? PALETTE.emeraldBadge : PALETTE.charcoal;
  ctx.fill();
  ctx.strokeStyle = PALETTE.goldLight;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stockText, imgX + imgW - 145, imgY + 46);
  ctx.restore();

  // Optional Bottom-Left Floating Custom Price Pill on Image (when Megha shares with price)
  const customPrice = Number(config.customPrice) || 0;
  const customPriceNote = String(config.customPriceNote || '').trim();
  if (customPrice > 0) {
    const priceBannerText = `₹${customPrice.toLocaleString('en-IN')} / pc`;
    ctx.save();
    drawRoundRect(ctx, imgX + 20, imgY + imgH - 86, 320, 66, 16);
    ctx.fillStyle = '#13332D';
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldLight;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('FESTIVE OFFER PRICE', imgX + 40, imgY + imgH - 76);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
    ctx.fillText(priceBannerText, imgX + 40, imgY + imgH - 54);
    ctx.restore();
  }

  // Secondary Angle Thumbnails (if gallery has >1 photo)
  if (Array.isArray(item.galleryUrls) && item.galleryUrls.length > 1) {
    const extraUrls = item.galleryUrls.slice(1, 4);
    const extraImgs = await Promise.all(extraUrls.map((u) => loadCanvasImage(u)));
    const thumbSize = 116;
    let tx = imgX + imgW - 20 - extraImgs.length * (thumbSize + 12) + 12;
    const ty = imgY + imgH - thumbSize - 20;
    for (const tImg of extraImgs) {
      if (!tImg) continue;
      drawImageContainFramed(ctx, tImg, tx, ty, thumbSize, thumbSize, '#FFFFFF');
      tx += thumbSize + 12;
    }
  }

  // HERO SOLID WEIGHT SEAL BANNER (Right below photo — impossible to miss!)
  const weightBarY = 958;
  ctx.save();
  const weightGrad = ctx.createLinearGradient(68, weightBarY, W - 68, weightBarY + 114);
  weightGrad.addColorStop(0, PALETTE.obsidian);
  weightGrad.addColorStop(0.6, PALETTE.charcoal);
  weightGrad.addColorStop(1, '#2D2419');
  drawRoundRect(ctx, 68, weightBarY, W - 136, 114, 20);
  ctx.fillStyle = weightGrad;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Left side of Weight Banner: Big Weight Number
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('⚖️  VERIFIED STUDIO SCALE WEIGHT', 96, weightBarY + 18);

  const matLower = String(item.material || '').toLowerCase();
  const metalSuffix =
    matLower.includes('aluminium') && matLower.includes('brass')
      ? 'Aluminium & Brass'
      : matLower.includes('iron')
      ? 'Artisan Iron'
      : matLower.includes('aluminium')
      ? 'Artisan Metalwork'
      : 'Solid Brass';

  const weightMainText =
    item.weightG > 0
      ? item.weightG >= 1000
        ? `${item.weightSpec.gramsText}  (${item.weightSpec.kgText})`
        : `${item.weightSpec.gramsText} · ${metalSuffix}`
      : `Moradabad ${metalSuffix}`;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${weightMainText.length > 20 ? 33 : 38}px Georgia, "Times New Roman", serif`;
  ctx.fillText(weightMainText, 96, weightBarY + 48);

  // Right side of Weight Banner: Quality Tier & Craft Note
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`✦ ${item.weightSpec.tier.toUpperCase()}`, W - 96, weightBarY + 24);

  ctx.fillStyle = '#D9CEBA';
  ctx.font = '19px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Moradabad Artisan Craft · Lightbox Verified', W - 96, weightBarY + 62);
  ctx.restore();

  // Product Title & Story Description
  ctx.fillStyle = PALETTE.textDark;
  ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
  ctx.textBaseline = 'top';
  const nameLines = wrapTextLines(ctx, item.name, W - 136, 2);
  let textY = 1094;
  for (const line of nameLines) {
    ctx.fillText(line, 68, textY);
    textY += 46;
  }

  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const descLines = wrapTextLines(ctx, item.description, W - 136, 3);
  textY += 6;
  for (const line of descLines) {
    ctx.fillText(line, 68, textY);
    textY += 33;
  }

  // 4-Box Specification Grid (Dimensions cm+in, Available Stock, Material/Unit, Price/Quote)
  const gridY = 1318;
  const boxW = (W - 136 - 24) / 2;
  const boxH = 152;

  function drawSpecCard(bx, by, label, primary, secondary, highlight = false) {
    ctx.save();
    drawRoundRect(ctx, bx, by, boxW, boxH, 18);
    ctx.fillStyle = highlight ? PALETTE.softSand : PALETTE.ivoryCard;
    ctx.fill();
    ctx.strokeStyle = highlight ? PALETTE.gold : PALETTE.borderGold;
    ctx.lineWidth = highlight ? 2.5 : 1.8;
    ctx.stroke();

    ctx.fillStyle = PALETTE.goldDark;
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(label.toUpperCase(), bx + 24, by + 20);

    ctx.fillStyle = PALETTE.textDark;
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const pLines = wrapTextLines(ctx, primary, boxW - 48, 1);
    ctx.fillText(pLines[0] || '—', bx + 24, by + 52);

    if (secondary) {
      ctx.fillStyle = PALETTE.textMuted;
      ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const sLines = wrapTextLines(ctx, secondary, boxW - 48, 1);
      ctx.fillText(sLines[0] || '', bx + 24, by + 98);
    }
    ctx.restore();
  }

  // Card 1: Dimensions (cm + inches)
  const dimPrimary = item.dimensionsSpec.hasDimensions
    ? item.dimensionsSpec.cmSummary
    : item.dimensionsSpec.cmSummary || 'Standard Size';
  const dimSecondary = item.dimensionsSpec.hasDimensions
    ? `Inches: ${item.dimensionsSpec.inchSummary}`
    : 'Measured at Lightbox Station';
  drawSpecCard(68, gridY, '📐 Dimensions (cm & in)', dimPrimary, dimSecondary, true);

  // Card 2: Available Stock as of Date
  const stockPrimary =
    item.quantity > 0
      ? `${item.quantity} Units Available`
      : item.stockNote || 'Available on Inquiry';
  const stockSecondary = item.stockNote && item.quantity > 0
    ? item.stockNote
    : `Verified Stock as of ${asOfDate}`;
  drawSpecCard(68 + boxW + 24, gridY, '📦 Available Warehouse Stock', stockPrimary, stockSecondary, true);

  // Card 3: Material & Unit Contents
  const matPrimary = item.material.length > 28 ? item.material.slice(0, 27) + '…' : item.material;
  const matSecondary = `Includes: ${item.unit || '1 Complete Unit'} · SKU: ${item.sku}`;
  drawSpecCard(68, gridY + boxH + 20, '🏺 Material & Contents', matPrimary, matSecondary, false);

  // Card 4: Pricing (Supports Megha's Custom Price + Note, or Show Price / MRP + Bulk / Hide Price)
  let priceLabel = '💰 Festive Price';
  let pricePrimary = 'Enquire on WhatsApp';
  let priceSecondary = 'Direct Atelier Retail & Gifting Rates';

  if (customPrice > 0) {
    priceLabel = '💰 Special Festive Quote';
    pricePrimary = `₹${customPrice.toLocaleString('en-IN')} / pc`;
    priceSecondary = customPriceNote || 'Direct Decorbeats Offer · +91 98111 33661';
  } else if (priceMode === 'show_price' && item.mrp > 0) {
    pricePrimary = `₹${Number(item.mrp).toLocaleString('en-IN')} / unit`;
    priceSecondary = 'Inclusive of Gift Box Packaging';
  } else if (priceMode === 'show_bulk' && item.mrp > 0) {
    priceLabel = '💰 Retail & Bulk Price';
    pricePrimary = `MRP ₹${Number(item.mrp).toLocaleString('en-IN')}`;
    const bPrice = item.bulkPrice || Math.round(item.mrp * 0.82);
    priceSecondary = `Bulk Rate: ₹${Number(bPrice).toLocaleString('en-IN')}`;
  } else {
    priceLabel = '💬 Direct Atelier Quote';
    pricePrimary = 'Enquire on WhatsApp';
    priceSecondary = 'Retail, Festive & Corporate Rates';
  }
  drawSpecCard(68 + boxW + 24, gridY + boxH + 20, priceLabel, pricePrimary, priceSecondary, customPrice > 0);

  // Bottom Interactive WhatsApp Inquiry & Brand Strip
  const ctaY = 1666;
  const whatsappUrl = buildProductWhatsAppUrl(item, { asOfDate, priceMode });

  ctx.save();
  drawRoundRect(ctx, 68, ctaY, W - 136, 110, 20);
  ctx.fillStyle = PALETTE.emeraldDeep;
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('📲 Tap to Reserve or Enquire on WhatsApp', 98, ctaY + 22);

  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = '21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(
    `${DECORBEATS_BRAND.phoneDisplay}  ·  ${DECORBEATS_BRAND.websiteDisplay}  ·  Bengaluru & Moradabad`,
    98,
    ctaY + 62
  );
  ctx.restore();

  // Micro footer
  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'DECORBEATS · Bengaluru Experience Center (Kodichikkanahalli) · GST: KA, TN, MH',
    W / 2,
    1818
  );

  const links = [
    {
      x: 68,
      y: ctaY,
      w: W - 136,
      h: 110,
      url: whatsappUrl
    }
  ];

  return { canvas, links };
}

/**
 * Renders Final Back Cover: Contact, Experience Center & Corporate Ordering Page (1080 × 1920)
 */
export async function renderBackCoverSlideCanvas(config = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const asOfDate =
    config.asOfDate ||
    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  ctx.fillStyle = PALETTE.obsidian;
  ctx.fillRect(0, 0, W, H);
  drawOrnamentalBorder(ctx, true);

  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('✦  DECORBEATS  ·  FESTIVE & CORPORATE ORDERING', 76, 96);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px Georgia, "Times New Roman", serif';
  ctx.fillText('Ready to Ship', 76, 142);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('Across India.', 76, 218);

  ctx.fillStyle = '#E0D6C5';
  ctx.font = '26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const leadLines = wrapTextLines(
    ctx,
    `All quantities shown in this catalogue reflect verified physical stock as of ${asOfDate}. Share your shortlisted SKUs on WhatsApp with Megha for instant stock reservation, velvet gift box customization, or GST invoicing.`,
    W - 152,
    4
  );
  let y = 312;
  for (const line of leadLines) {
    ctx.fillText(line, 76, y);
    y += 38;
  }

  const infoCards = [
    {
      label: 'DIRECT WHATSAPP & GIFTING CONCIERGE (MEGHA)',
      primary: DECORBEATS_BRAND.phoneDisplay,
      secondary: `Email: ${DECORBEATS_BRAND.email}  ·  Website: ${DECORBEATS_BRAND.websiteDisplay}`
    },
    {
      label: 'BENGALURU EXPERIENCE CENTER (WALK-INS & EXPRESS DISPATCH)',
      primary: 'Kodichikkanahalli, Bengaluru — 560076',
      secondary: DECORBEATS_BRAND.experienceCenter
    },
    {
      label: 'REGISTERED OFFICE & ARTISAN ATELIER (PITAL NAGRI)',
      primary: 'Moradabad, Uttar Pradesh — 244001',
      secondary: DECORBEATS_BRAND.registeredOffice
    },
    {
      label: 'RETAIL, FESTIVE & CORPORATE GIFTING · MULTI-STATE GST',
      primary: `GST Registered: ${DECORBEATS_BRAND.gstPresence}`,
      secondary: 'Single Pieces to Corporate Gifting · Custom Gift Boxes · Pan-India Delivery'
    }
  ];

  y = 486;
  for (const card of infoCards) {
    ctx.save();
    drawRoundRect(ctx, 72, y, W - 144, 210, 20);
    ctx.fillStyle = 'rgba(255, 253, 248, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(197, 155, 67, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(card.label, 102, y + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Georgia, "Times New Roman", serif';
    ctx.fillText(card.primary, 102, y + 68);

    ctx.fillStyle = '#D7CBB8';
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const sLines = wrapTextLines(ctx, card.secondary, W - 204, 2);
    let sy = y + 120;
    for (const sl of sLines) {
      ctx.fillText(sl, 102, sy);
      sy += 32;
    }
    ctx.restore();
    y += 234;
  }

  // Big Clickable WhatsApp Button
  const btnY = 1460;
  ctx.save();
  drawRoundRect(ctx, 72, btnY, W - 144, 130, 24);
  ctx.fillStyle = PALETTE.emeraldDeep;
  ctx.fill();
  ctx.strokeStyle = PALETTE.goldLight;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📲  Click to Chat with Decorbeats on WhatsApp', W / 2, btnY + 34);

  ctx.fillStyle = PALETTE.goldLight;
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(`${DECORBEATS_BRAND.phoneDisplay}   ·   ${DECORBEATS_BRAND.websiteDisplay}`, W / 2, btnY + 82);
  ctx.restore();

  // Bottom Tagline
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('DECORBEATS  ·  ARTISANAL BRASS DECOR, GIFTED WITH LOVE', W / 2, 1680);

  ctx.fillStyle = '#9E9385';
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('© Decorbeats (OPC) Pvt Ltd · Moradabad & Bengaluru', W / 2, 1722);

  const links = [
    {
      x: 72,
      y: btnY,
      w: W - 144,
      h: 130,
      url: `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}?text=${encodeURIComponent(
        'Hi Decorbeats! I just reviewed your Diwali Available Stock Catalogue and would like to place an order / discuss bulk gifting.'
      )}`
    },
    {
      x: 72,
      y: 486,
      w: W - 144,
      h: 210,
      url: DECORBEATS_BRAND.website
    }
  ];

  return { canvas, links };
}

async function canvasToJpegBytes(canvas, quality = 0.92) {
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas JPEG export failed'))), 'image/jpeg', quality)
  );
  return {
    blob,
    bytes: new Uint8Array(await blob.arrayBuffer())
  };
}

/**
 * Generates the complete multi-page 9:16 Diwali Available Stock PDF Catalogue in the browser
 * and triggers an immediate file download (plus returns the Blob for Web Share API).
 */
export async function generateDiwaliCataloguePdf(items, config = {}, onProgress = () => {}) {
  if (!items?.length) {
    throw new Error('Select at least one product to generate the catalogue PDF.');
  }

  const includeBrandStory = config.includeBrandStory !== false;
  const totalSteps = items.length + (includeBrandStory ? 3 : 2);
  let currentStep = 0;

  const pdfPages = [];

  // 1. Cover Page
  currentStep++;
  onProgress(`Rendering Cover Page (${currentStep}/${totalSteps})…`);
  const cover = await renderCoverSlideCanvas(items, config);
  const coverJpeg = await canvasToJpegBytes(cover.canvas, 0.92);
  pdfPages.push({
    jpegBytes: coverJpeg.bytes,
    width: W,
    height: H,
    links: cover.links
  });

  // 2. Brand & Weight Story Page
  if (includeBrandStory) {
    currentStep++;
    onProgress(`Rendering Brand & Solid Weight Story Page (${currentStep}/${totalSteps})…`);
    const story = await renderBrandStorySlideCanvas(items, config);
    const storyJpeg = await canvasToJpegBytes(story.canvas, 0.92);
    pdfPages.push({
      jpegBytes: storyJpeg.bytes,
      width: W,
      height: H,
      links: story.links
    });
  }

  // 3. Individual 9:16 Product Hero Pages
  for (let i = 0; i < items.length; i++) {
    currentStep++;
    onProgress(`Rendering Product ${i + 1} of ${items.length}: ${items[i].name}…`);
    const slide = await renderProductSlideCanvas(items[i], i + 1, items.length, config);
    const slideJpeg = await canvasToJpegBytes(slide.canvas, 0.92);
    pdfPages.push({
      jpegBytes: slideJpeg.bytes,
      width: W,
      height: H,
      links: slide.links
    });
  }

  // 4. Back Cover Contact & Ordering Page
  currentStep++;
  onProgress(`Rendering Contact & Experience Center Back Cover (${currentStep}/${totalSteps})…`);
  const back = await renderBackCoverSlideCanvas(config);
  const backJpeg = await canvasToJpegBytes(back.canvas, 0.92);
  pdfPages.push({
    jpegBytes: backJpeg.bytes,
    width: W,
    height: H,
    links: back.links
  });

  onProgress('Compiling high-resolution PDF with clickable WhatsApp links…');
  const pdfBytes = compileJpegPagesToPdf(pdfPages);
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

  const safeDate = new Date().toISOString().slice(0, 10);
  const filename = `Decorbeats-Diwali-Available-Stock-${safeDate}.pdf`;

  return {
    blob: pdfBlob,
    bytes: pdfBytes,
    filename,
    pageCount: pdfPages.length
  };
}

/**
 * Generates a single-product 9:16 Spec Card (both JPEG image and 1-page PDF) for instant WhatsApp sharing.
 */
export async function generateSingleProductCard(item, config = {}) {
  const slide = await renderProductSlideCanvas(item, 1, 1, config);
  const jpeg = await canvasToJpegBytes(slide.canvas, 0.94);
  const pdfBytes = compileJpegPagesToPdf([
    {
      jpegBytes: jpeg.bytes,
      width: W,
      height: H,
      links: slide.links
    }
  ]);
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const safeName = (item.sku || item.name || 'product').replace(/[^a-z0-9_-]/gi, '-').slice(0, 50);

  return {
    imageBlob: jpeg.blob,
    imageFilename: `Decorbeats-${safeName}-SpecCard.jpg`,
    pdfBlob,
    pdfFilename: `Decorbeats-${safeName}-DetailSheet.pdf`,
    shareText: buildProductShareText(item, config)
  };
}

/**
 * Renders a clean 9:16 Reference Frame (1080 × 1920) of the product for uploading into Google Flow (Veo).
 */
export async function generateFlowReferenceFrame(item) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Warm ambient studio gradient backdrop suitable for Google Flow video generation
  const grad = ctx.createRadialGradient(W / 2, H * 0.48, 80, W / 2, H * 0.5, W * 0.85);
  grad.addColorStop(0, '#FFFDF9');
  grad.addColorStop(0.55, '#F5EFE2');
  grad.addColorStop(1, '#E2D4BC');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const img = await loadCanvasImage(item.imageUrl);
  if (img && img.naturalWidth > 0) {
    const maxW = W * 0.82;
    const maxH = H * 0.72;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = (W - drawW) / 2;
    const drawY = (H - drawH) / 2;

    // Grounding soft shadow
    ctx.save();
    ctx.fillStyle = 'rgba(30, 22, 12, 0.16)';
    ctx.beginPath();
    ctx.ellipse(W / 2, drawY + drawH - 12, drawW * 0.36, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  const { blob } = await canvasToJpegBytes(canvas, 0.95);
  const safeName = (item.sku || item.name || 'product').replace(/[^a-z0-9_-]/gi, '-').slice(0, 50);
  return {
    blob,
    filename: `Decorbeats-Flow-Frame-9x16-${safeName}.jpg`
  };
}

/**
 * Generates an animated 6-second 9:16 Promotional Video Reel (`.webm` / `.mp4`) for an individual product
 * right in the browser using Canvas + MediaRecorder!
 * Features smooth Ken Burns zoom, animated Weight counter, Dimensions & Stock reveal, and Decorbeats branding.
 */
export async function generateProductPromoVideoReel(item, config = {}, onProgress = () => {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;

  const img = await loadCanvasImage(item.imageUrl);
  const durationMs = 5500;
  const fps = 30;
  const totalFrames = Math.round((durationMs / 1000) * fps);

  const mimeTypes = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  const supportedMime =
    (typeof MediaRecorder !== 'undefined' &&
      mimeTypes.find((m) => MediaRecorder.isTypeSupported(m))) ||
    '';

  if (!supportedMime || typeof canvas.captureStream !== 'function') {
    throw new Error('Browser video recording is not supported on this device. Use the 9:16 Spec Card or Google Flow prompt instead.');
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMime,
    videoBitsPerSecond: 4_500_000
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise((resolve) => {
    recorder.onstop = () => resolve();
  });

  // Golden bokeh particles
  const particles = Array.from({ length: 24 }, (_, idx) => ({
    x: ((idx * 137) % cw),
    y: ((idx * 293) % ch),
    r: 2 + (idx % 5) * 1.5,
    speedY: -0.4 - (idx % 4) * 0.25,
    alpha: 0.2 + (idx % 5) * 0.12
  }));

  recorder.start();

  for (let frame = 0; frame <= totalFrames; frame++) {
    const t = frame / totalFrames; // 0 -> 1
    if (frame % 15 === 0) {
      onProgress(`Rendering 9:16 promo video (${Math.round(t * 100)}%)…`);
    }

    // 1. Dark Royal Festive Backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, '#14110F');
    bgGrad.addColorStop(0.5, '#211B16');
    bgGrad.addColorStop(1, '#120F0D');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // 2. Floating Diwali Gold Bokeh Particles
    for (const p of particles) {
      const py = (p.y + frame * p.speedY * 2 + ch) % ch;
      ctx.save();
      ctx.fillStyle = `rgba(229, 200, 120, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, py, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Top Brand Header
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, 0, cw, 10);
    ctx.fillRect(0, ch - 10, cw, 10);

    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦  DECORBEATS · PITAL NAGRI MORADABAD BRASS  ✦', cw / 2, 52);

    // 4. Product Card with Smooth Ken Burns Zoom
    const cardX = 48;
    const cardY = 82;
    const cardW = cw - 96;
    const cardH = 560;

    ctx.save();
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.clip();

    if (img && img.naturalWidth > 0) {
      const zoom = 1 + 0.08 * Math.sin(t * Math.PI);
      const scale = Math.min((cardW - 40) / img.naturalWidth, (cardH - 40) / img.naturalHeight) * zoom;
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, cardX + (cardW - dw) / 2, cardY + (cardH - dh) / 2, dw, dh);
    }
    ctx.restore();

    ctx.save();
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 5. Animated Solid Weight Counter Seal
    const weightProgress = Math.min(1, t / 0.45);
    const animatedGrams = Math.round((item.weightG || 0) * weightProgress);
    const weightY = 666;

    ctx.save();
    drawRoundRect(ctx, 48, weightY, cw - 96, 102, 18);
    ctx.fillStyle = PALETTE.emeraldDeep;
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldLight;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚖️  SOLID MORADABAD BRASS WEIGHT', 72, weightY + 30);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px Georgia, serif';
    const wText =
      item.weightG > 0
        ? `${animatedGrams.toLocaleString('en-IN')} g ${
            item.weightG >= 1000 ? `(${(item.weightG / 1000).toFixed(2)} kg)` : 'Solid Casting'
          }`
        : '100% Solid Artisan Brass';
    ctx.fillText(wText, 72, weightY + 72);
    ctx.restore();

    // 6. Product Title & Specs Reveal
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'left';
    const titleLines = wrapTextLines(ctx, item.name, cw - 96, 2);
    let ty = 804;
    for (const line of titleLines) {
      ctx.fillText(line, 48, ty);
      ty += 38;
    }

    // Spec Pills (Dimensions + Available Stock)
    const specY = 900;
    ctx.save();
    drawRoundRect(ctx, 48, specY, cw - 96, 130, 18);
    ctx.fillStyle = 'rgba(255, 253, 248, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(197, 155, 67, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(
      `📐 Size: ${item.dimensionsSpec.combinedSummary}`,
      72,
      specY + 42
    );

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const stockLine =
      item.quantity > 0
        ? `📦 Available Stock: ${item.quantity} Units Ready to Dispatch`
        : '📦 Available for Festive Ordering';
    ctx.fillText(stockLine, 72, specY + 86);
    ctx.restore();

    // 7. Bottom Brand & WhatsApp Callout
    const footY = 1068;
    ctx.save();
    drawRoundRect(ctx, 48, footY, cw - 96, 148, 20);
    ctx.fillStyle = PALETTE.charcoal;
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.goldLight;
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORDER / ENQUIRE ON WHATSAPP', cw / 2, footY + 38);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(DECORBEATS_BRAND.phoneDisplay, cw / 2, footY + 78);

    ctx.fillStyle = '#D7CBB8';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`${DECORBEATS_BRAND.websiteDisplay} · Bengaluru Experience Center`, cw / 2, footY + 116);
    ctx.restore();

    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  await stopPromise;

  const ext = supportedMime.includes('mp4') ? 'mp4' : 'webm';
  const videoBlob = new Blob(chunks, { type: supportedMime });
  const safeName = (item.sku || item.name || 'product').replace(/[^a-z0-9_-]/gi, '-').slice(0, 50);

  return {
    blob: videoBlob,
    filename: `Decorbeats-Reel-${safeName}.${ext}`,
    mimeType: supportedMime
  };
}
