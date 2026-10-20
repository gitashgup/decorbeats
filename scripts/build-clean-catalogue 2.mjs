/**
 * Decorbeats CLI — Ultra-Clean "Picture + Weight + Size ONLY" Catalogue Generator
 *
 * Requested by Megha & Boss:
 *   "Dibi can you make a catalogue where i want photos weight and size that it
 *    a clean and easy to understand catalogue with picture size and weight that's it"
 *   Tagline: "Decorbeats - The Brass House of India"
 *
 * Generates:
 *   1. `public/catalogues/Decorbeats-Clean-Catalogue-2026.pdf` (1-Up Full-Screen: Huge Photo + Weight + Size ONLY)
 *   2. `public/catalogues/Decorbeats-Quick-Lookbook-Grid-2026.pdf` (4-Up Per Page Compact PDF: Photo + Weight + Size ONLY, 15 pages)
 *   3. Also updates `public/catalogues/Decorbeats-Diwali-Available-Stock-2026.pdf` and `public/catalogues/cards/*.jpg`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DECORBEATS_BRAND,
  compileJpegPagesToPdf,
  normalizeCatalogueItem
} from '../src/capture/catalogueGenerator.js';
import { sharp, esc, wrapChars, fetchImageBuffer } from './build-diwali-catalogue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const W = 1080;
const H = 1920;

/**
 * Clean Minimal Cover Page: "DECORBEATS — The Brass House of India" + 6 Hero Product Photos
 */
async function renderCleanCoverJpeg(items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="380" fill="#161311"/>
    <rect y="380" width="${W}" height="10" fill="#C59B43"/>
    <rect width="${W}" height="16" fill="#C59B43"/>
    <rect y="${H - 16}" width="${W}" height="16" fill="#C59B43"/>
    <rect x="28" y="34" width="${W - 56}" height="${H - 68}" rx="20" fill="none" stroke="#C59B43" stroke-opacity="0.4" stroke-width="1.5"/>

    <text x="${W / 2}" y="155" text-anchor="middle" font-family="Georgia, serif" font-size="76" font-weight="bold" letter-spacing="4" fill="#FAF6EE">DECORBEATS</text>
    <text x="${W / 2}" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#E5C878">The Brass House of India</text>
    <rect x="${W / 2 - 250}" y="255" width="500" height="52" rx="26" fill="#241E1A" stroke="#C59B43" stroke-width="1.5"/>
    <text x="${W / 2}" y="289" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#FAF6EE">DEEPAWALI COLLECTION · WEIGHT, SIZE &amp; QTY GUIDE</text>

    <!-- 6 Clean Photo Frames -->
    ${[0, 1, 2, 3, 4, 5]
      .map((idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 72 + col * (452 + 32);
        const y = 434 + row * (400 + 28);
        return `<rect x="${x}" y="${y}" width="452" height="400" rx="22" fill="#FFFFFF" stroke="#D8C398" stroke-width="2.5"/>`;
      })
      .join('')}

    <!-- Clean Footer -->
    <rect x="72" y="1728" width="${W - 144}" height="120" rx="20" fill="#161311" stroke="#C59B43" stroke-width="2"/>
    <text x="${W / 2}" y="1778" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#FFFFFF">WhatsApp: ${esc(DECORBEATS_BRAND.phoneDisplay)}  ·  ${esc(DECORBEATS_BRAND.websiteDisplay)}</text>
    <text x="${W / 2}" y="1820" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" fill="#E5C878">Moradabad Atelier  ·  Bengaluru Experience Center</text>
  </svg>`;

  const composites = [];
  const gridItems = items.slice(0, 6);
  const gridBuffers = await Promise.all(
    gridItems.map((item) => fetchImageBuffer(item.imageUrl, 412, 320))
  );

  for (let idx = 0; idx < gridItems.length; idx++) {
    const item = gridItems[idx];
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 72 + col * (452 + 32);
    const y = 434 + row * (400 + 28);

    const imgBuf = gridBuffers[idx];
    if (imgBuf) {
      composites.push({ input: imgBuf, left: x + 20, top: y + 16 });
    }
    const wTag = item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass';
    const dTag = item.dimensionsSpec.inchSummary || item.dimensionsSpec.cmSummary;
    const labelSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="424" height="52">
        <rect width="424" height="52" rx="12" fill="#161311"/>
        <text x="16" y="33" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#E5C878">${esc(wTag)}</text>
        <text x="408" y="33" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#FFFFFF">${esc(dTag)}</text>
      </svg>`
    );
    composites.push({ input: labelSvg, left: x + 14, top: y + 334 });
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
        y: 1728,
        w: W - 144,
        h: 120,
        url: `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}`
      }
    ]
  };
}

/**
 * Ultra-Clean 1-Up Product Page:
 *   ONLY:
 *     1. Header: DECORBEATS — The Brass House of India + SKU
 *     2. Giant Multi-Angle Product Picture (1,120px tall!)
 *     3. Clean Product Name
 *     4. Two Giant Boxes: WEIGHT (Grams/kg) & SIZE (Inches + cm)
 */
export async function renderCleanProductJpeg(item, index, totalCount) {
  const nameLines = wrapChars(item.name, 38, 2);

  const weightPrimary =
    item.weightG > 0
      ? item.weightG >= 1000
        ? `${item.weightSpec.gramsText} (${item.weightSpec.kgText})`
        : item.weightSpec.gramsText
      : 'Solid Metal';

  const matLower = String(item.material || '').toLowerCase();
  const weightSub = matLower.includes('iron')
    ? 'Handcrafted Artisan Iron'
    : matLower.includes('aluminium') && matLower.includes('brass')
    ? 'Artisan Metal & Brass'
    : matLower.includes('aluminium')
    ? 'Handcrafted Metalwork'
    : 'Solid Moradabad Brass';

  const sizeInches = (item.dimensionsSpec.inchSummary || 'Standard Size').replace(/×/g, 'x');
  const sizeCm = item.dimensionsSpec.cmSummary
    ? `(${item.dimensionsSpec.cmSummary.replace(/×/g, 'x')})`
    : '';

  const extraGalleryUrls = Array.isArray(item.galleryUrls)
    ? item.galleryUrls.slice(1, 4)
    : [];
  const hasMultiAngles = extraGalleryUrls.length > 0;

  const stockQty = Number(item.quantity ?? item.qty ?? 0);
  const isBoxSet = item.sku === 'DB-DW26-25' || /boxes/i.test(String(item.unit || ''));
  const qtyText = stockQty > 0 ? `${stockQty} ${isBoxSet ? 'boxes' : 'pcs'}` : 'In Stock';
  const qtySub = isBoxSet ? 'Set of 2 Jars / Box' : 'Ready Pieces in Stock';
  const wBoxX = 68;
  const wBoxW = 265;
  const sBoxX = 355;
  const sBoxW = 370;
  const qBoxX = 747;
  const qBoxW = 265;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="16" fill="#C59B43"/>
    <rect y="${H - 16}" width="${W}" height="16" fill="#C59B43"/>
    <rect x="28" y="34" width="${W - 56}" height="${H - 68}" rx="22" fill="none" stroke="#C59B43" stroke-opacity="0.4" stroke-width="1.5"/>

    <!-- Minimal Top Brand Strip -->
    <text x="68" y="84" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="#161311">DECORBEATS</text>
    <text x="270" y="84" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#8C651E">·  The Brass House of India</text>

    <rect x="${W - 258}" y="48" width="190" height="48" rx="24" fill="#161311"/>
    <text x="${W - 163}" y="79" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#E5C878">${esc(item.sku)}</text>

    <rect x="68" y="112" width="${W - 136}" height="2" fill="#DEC99A"/>

    <!-- Giant Clean Picture Frame (1,120 px tall!) -->
    <rect x="68" y="134" width="${W - 136}" height="1120" rx="28" fill="#FFFFFF" stroke="#D8C398" stroke-width="2.5"/>
    ${
      hasMultiAngles
        ? `<line x1="744" y1="164" x2="744" y2="1224" stroke="#EAE0CC" stroke-width="2" stroke-dasharray="6,6"/>`
        : ''
    }

    <!-- Clean Product Name -->
    ${nameLines
      .map(
        (l, idx) =>
          `<text x="${W / 2}" y="${1326 + idx * 52}" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="#161311">${esc(l)}</text>`
      )
      .join('')}

    <!-- THREE ULTRA-CLEAN SPEC CARDS: 1. WEIGHT  |  2. SIZE  |  3. AVAILABLE QTY -->
    <!-- Left Card: WEIGHT -->
    <rect x="${wBoxX}" y="1430" width="${wBoxW}" height="230" rx="24" fill="#161311" stroke="#C59B43" stroke-width="3"/>
    <text x="${wBoxX + wBoxW / 2}" y="1486" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" letter-spacing="1.5" fill="#E5C878">WEIGHT</text>
    <text x="${wBoxX + wBoxW / 2}" y="1560" text-anchor="middle" font-family="Georgia, serif" font-size="${weightPrimary.length > 12 ? 32 : 46}" font-weight="bold" fill="#FFFFFF">${esc(weightPrimary)}</text>
    <text x="${wBoxX + wBoxW / 2}" y="1618" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#D7CBB8">${esc(weightSub)}</text>

    <!-- Center Card: SIZE -->
    <rect x="${sBoxX}" y="1430" width="${sBoxW}" height="230" rx="24" fill="#FFFFFF" stroke="#C59B43" stroke-width="3"/>
    <text x="${sBoxX + sBoxW / 2}" y="1486" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" letter-spacing="1.5" fill="#8C651E">SIZE (INCHES &amp; CM)</text>
    <text x="${sBoxX + sBoxW / 2}" y="1560" text-anchor="middle" font-family="Georgia, serif" font-size="${sizeInches.length > 16 ? 30 : 36}" font-weight="bold" fill="#161311">${esc(sizeInches)}</text>
    <text x="${sBoxX + sBoxW / 2}" y="1618" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#574B3D">${esc(sizeCm)}</text>

    <!-- Right Card: AVAILABLE QTY -->
    <rect x="${qBoxX}" y="1430" width="${qBoxW}" height="230" rx="24" fill="#13332D" stroke="#C59B43" stroke-width="3"/>
    <text x="${qBoxX + qBoxW / 2}" y="1486" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" letter-spacing="1.5" fill="#E5C878">AVAILABLE QTY</text>
    <text x="${qBoxX + qBoxW / 2}" y="1560" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="#FFFFFF">${esc(qtyText)}</text>
    <text x="${qBoxX + qBoxW / 2}" y="1618" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#A7F3D0">${esc(qtySub)}</text>

    <!-- Minimal Bottom Footer -->
    <rect x="68" y="1700" width="${W - 136}" height="120" rx="22" fill="#161311" stroke="#C59B43" stroke-width="2"/>
    <text x="${W / 2}" y="1752" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="bold" fill="#FFFFFF">DECORBEATS  ·  WhatsApp: ${esc(DECORBEATS_BRAND.phoneDisplay)}</text>
    <text x="${W / 2}" y="1794" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#E5C878">Item ${String(index).padStart(2, '0')} of ${String(totalCount).padStart(2, '0')}  ·  www.decorbeats.com/diwali-stock</text>
  </svg>`;

  const composites = [];

  if (hasMultiAngles) {
    const heroBuf = await fetchImageBuffer(item.imageUrl, 636, 1060);
    if (heroBuf) {
      composites.push({ input: heroBuf, left: 88, top: 164 });
    }
    const angleBuffers = await Promise.all(
      extraGalleryUrls.map((u) => fetchImageBuffer(u, 206, 310))
    );
    for (let idx = 0; idx < angleBuffers.length; idx++) {
      const aBuf = angleBuffers[idx];
      const thumbX = 762;
      const thumbY = 164 + idx * 356;
      const frameSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="230" height="336">
          <rect x="2" y="2" width="226" height="332" rx="16" fill="#FAF6EE" stroke="#D8C398" stroke-width="2"/>
        </svg>`
      );
      composites.push({ input: frameSvg, left: thumbX, top: thumbY });
      if (aBuf) {
        composites.push({ input: aBuf, left: thumbX + 12, top: thumbY + 13 });
      }
    }
  } else {
    const heroBuf = await fetchImageBuffer(item.imageUrl, 896, 1060);
    if (heroBuf) {
      composites.push({ input: heroBuf, left: 92, top: 164 });
    }
  }

  const jpegBuffer = await sharp(Buffer.from(svg))
    .composite(composites)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  const whatsappUrl = `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}?text=${encodeURIComponent(
    `Hi Decorbeats! Please share price for ${item.name} (${item.sku}) [Weight: ${weightPrimary}, Size: ${sizeInches}].`
  )}`;

  return {
    jpegBytes: new Uint8Array(jpegBuffer),
    jpegBuffer,
    width: W,
    height: H,
    links: [
      {
        x: 68,
        y: 1700,
        w: W - 136,
        h: 120,
        url: whatsappUrl
      }
    ]
  };
}

/**
 * Renders a 4-Up Clean Grid Page (4 items per page: Huge Picture + Name + Weight + Size ONLY)
 * Makes a 14-page super-fast PDF for customers who want to scan 4 items at a time!
 */
async function renderFourUpCleanPageJpeg(pageItems, pageNum, totalPages) {
  const cardsSvg = [];
  const composites = [];

  const imgBuffers = await Promise.all(
    pageItems.map((item) => fetchImageBuffer(item.imageUrl, 420, 460))
  );

  for (let idx = 0; idx < pageItems.length; idx++) {
    const item = pageItems[idx];
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 60 + col * (464 + 32);
    const y = 170 + row * (740 + 28);

    const imgBuf = imgBuffers[idx];
    if (imgBuf) {
      composites.push({ input: imgBuf, left: x + 22, top: y + 54 });
    }

    const nameLines = wrapChars(item.name, 26, 2);
    const weightText = item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass';
    const sizeText = (
      item.dimensionsSpec.inchSummary ||
      item.dimensionsSpec.cmSummary ||
      'Standard'
    ).replace(/×/g, 'x');
    const cmText = item.dimensionsSpec.cmSummary
      ? item.dimensionsSpec.cmSummary.replace(/×/g, 'x')
      : '';

    cardsSvg.push(`
      <g>
        <rect x="${x}" y="${y}" width="464" height="740" rx="22" fill="#FFFFFF" stroke="#D8C398" stroke-width="2.5"/>
        <rect x="${x + 18}" y="${y + 14}" width="150" height="32" rx="8" fill="#161311"/>
        <text x="${x + 93}" y="${y + 36}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#E5C878">${esc(item.sku)}</text>

        <rect x="${x + 306}" y="${y + 14}" width="140" height="32" rx="8" fill="#13332D" stroke="#C59B43" stroke-width="1.5"/>
        <text x="${x + 376}" y="${y + 36}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">QTY: ${esc(`${Number(item.quantity ?? item.qty ?? 0)} pcs`)}</text>

        <!-- Product Name -->
        ${nameLines
          .map(
            (nl, nIdx) =>
              `<text x="${x + 232}" y="${y + 552 + nIdx * 26}" text-anchor="middle" font-family="Georgia, serif" font-size="21" font-weight="bold" fill="#161311">${esc(nl)}</text>`
          )
          .join('')}

        <!-- Weight Box -->
        <rect x="${x + 18}" y="${y + 600}" width="428" height="56" rx="12" fill="#161311"/>
        <text x="${x + 34}" y="${y + 635}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#E5C878">WEIGHT:</text>
        <text x="${x + 430}" y="${y + 636}" text-anchor="end" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#FFFFFF">${esc(weightText)}</text>

        <!-- Size Box -->
        <rect x="${x + 18}" y="${y + 666}" width="428" height="56" rx="12" fill="#FAF6EE" stroke="#C59B43" stroke-width="1.8"/>
        <text x="${x + 34}" y="${y + 701}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#8C651E">SIZE:</text>
        <text x="${x + 430}" y="${y + 701}" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#161311">${esc(sizeText)} ${cmText ? `(${esc(cmText)})` : ''}</text>
      </g>
    `);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="128" fill="#161311"/>
    <rect y="128" width="${W}" height="6" fill="#C59B43"/>

    <text x="60" y="64" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#FAF6EE">DECORBEATS</text>
    <text x="60" y="102" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#E5C878">The Brass House of India  ·  Picture, Weight &amp; Size Catalogue</text>
    <text x="${W - 60}" y="82" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#E5C878">Page ${pageNum} / ${totalPages}</text>

    ${cardsSvg.join('')}

    <rect x="60" y="1712" width="${W - 120}" height="140" rx="20" fill="#13332D" stroke="#C59B43" stroke-width="2"/>
    <text x="${W / 2}" y="1768" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="bold" fill="#FFFFFF">WhatsApp for Price &amp; Ordering: ${esc(DECORBEATS_BRAND.phoneDisplay)}</text>
    <text x="${W / 2}" y="1814" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#E5C878">www.decorbeats.com/diwali-stock  ·  Moradabad &amp; Bengaluru</text>
  </svg>`;

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
        x: 60,
        y: 1712,
        w: W - 120,
        h: 140,
        url: `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}`
      }
    ]
  };
}

async function main() {
  const rawPath = path.join(rootDir, 'public', 'catalogues', 'lightbox-captures.json');
  const rawDrafts = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const items = rawDrafts
    .map((d) => normalizeCatalogueItem(d, 'draft'))
    .filter((x) => x && x.imageUrl);

  const cardsDir = path.join(rootDir, 'public', 'catalogues', 'cards');
  fs.mkdirSync(cardsDir, { recursive: true });

  // 1. Render Clean 1-Up Catalogue Pages & Individual Cards
  const oneUpPages = [];
  oneUpPages.push(await renderCleanCoverJpeg(items));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const page = await renderCleanProductJpeg(item, i + 1, items.length);
    oneUpPages.push(page);

    const safeSlug = `${String(i + 1).padStart(2, '0')}-${item.sku.replace(/[^a-z0-9_-]/gi, '-')}`;
    fs.writeFileSync(path.join(cardsDir, `${safeSlug}.jpg`), page.jpegBuffer);
  }

  const oneUpPdfBytes = compileJpegPagesToPdf(oneUpPages);
  const cleanPdfPath = path.join(
    rootDir,
    'public',
    'catalogues',
    'Decorbeats-Clean-Catalogue-2026.pdf'
  );
  const masterPdfPath = path.join(
    rootDir,
    'public',
    'catalogues',
    'Decorbeats-Diwali-Available-Stock-2026.pdf'
  );
  fs.writeFileSync(cleanPdfPath, oneUpPdfBytes);
  fs.writeFileSync(masterPdfPath, oneUpPdfBytes);

  // 2. Render 4-Up Per Page Quick-Scan Catalogue (15 Pages total)
  const fourUpPages = [];
  fourUpPages.push(await renderCleanCoverJpeg(items));
  const chunkSize = 4;
  const totalGridPages = Math.ceil(items.length / chunkSize);
  for (let p = 0; p < totalGridPages; p++) {
    const slice = items.slice(p * chunkSize, (p + 1) * chunkSize);
    fourUpPages.push(await renderFourUpCleanPageJpeg(slice, p + 1, totalGridPages));
  }

  const fourUpPdfBytes = compileJpegPagesToPdf(fourUpPages);
  const gridPdfPath = path.join(
    rootDir,
    'public',
    'catalogues',
    'Decorbeats-Quick-Lookbook-Grid-2026.pdf'
  );
  fs.writeFileSync(gridPdfPath, fourUpPdfBytes);

  // 3. Also rebuild the 5 Category Mini-Packs using this ultra-clean Picture + Weight + Size template!
  const { SHAREABLE_PACK_DEFS } = await import('./build-shareable-packs.mjs');
  const packsDir = path.join(rootDir, 'public', 'catalogues', 'packs');
  fs.mkdirSync(packsDir, { recursive: true });

  for (const packDef of SHAREABLE_PACK_DEFS) {
    const packItems = items.filter(packDef.filter).sort(packDef.sort);
    const pPages = [await renderCleanCoverJpeg(packItems)];
    for (let i = 0; i < packItems.length; i++) {
      pPages.push(await renderCleanProductJpeg(packItems[i], i + 1, packItems.length));
    }
    const pBytes = compileJpegPagesToPdf(pPages);
    fs.writeFileSync(path.join(packsDir, packDef.pdfFile), pBytes);
  }

  console.log(
    JSON.stringify(
      {
        cleanOneUpPdf: cleanPdfPath,
        cleanOneUpSizeMB: +(oneUpPdfBytes.length / (1024 * 1024)).toFixed(2),
        cleanOneUpPages: oneUpPages.length,
        fourUpGridPdf: gridPdfPath,
        fourUpGridSizeMB: +(fourUpPdfBytes.length / (1024 * 1024)).toFixed(2),
        fourUpGridPages: fourUpPages.length
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
