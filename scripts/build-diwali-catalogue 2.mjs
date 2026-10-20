/**
 * Decorbeats CLI — Diwali 9:16 Mobile Stock Catalogue PDF & Google Flow Pack Builder
 *
 * Usage:
 *   node scripts/build-diwali-catalogue.mjs [--price-mode=show_price|show_bulk|hide_price] [--limit=24]
 *
 * Pulls live `products` and `capture_drafts` from Supabase (or fallback seed catalog),
 * renders 1080×1920 (9:16) pages with Sharp, compiles the clickable multi-page PDF,
 * exports individual 9:16 spec cards, and writes Google Flow 10s video prompts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import {
  DECORBEATS_BRAND,
  buildMergedCataloguePool,
  buildProductWhatsAppUrl,
  compileJpegPagesToPdf,
  generateGoogleFlowPrompt,
  normalizeCatalogueItem
} from '../src/capture/catalogueGenerator.js';
import { products as seedProducts } from '../src/data/products.js';
import { syncWhatsAppGroupCaptures } from './sync-whatsapp-catalogue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const sharpPath = require.resolve('sharp', {
  paths: [
    path.join(rootDir, 'node_modules'),
    '/Users/k0d3/Documents/Codex Testing/node_modules',
    '/opt/homebrew/lib/node_modules'
  ]
});
export const sharp = require(sharpPath);

function loadEnv() {
  const envFile = path.join(rootDir, '.env.local');
  if (!fs.existsSync(envFile)) return {};
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) {
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

/**
 * Strips color emoji codepoints that cause macOS Pango/librsvg to fail font fallback,
 * then XML-escapes the string for SVG `<text>`.
 */
export function esc(str) {
  return String(str ?? '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function wrapChars(text, maxCharsPerLine = 44, maxLines = 3) {
  const words = String(text || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    if ((current + ' ' + words[i]).length <= maxCharsPerLine) {
      current += ' ' + words[i];
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(' ');
        lines.push(
          rest.length > maxCharsPerLine
            ? rest.slice(0, maxCharsPerLine - 1).trim() + '...'
            : rest
        );
        return lines;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

export async function fetchImageBuffer(urlOrPath, targetW, targetH) {
  try {
    let rawBuf = null;
    if (!urlOrPath) return null;
    if (urlOrPath.startsWith('data:image/')) {
      const base64Part = urlOrPath.split(',')[1];
      if (base64Part) rawBuf = Buffer.from(base64Part, 'base64');
    } else if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      const res = await fetch(urlOrPath, { signal: AbortSignal.timeout(7000) });
      if (!res.ok) return null;
      rawBuf = Buffer.from(await res.arrayBuffer());
    } else {
      const cleanRel = urlOrPath.replace(/^\/+/, '');
      const candidates = [
        urlOrPath,
        path.join(rootDir, 'public', cleanRel),
        path.join(rootDir, cleanRel)
      ];
      for (const c of candidates) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          rawBuf = fs.readFileSync(c);
          break;
        }
      }
    }
    if (!rawBuf) return null;
    return await sharp(rawBuf)
      .resize(targetW, targetH, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

const W = 1080;
const H = 1920;

export async function renderCoverJpeg(items, config) {
  const totalUnits = items.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const titleLines = wrapChars(config.title.toUpperCase(), 32, 2);
  const subLines = wrapChars(config.subtitle, 54, 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="510" fill="#161311"/>
    <rect y="510" width="${W}" height="12" fill="#C59B43"/>
    <rect width="${W}" height="18" fill="#C59B43"/>
    <rect y="${H - 18}" width="${W}" height="18" fill="#C59B43"/>
    <rect x="28" y="38" width="${W - 56}" height="${H - 76}" rx="20" fill="none" stroke="#C59B43" stroke-opacity="0.45" stroke-width="1.5"/>

    <rect x="72" y="68" width="580" height="44" rx="22" fill="#2A2218" stroke="#C59B43" stroke-width="1.5"/>
    <text x="96" y="96" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#E5C878">THE BRASS HOUSE OF INDIA · MORADABAD &amp; BENGALURU</text>

    <text x="72" y="196" font-family="Georgia, serif" font-size="74" font-weight="bold" fill="#FAF6EE">DECORBEATS</text>
    ${titleLines
      .map(
        (l, idx) =>
          `<text x="72" y="${258 + idx * 42}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#E5C878">${esc(l)}</text>`
      )
      .join('')}
    ${subLines
      .map(
        (l, idx) =>
          `<text x="72" y="${346 + idx * 32}" font-family="Arial, sans-serif" font-size="23" fill="#D7CBB8">${esc(l)}</text>`
      )
      .join('')}

    <rect x="72" y="414" width="${W - 144}" height="68" rx="16" fill="#13332D" stroke="#C59B43" stroke-width="1.5"/>
    <circle cx="104" cy="448" r="7" fill="#E5C878"/>
    <text x="122" y="456" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#FFFFFF">AVAILABLE STOCK AS OF ${esc(config.asOfDate.toUpperCase())}</text>
    <text x="${W - 98}" y="456" text-anchor="end" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#E5C878">${items.length} Designs · ${totalUnits} Ready Units</text>

    <!-- 6 Collage Frames -->
    ${[0, 1, 2, 3, 4, 5]
      .map((idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 72 + col * (452 + 32);
        const y = 562 + row * (340 + 28);
        return `<rect x="${x}" y="${y}" width="452" height="340" rx="20" fill="#FFFFFF" stroke="#D8C398" stroke-width="2.5"/>`;
      })
      .join('')}

    <!-- Footer Brand Box -->
    <rect x="72" y="1668" width="${W - 144}" height="186" rx="20" fill="#211D1A" stroke="#C59B43" stroke-width="2"/>
    <text x="100" y="1708" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#E5C878">BENGALURU EXPERIENCE CENTER  ·  MORADABAD ATELIER  ·  PAN-INDIA DISPATCH</text>
    <text x="100" y="1752" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#FFFFFF">WhatsApp / Call: ${esc(DECORBEATS_BRAND.phoneDisplay)}</text>
    <text x="100" y="1792" font-family="Arial, sans-serif" font-size="20" fill="#E0D6C5">Email: ${esc(DECORBEATS_BRAND.email)}   |   Web: ${esc(DECORBEATS_BRAND.websiteDisplay)}</text>
    <text x="100" y="1828" font-family="Arial, sans-serif" font-size="19" fill="#E0D6C5">Kodichikkanahalli, Bengaluru — 560076  ·  GST: ${esc(DECORBEATS_BRAND.gstPresence)}</text>
  </svg>`;

  const composites = [];
  const gridItems = items.slice(0, 6);
  const gridBuffers = await Promise.all(
    gridItems.map((item) => fetchImageBuffer(item.imageUrl, 412, 260))
  );

  for (let idx = 0; idx < gridItems.length; idx++) {
    const item = gridItems[idx];
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 72 + col * (452 + 32);
    const y = 562 + row * (340 + 28);

    const imgBuf = gridBuffers[idx];
    if (imgBuf) {
      composites.push({ input: imgBuf, left: x + 20, top: y + 16 });
    }
    const shortName = item.name.length > 24 ? item.name.slice(0, 22) + '...' : item.name;
    const wTag = item.weightG > 0 ? item.weightSpec.gramsText : 'Solid Brass';
    const labelSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="424" height="50">
        <rect width="424" height="50" rx="12" fill="#161311" fill-opacity="0.92"/>
        <text x="16" y="31" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF">${esc(shortName)}</text>
        <text x="408" y="31" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#E5C878">${esc(wTag)}</text>
      </svg>`
    );
    composites.push({ input: labelSvg, left: x + 14, top: y + 276 });
  }

  const jpegBuffer = await sharp(Buffer.from(svg))
    .composite(composites)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return {
    jpegBytes: new Uint8Array(jpegBuffer),
    width: W,
    height: H,
    links: [
      {
        x: 72,
        y: 1668,
        w: W - 144,
        h: 186,
        url: `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}`
      }
    ]
  };
}

export async function renderStoryJpeg() {
  const pillars = [
    {
      badge: '01 · VERIFIED STUDIO WEIGHT — HONEST METALCRAFT',
      title: 'Every Gram is Verified on Our Lightbox Scale',
      body: 'When you hold a Decorbeats brass thali, diya platter, or artisan metal tray, you immediately feel the reassuring heft of authentic Moradabad metalwork. Every piece in this catalogue is weighed on our digital studio scale right at the lightbox station.'
    },
    {
      badge: '02 · HERITAGE ARTISANS OF PITAL NAGRI, MORADABAD',
      title: 'Handcrafted & Inspected Across Multiple Angles',
      body: 'Each motif — from Meenakari twin-peacock engravings and solid brass lotus diyas to Kalamkari & Pichwai jali trays — is crafted in our Moradabad atelier and photographed from multiple angles in our Bengaluru warehouse.'
    },
    {
      badge: '03 · RETAIL, FESTIVE & CORPORATE GIFTING EXCELLENCE',
      title: 'Single Pieces to Bulk · Custom Boxes · Multi-State GST',
      body: 'Whether you are choosing festive accents for your home or curating auspicious Deepawali gifts for clients, friends, and teams, we offer custom gift packaging, GST billing across KA, TN & MH, and express dispatch from Bengaluru.'
    }
  ];

  const introLines = wrapChars(
    'Born in Moradabad (Pital Nagri) and backed by our Bengaluru Experience Center, every Decorbeats creation is crafted by master artisans. In authentic Indian metalcraft, true gram weight and exact dimensions are the ultimate signature of quality and value.',
    74,
    4
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#161311"/>
    <rect width="${W}" height="18" fill="#C59B43"/>
    <rect y="${H - 18}" width="${W}" height="18" fill="#C59B43"/>
    <rect x="28" y="38" width="${W - 56}" height="${H - 76}" rx="20" fill="none" stroke="#C59B43" stroke-opacity="0.35" stroke-width="1.5"/>

    <text x="76" y="106" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#E5C878">THE DECORBEATS CRAFTSMANSHIP PROMISE</text>
    <text x="76" y="182" font-family="Georgia, serif" font-size="62" font-weight="bold" fill="#FAF6EE">Craft Never Lies.</text>
    <text x="76" y="256" font-family="Georgia, serif" font-size="62" font-weight="bold" fill="#C59B43">Why Weight Matters.</text>

    ${introLines
      .map(
        (l, idx) =>
          `<text x="76" y="${324 + idx * 36}" font-family="Arial, sans-serif" font-size="24" fill="#E2D8C5">${esc(l)}</text>`
      )
      .join('')}

    ${pillars
      .map((p, idx) => {
        const y = 478 + idx * 332;
        const bLines = wrapChars(p.body, 74, 4);
        return `
          <rect x="72" y="${y}" width="${W - 144}" height="305" rx="22" fill="#221D19" stroke="#C59B43" stroke-opacity="0.6" stroke-width="2"/>
          <text x="104" y="${y + 46}" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#E5C878">${esc(p.badge)}</text>
          <text x="104" y="${y + 92}" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="#FFFFFF">${esc(p.title)}</text>
          ${bLines
            .map(
              (bl, bIdx) =>
                `<text x="104" y="${y + 142 + bIdx * 34}" font-family="Arial, sans-serif" font-size="22" fill="#D9CEBA">${esc(bl)}</text>`
            )
            .join('')}
        `;
      })
      .join('')}

    <rect x="72" y="1500" width="${W - 144}" height="340" rx="22" fill="#13332D" stroke="#C59B43" stroke-width="2"/>
    <text x="104" y="1552" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#E5C878">HOW TO READ EVERY PRODUCT PAGE IN THIS CATALOGUE</text>
    <text x="104" y="1606" font-family="Arial, sans-serif" font-size="22" fill="#FFFFFF">• STUDIO WEIGHT SEAL: Exact net weight in grams &amp; kg measured on our lightbox scale.</text>
    <text x="104" y="1658" font-family="Arial, sans-serif" font-size="22" fill="#FFFFFF">• TRUE DIMENSIONS: Complete Height x Width x Depth in both cm and inches.</text>
    <text x="104" y="1710" font-family="Arial, sans-serif" font-size="22" fill="#FFFFFF">• LIVE WAREHOUSE STOCK: Verified ready-to-ship units physically counted in warehouse.</text>
    <text x="104" y="1762" font-family="Arial, sans-serif" font-size="22" fill="#FFFFFF">• 1-TAP WHATSAPP ORDERING: Tap any product page button to enquire or reserve stock.</text>
  </svg>`;

  const jpegBuffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return {
    jpegBytes: new Uint8Array(jpegBuffer),
    width: W,
    height: H,
    links: []
  };
}

export async function renderProductJpeg(item, index, totalCount, config) {
  const priceMode = config.priceMode || 'hide_price';
  const asOfDate = config.asOfDate;

  const matLower = String(item.material || '').toLowerCase();
  const hasBrass = matLower.includes('brass');
  const hasIron = matLower.includes('iron');
  const hasOtherMetal = matLower.includes('aluminium') || matLower.includes('metal') || hasIron;
  const metalSuffix =
    hasOtherMetal && hasBrass
      ? 'Metal & Solid Brass'
      : hasIron && !hasBrass
      ? 'Artisan Iron'
      : hasOtherMetal && !hasBrass
      ? 'Artisan Metalwork'
      : 'Solid Brass';

  const weightRightTier =
    hasOtherMetal && hasBrass
      ? 'CAST METAL & SOLID BRASS'
      : hasIron && !hasBrass
      ? 'HANDCRAFTED ARTISAN IRON'
      : hasOtherMetal && !hasBrass
      ? 'HANDCRAFTED ARTISAN METALWORK'
      : item.weightSpec.tier.toUpperCase();

  const weightMainText =
    item.weightG > 0
      ? item.weightG >= 1000
        ? `${item.weightSpec.gramsText}  (${item.weightSpec.kgText})`
        : `${item.weightSpec.gramsText} · ${metalSuffix}`
      : matLower.includes('heavy')
      ? 'Heavy Gauge · Metalcraft'
      : `Moradabad ${metalSuffix}`;
  const weightFontSize = weightMainText.length > 22 ? 32 : 36;

  const nameLines = wrapChars(item.name, 40, 2);
  const descLines = wrapChars(item.description, 70, 3);

  const dimPrimary = item.dimensionsSpec.hasDimensions
    ? item.dimensionsSpec.cmSummary.replace(/×/g, 'x')
    : (item.dimensionsSpec.cmSummary || 'Standard Size').replace(/×/g, 'x');
  const dimSecondary = item.dimensionsSpec.hasDimensions
    ? `Inches: ${item.dimensionsSpec.inchSummary.replace(/×/g, 'x')}`
    : 'Measured at Lightbox Station';

  const stockPrimary =
    item.quantity > 0
      ? `${item.quantity} ${item.quantity === 1 ? 'Unit' : 'Units'} Available`
      : item.stockNote
      ? 'Stock Count in Progress'
      : 'Available on Inquiry';
  const stockSecondary = item.stockNote
    ? item.stockNote
    : `Verified Stock as of ${asOfDate}`;

  const matPrimary =
    item.material.length > 30 ? item.material.slice(0, 28) + '...' : item.material;
  const matSecondary = `${item.unit || '1 Unit'} · SKU: ${item.sku}`;

  let priceLabel = 'FESTIVE PRICE';
  let pricePrimary = 'Enquire on WhatsApp';
  let priceSecondary = 'Retail, Festive & Corporate Rates';
  if (priceMode === 'show_price' && item.mrp > 0) {
    pricePrimary = `INR ${Number(item.mrp).toLocaleString('en-IN')} / unit`;
    priceSecondary = 'Inclusive of Gift Packaging';
  } else if (priceMode === 'show_bulk' && item.mrp > 0) {
    priceLabel = 'RETAIL & BULK PRICE';
    pricePrimary = `MRP INR ${Number(item.mrp).toLocaleString('en-IN')}`;
    const bPrice = item.bulkPrice || Math.round(item.mrp * 0.82);
    priceSecondary = `Bulk Rate: INR ${Number(bPrice).toLocaleString('en-IN')}`;
  } else {
    priceLabel = 'DIRECT ATELIER QUOTE';
    pricePrimary = 'Enquire on WhatsApp';
    priceSecondary = 'Retail, Festive & Corporate Gifting';
  }

  const boxW = (W - 136 - 24) / 2;
  const boxH = 152;
  const gridY = 1318;

  const extraGalleryUrls = Array.isArray(item.galleryUrls)
    ? item.galleryUrls.slice(1, 4)
    : [];
  const hasMultiAngles = extraGalleryUrls.length > 0;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="18" fill="#C59B43"/>
    <rect y="${H - 18}" width="${W}" height="18" fill="#C59B43"/>
    <rect x="28" y="38" width="${W - 56}" height="${H - 76}" rx="20" fill="none" stroke="#C59B43" stroke-opacity="0.45" stroke-width="1.5"/>

    <text x="68" y="78" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#211D1A">DECORBEATS  ·  THE BRASS HOUSE OF INDIA</text>
    <rect x="${W - 220}" y="48" width="152" height="46" rx="23" fill="#211D1A"/>
    <text x="${W - 144}" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#E5C878">ITEM ${String(index).padStart(2, '0')} / ${String(totalCount).padStart(2, '0')}</text>
    <rect x="68" y="108" width="${W - 136}" height="2" fill="#D8C398"/>

    <!-- Hero Image Frame -->
    <rect x="68" y="128" width="${W - 136}" height="810" rx="24" fill="#FFFFFF" stroke="#D8C398" stroke-width="2.5"/>
    ${
      hasMultiAngles
        ? `<line x1="742" y1="204" x2="742" y2="918" stroke="#E5D5B5" stroke-width="2" stroke-dasharray="6,6"/>`
        : ''
    }

    <!-- HERO SOLID WEIGHT SEAL BANNER -->
    <rect x="68" y="958" width="${W - 136}" height="114" rx="20" fill="#181512" stroke="#C59B43" stroke-width="2.5"/>
    <text x="96" y="992" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#E5C878">VERIFIED STUDIO SCALE WEIGHT</text>
    <text x="96" y="1044" font-family="Georgia, serif" font-size="${weightFontSize}" font-weight="bold" fill="#FFFFFF">${esc(weightMainText)}</text>
    <text x="${W - 96}" y="998" text-anchor="end" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#E5C878">${esc(weightRightTier)}</text>
    <text x="${W - 96}" y="1038" text-anchor="end" font-family="Arial, sans-serif" font-size="19" fill="#D9CEBA">Moradabad Artisan Craft · Lightbox Verified</text>

    <!-- Title & Description -->
    ${nameLines
      .map(
        (l, idx) =>
          `<text x="68" y="${1130 + idx * 46}" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="#1E1A17">${esc(l)}</text>`
      )
      .join('')}
    ${descLines
      .map(
        (l, idx) =>
          `<text x="68" y="${1130 + nameLines.length * 46 + 10 + idx * 33}" font-family="Arial, sans-serif" font-size="22" fill="#63584E">${esc(l)}</text>`
      )
      .join('')}

    <!-- 4 Spec Cards -->
    <!-- Card 1: Dimensions -->
    <rect x="68" y="${gridY}" width="${boxW}" height="${boxH}" rx="18" fill="#F2E9D8" stroke="#C59B43" stroke-width="2.5"/>
    <text x="92" y="${gridY + 38}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#8F6B24">DIMENSIONS (CM &amp; IN)</text>
    <text x="92" y="${gridY + 84}" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#1E1A17">${esc(dimPrimary)}</text>
    <text x="92" y="${gridY + 124}" font-family="Arial, sans-serif" font-size="20" fill="#63584E">${esc(dimSecondary)}</text>

    <!-- Card 2: Available Stock -->
    <rect x="${68 + boxW + 24}" y="${gridY}" width="${boxW}" height="${boxH}" rx="18" fill="#F2E9D8" stroke="#C59B43" stroke-width="2.5"/>
    <text x="${92 + boxW + 24}" y="${gridY + 38}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#8F6B24">AVAILABLE WAREHOUSE STOCK</text>
    <text x="${92 + boxW + 24}" y="${gridY + 84}" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#1E1A17">${esc(stockPrimary)}</text>
    <text x="${92 + boxW + 24}" y="${gridY + 124}" font-family="Arial, sans-serif" font-size="18" fill="#63584E">${esc(stockSecondary.slice(0, 50))}</text>

    <!-- Card 3: Material & Contents -->
    <rect x="68" y="${gridY + boxH + 20}" width="${boxW}" height="${boxH}" rx="18" fill="#FFFDF9" stroke="#D8C398" stroke-width="1.8"/>
    <text x="92" y="${gridY + boxH + 58}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#8F6B24">MATERIAL &amp; CONTENTS</text>
    <text x="92" y="${gridY + boxH + 104}" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#1E1A17">${esc(matPrimary)}</text>
    <text x="92" y="${gridY + boxH + 144}" font-family="Arial, sans-serif" font-size="18" fill="#63584E">${esc(matSecondary.slice(0, 50))}</text>

    <!-- Card 4: Pricing -->
    <rect x="${68 + boxW + 24}" y="${gridY + boxH + 20}" width="${boxW}" height="${boxH}" rx="18" fill="#FFFDF9" stroke="#D8C398" stroke-width="1.8"/>
    <text x="${92 + boxW + 24}" y="${gridY + boxH + 58}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#8F6B24">${esc(priceLabel)}</text>
    <text x="${92 + boxW + 24}" y="${gridY + boxH + 104}" font-family="Arial, sans-serif" font-size="25" font-weight="bold" fill="#1E1A17">${esc(pricePrimary)}</text>
    <text x="${92 + boxW + 24}" y="${gridY + boxH + 144}" font-family="Arial, sans-serif" font-size="19" fill="#63584E">${esc(priceSecondary)}</text>

    <!-- Bottom Interactive WhatsApp Inquiry Bar -->
    <rect x="68" y="1666" width="${W - 136}" height="110" rx="20" fill="#13332D" stroke="#C59B43" stroke-width="2"/>
    <text x="98" y="1712" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#FFFFFF">Tap to Reserve or Enquire on WhatsApp</text>
    <text x="98" y="1752" font-family="Arial, sans-serif" font-size="21" fill="#E5C878">${esc(DECORBEATS_BRAND.phoneDisplay)}  ·  ${esc(DECORBEATS_BRAND.websiteDisplay)}  ·  Bengaluru &amp; Moradabad</text>

    <text x="${W / 2}" y="1822" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#63584E">DECORBEATS · Bengaluru Experience Center (Kodichikkanahalli) · GST: KA, TN, MH</text>
  </svg>`;

  const composites = [];
  if (hasMultiAngles) {
    const heroBuf = await fetchImageBuffer(item.imageUrl, 636, 710);
    if (heroBuf) {
      composites.push({ input: heroBuf, left: 88, top: 204 });
    }
    const extraBufs = await Promise.all(
      extraGalleryUrls.map((u) => fetchImageBuffer(u, 224, 184))
    );
    const angleLabels = ['ANGLE 2 · DETAIL', 'ANGLE 3 · PROFILE', 'ANGLE 4 · SCALE'];
    for (let aIdx = 0; aIdx < extraBufs.length; aIdx++) {
      const aBuf = extraBufs[aIdx];
      if (!aBuf) continue;
      const topY = 204 + aIdx * 238;
      const cardSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="228">
          <rect x="1" y="1" width="238" height="226" rx="14" fill="none" stroke="#C59B43" stroke-width="2"/>
          <rect x="8" y="194" width="224" height="26" rx="8" fill="#161311" fill-opacity="0.9"/>
          <text x="120" y="212" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#E5C878">${esc(angleLabels[aIdx] || 'DETAIL VIEW')}</text>
        </svg>`
      );
      composites.push({ input: aBuf, left: 762, top: topY + 6 });
      composites.push({ input: cardSvg, left: 754, top: topY });
    }
  } else {
    const heroBuf = await fetchImageBuffer(item.imageUrl, W - 184, 710);
    if (heroBuf) {
      composites.push({ input: heroBuf, left: 92, top: 204 });
    }
  }

  // Top-left SKU badge & Top-right Stock badge overlaid on image header strip
  const skuLabel = `${item.sku}  ·  ${item.category.toUpperCase()}`.slice(0, 42);
  const stockBadgeText =
    item.quantity > 0
      ? `${item.quantity} IN STOCK`
      : item.stockNote
      ? 'ENQUIRE STOCK'
      : 'MADE TO ORDER';
  const badgesOverlaySvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W - 136}" height="82">
      <rect x="20" y="18" width="490" height="48" rx="14" fill="#161311" fill-opacity="0.92"/>
      <text x="38" y="49" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#E5C878">${esc(skuLabel)}</text>

      <rect x="${W - 136 - 270}" y="18" width="250" height="50" rx="14" fill="${item.quantity > 0 ? '#17423A' : '#211D1A'}" stroke="#E5C878" stroke-width="1.5"/>
      <text x="${W - 136 - 145}" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">${esc(stockBadgeText)}</text>
    </svg>`
  );
  composites.push({ input: badgesOverlaySvg, left: 68, top: 128 });

  const jpegBuffer = await sharp(Buffer.from(svg))
    .composite(composites)
    .jpeg({ quality: 91, mozjpeg: true })
    .toBuffer();

  return {
    jpegBytes: new Uint8Array(jpegBuffer),
    width: W,
    height: H,
    links: [
      {
        x: 68,
        y: 1666,
        w: W - 136,
        h: 110,
        url: buildProductWhatsAppUrl(item, config)
      }
    ]
  };
}

export async function renderBackCoverJpeg(config) {
  const leadLines = wrapChars(
    `All quantities shown in this catalogue reflect verified physical stock as of ${config.asOfDate}. Share your shortlisted SKUs on WhatsApp with Megha for instant stock reservation, velvet gift box customization, or GST invoicing.`,
    64,
    3
  );

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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#161311"/>
    <rect width="${W}" height="18" fill="#C59B43"/>
    <rect y="${H - 18}" width="${W}" height="18" fill="#C59B43"/>
    <rect x="28" y="38" width="${W - 56}" height="${H - 76}" rx="20" fill="none" stroke="#C59B43" stroke-opacity="0.35" stroke-width="1.5"/>

    <text x="76" y="116" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#E5C878">DECORBEATS  ·  FESTIVE &amp; CORPORATE ORDERING</text>
    <text x="76" y="192" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#FFFFFF">Ready to Ship</text>
    <text x="76" y="268" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#C59B43">Across India.</text>

    ${leadLines
      .map(
        (l, idx) =>
          `<text x="76" y="${336 + idx * 36}" font-family="Arial, sans-serif" font-size="25" fill="#E0D6C5">${esc(l)}</text>`
      )
      .join('')}

    ${infoCards
      .map((c, idx) => {
        const y = 486 + idx * 234;
        const sLines = wrapChars(c.secondary, 68, 2);
        return `
          <rect x="72" y="${y}" width="${W - 144}" height="210" rx="20" fill="#221D19" stroke="#C59B43" stroke-opacity="0.55" stroke-width="2"/>
          <text x="102" y="${y + 46}" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#E5C878">${esc(c.label)}</text>
          <text x="102" y="${y + 96}" font-family="Georgia, serif" font-size="31" font-weight="bold" fill="#FFFFFF">${esc(c.primary)}</text>
          ${sLines
            .map(
              (sl, sIdx) =>
                `<text x="102" y="${y + 144 + sIdx * 30}" font-family="Arial, sans-serif" font-size="21" fill="#D7CBB8">${esc(sl)}</text>`
            )
            .join('')}
        `;
      })
      .join('')}

    <rect x="72" y="1460" width="${W - 144}" height="130" rx="24" fill="#13332D" stroke="#E5C878" stroke-width="3"/>
    <text x="${W / 2}" y="1518" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#FFFFFF">Click to Chat with Decorbeats on WhatsApp</text>
    <text x="${W / 2}" y="1564" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" fill="#E5C878">${esc(DECORBEATS_BRAND.phoneDisplay)}   ·   ${esc(DECORBEATS_BRAND.websiteDisplay)}</text>

    <text x="${W / 2}" y="1690" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#C59B43">DECORBEATS  ·  ARTISANAL BRASS DECOR, GIFTED WITH LOVE</text>
    <text x="${W / 2}" y="1732" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#9E9385">(c) Decorbeats (OPC) Pvt Ltd · Moradabad &amp; Bengaluru</text>
  </svg>`;

  const jpegBuffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return {
    jpegBytes: new Uint8Array(jpegBuffer),
    width: W,
    height: H,
    links: [
      {
        x: 72,
        y: 1460,
        w: W - 144,
        h: 130,
        url: `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}`
      }
    ]
  };
}

export async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [k, v] = arg.replace(/^--/, '').split('=');
      return [k, v ?? 'true'];
    })
  );

  // Sync latest captures from DecorBeats Marketing WhatsApp group if DB is accessible
  try {
    syncWhatsAppGroupCaptures();
  } catch (err) {
    console.warn('WhatsApp sync skipped:', err.message);
  }

  const priceMode = args['price-mode'] || 'hide_price';
  const sourceMode = args.source || 'whatsapp';
  const maxItems = Number(args.limit) || 500;
  const asOfDate =
    args.date ||
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

  let localDrafts = [];
  const localDraftsPath = path.join(rootDir, 'public', 'catalogues', 'lightbox-captures.json');
  if (fs.existsSync(localDraftsPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(localDraftsPath, 'utf8'));
      if (Array.isArray(parsed)) localDrafts = parsed;
    } catch {
      // ignore invalid json
    }
  }

  let itemsToRender = [];

  if (sourceMode === 'whatsapp' && localDrafts.length > 0) {
    // Preserve exact chronological order from top to bottom of today's WhatsApp group shoot
    itemsToRender = localDrafts
      .map((d) => normalizeCatalogueItem(d, 'draft'))
      .filter((x) => x && x.imageUrl)
      .slice(0, maxItems);
  } else {
    const env = loadEnv();
    const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY;

    let products = [];
    let drafts = [...localDrafts];

    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        const [pRes, dRes] = await Promise.all([
          client.from('products').select('*').is('archived_at', null).order('name'),
          client
            .from('capture_drafts')
            .select(
              'id, sku, name, category, description, material, unit, mrp, bulk_price, weight_g, length_cm, width_cm, height_cm, quantity, status, location, primary_photo, photos, cleaned_photos, updated_at'
            )
            .order('updated_at', { ascending: false })
            .limit(60)
        ]);
        if (pRes.data?.length) products = pRes.data;
        if (dRes.data?.length) {
          drafts = [...localDrafts, ...dRes.data.filter((d) => !localDrafts.some((ld) => ld.id === d.id))];
        }
      } catch (e) {
        console.warn('Supabase fetch warning, falling back to local catalog:', e.message);
      }
    }

    if (!products.length) {
      products = seedProducts;
    }

    const mergedPool = buildMergedCataloguePool(products, drafts);
    const selected = mergedPool
      .filter((x) => x.imageUrl && (x.quantity > 0 || x.source !== 'inventory'))
      .slice(0, maxItems);

    itemsToRender = selected.length ? selected : mergedPool.slice(0, maxItems);
  }

  const config = {
    title: 'DEEPAWALI 2026 · AVAILABLE STOCK & GIFTING EDIT',
    subtitle:
      'Handcrafted Moradabad Brass & Festive Metalwork · Verified Stock, Weight & Dimensions',
    asOfDate,
    priceMode
  };

  const outDir = path.join(rootDir, 'public', 'catalogues');
  const cardsDir = path.join(outDir, 'cards');
  fs.mkdirSync(cardsDir, { recursive: true });
  for (const oldFile of fs.readdirSync(cardsDir)) {
    if (oldFile.endsWith('.jpg')) {
      fs.unlinkSync(path.join(cardsDir, oldFile));
    }
  }

  console.log(`Rendering Decorbeats Diwali 9:16 Mobile Stock Catalogue (${itemsToRender.length} products)...`);

  const pages = [];
  const coverPage = await renderCoverJpeg(itemsToRender, config);
  pages.push(coverPage);
  fs.writeFileSync(path.join(cardsDir, '00-Cover.jpg'), Buffer.from(coverPage.jpegBytes));

  const storyPage = await renderStoryJpeg();
  pages.push(storyPage);
  fs.writeFileSync(path.join(cardsDir, '00-Brand-Weight-Story.jpg'), Buffer.from(storyPage.jpegBytes));

  const flowPrompts = [];

  for (let i = 0; i < itemsToRender.length; i++) {
    const item = itemsToRender[i];
    const prodPage = await renderProductJpeg(item, i + 1, itemsToRender.length, config);
    pages.push(prodPage);

    const safeSlug = `${String(i + 1).padStart(2, '0')}-${(item.sku || item.name)
      .replace(/[^a-z0-9_-]/gi, '-')
      .slice(0, 40)}`;
    fs.writeFileSync(path.join(cardsDir, `${safeSlug}.jpg`), Buffer.from(prodPage.jpegBytes));

    flowPrompts.push({
      sku: item.sku,
      name: item.name,
      weight: item.weightSpec.shortLabel,
      dimensions: item.dimensionsSpec.combinedSummary,
      quantityAvailable: item.quantity,
      stockNote: item.stockNote || '',
      cardImage: `/catalogues/cards/${safeSlug}.jpg`,
      googleFlow: generateGoogleFlowPrompt(item, 'festive_diwali')
    });
  }

  const backPage = await renderBackCoverJpeg(config);
  pages.push(backPage);
  fs.writeFileSync(path.join(cardsDir, '99-Back-Cover.jpg'), Buffer.from(backPage.jpegBytes));

  const pdfBytes = compileJpegPagesToPdf(pages);
  const pdfPath = path.join(outDir, 'Decorbeats-Diwali-Available-Stock-2026.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));

  const promptsPath = path.join(outDir, 'google-flow-prompts.json');
  fs.writeFileSync(promptsPath, JSON.stringify(flowPrompts, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        pdfPath,
        pdfBytes: pdfBytes.length,
        totalPages: pages.length,
        productsIncluded: itemsToRender.length,
        cardsDir,
        promptsPath
      },
      null,
      2
    )
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
