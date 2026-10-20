/**
 * Decorbeats CLI — Bite-Sized WhatsApp Mini-Catalogue Packs & 9:16 6-Up Summary Boards
 *
 * Usage:
 *   node scripts/build-shareable-packs.mjs
 *
 * Segments the 54 verified WhatsApp Lightbox items into 5 high-velocity conversion packs:
 *   1. Corporate & Bulk Gifting Edit (15 to 170+ Ready Units per SKU)
 *   2. Sacred Brass Idols & Heritage Collector's Edit
 *   3. Statement Urlis, Pedestal Diyas, Loban Burners & Temple Bells
 *   4. Festive Trays, Pichwai Platters & Enamel Jali Hamper Sets
 *   5. Pooja Thalis, Everyday Diyas & Auspicious Return Gifts
 *
 * Produces:
 *   - 5 lightweight 9:16 PDFs in `public/catalogues/packs/`
 *   - 5 1080×1920 6-Up Summary Board JPEGs for inline WhatsApp Chat & Status previews
 *   - `public/catalogues/packs/packs-manifest.json` with ready-to-copy WhatsApp broadcast scripts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DECORBEATS_BRAND,
  compileJpegPagesToPdf,
  normalizeCatalogueItem
} from '../src/capture/catalogueGenerator.js';
import {
  sharp,
  esc,
  wrapChars,
  fetchImageBuffer,
  renderCoverJpeg,
  renderProductJpeg,
  renderBackCoverJpeg
} from './build-diwali-catalogue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const W = 1080;
const H = 1920;

export const SHAREABLE_PACK_DEFS = [
  {
    id: 'pack-1-corporate-bulk-gifting',
    number: '01',
    shortTitle: 'Corporate & Bulk Gifting (15–170+ Units)',
    badge: 'PACK 01 · CORPORATE & BULK GIFTING',
    title: 'CORPORATE & BULK DIWALI GIFTING EDIT',
    subtitle: '15 to 170+ Verified Ready Units Per SKU · Custom Gift Boxes · Multi-State GST',
    pdfFile: 'Decorbeats-Pack-1-Corporate-Bulk-Gifting.pdf',
    boardFile: 'Board-1-Corporate-Bulk-Gifting.jpg',
    audience: 'Corporate HR, Founders, Client Gifting & Wedding / Society Bulk Buyers',
    filter: (item) => Number(item.quantity) >= 15,
    sort: (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0),
    whatsappCopy: `🪔 *DECORBEATS · CORPORATE & BULK DIWALI GIFTING (READY STOCK IN BENGALURU)* 🪔

Looking for authentic Moradabad solid brass & festive gift sets that can dispatch *immediately* without waiting on factory lead times?

✅ *1,780+ Verified Ready Units* across 22 best-selling SKUs (20 to 170+ units per design)
✅ *Studio Weight & Dimension Certified* on every single card
✅ *Royal Velvet Boxes, Enamel Jali Dry-Fruit Hamper Trays & Pure Solid Brass Diyas/Plates*
✅ *Multi-State GST Invoicing* (KA, TN, MH) & Same-Day Bengaluru Dispatch

📲 *Browse Interactive Lookbook & Build Your Shortlist:*
https://www.decorbeats.com/diwali-stock?pack=pack-1-corporate-bulk-gifting

Reply with your shortlisted SKU codes or required quantity to lock stock with Megha (+91 98111 33661).`
  },
  {
    id: 'pack-2-sacred-brass-idols',
    number: '02',
    shortTitle: 'Sacred Brass Idols · Collector Edit',
    badge: 'PACK 02 · SACRED BRASS IDOLS & SCULPTURES',
    title: 'SACRED BRASS IDOLS · COLLECTOR EDIT',
    subtitle: 'Superfine Solid Moradabad Brass Deities & Dhokra Sculptures · Limited 1 to 8 Units',
    pdfFile: 'Decorbeats-Pack-2-Sacred-Brass-Idols-Collector-Edit.pdf',
    boardFile: 'Board-2-Sacred-Brass-Idols.jpg',
    audience: 'Home Mandir Buyers, Vastu Seekers, Luxury VIP Gifting & Brass Collectors',
    filter: (item) => {
      const c = String(item.category || '').toLowerCase();
      return c.includes('idol') || c.includes('figurine') || c.includes('tribal');
    },
    sort: (a, b) => (Number(b.weightG) || 0) - (Number(a.weightG) || 0),
    whatsappCopy: `🙏 *DECORBEATS · SUPERFINE SOLID BRASS IDOLS (LIMITED COLLECTOR STOCK)* 🙏

Hand-cast in Pital Nagri (Moradabad) and weighed on our studio scale in Bengaluru — each sacred idol in this edit has only *1 to 8 pieces available* before Deepawali:

✨ *1.46 kg & 1.44 kg Monumental Solid Brass Lord Ganesha Idols* (6" & 6.5")
✨ *1.38 kg Ashta-Lakshmi & Lord Ganesha Seated Pair* (5.5")
✨ *Superfine Panchmukhi Hanuman (4" Kneeling & 2.5" Seated), Tirupati Balaji, Sheshashayi Vishnu-Lakshmi & Devi Annapurna*
✨ *2.40 kg Heavy Dhokra Tribal Village Women Brass Set of 5*

📲 *View All 4 Angles & Reserve Your Piece:*
https://www.decorbeats.com/diwali-stock?pack=pack-2-sacred-brass-idols

Reply with the SKU code (e.g. DB-DW26-30 or DB-DW26-50) on WhatsApp to reserve immediately.`
  },
  {
    id: 'pack-3-statement-urlis-diyas-bells',
    number: '03',
    shortTitle: 'Statement Urlis, Pedestal Diyas & Bells',
    badge: 'PACK 03 · URLIS, PEDESTAL DIYAS & TEMPLE BELLS',
    title: 'STATEMENT URLIS, PEDESTAL DIYAS & BELLS',
    subtitle: 'Heavy Solid Brass Urlis, Peacock Pedestal Diyas, Loban Burners & Mandir Bells',
    pdfFile: 'Decorbeats-Pack-3-Statement-Urlis-Pedestal-Diyas-Bells.pdf',
    boardFile: 'Board-3-Statement-Urlis-Diyas-Bells.jpg',
    audience: 'Foyer & Living Room Styling, Temple Architecture & Premium Festive Gifting',
    filter: (item) => {
      const c = String(item.category || '').toLowerCase();
      return (
        c.includes('urli') ||
        c.includes('bell') ||
        c.includes('dhoop') ||
        c.includes('temple') ||
        c.includes('wall') ||
        (c.includes('diya') && Number(item.weightG) >= 150)
      );
    },
    sort: (a, b) => (Number(b.weightG) || 0) - (Number(a.weightG) || 0),
    whatsappCopy: `🪔 *DECORBEATS · GRAND FOYER URLIS, PEACOCK DIYAS & TEMPLE BELLS* 🪔

Transform your entrance foyer and pooja room this Deepawali with heavyweight Moradabad brass statement pieces:

🌸 *2.56 kg Grand 12" Solid Brass Marigold Rim Floating Urli*
🦚 *1.24 kg Hanging Mayur Diya with Chain & 970 g Navratna Mosaic Peacock Diya*
🔥 *900 g Peacock Finial Kurma Tortoise Brass Loban Dhoopdani & 825 g 10-Diya Lotus Thaal*
🔔 *625 g Sacred Nandi Bell, Garuda Pooja Bell & Kamadhenu Wall Hangings*

📲 *See Verified Weights, Dimensions & Live Stock:*
https://www.decorbeats.com/diwali-stock?pack=pack-3-statement-urlis-diyas-bells`
  },
  {
    id: 'pack-4-festive-trays-hampers',
    number: '04',
    shortTitle: 'Festive Trays, Pichwai Platters & Hampers',
    badge: 'PACK 04 · TRAYS, HAMPER JARS & GIFT SETS',
    title: 'FESTIVE TRAYS, PICHWAI PLATTERS & HAMPERS',
    subtitle: 'Enamel Jali Dry-Fruit Jar Sets, Brass-Rim Pichwai Trays & Velvet Gift Boxes',
    pdfFile: 'Decorbeats-Pack-4-Festive-Trays-Hampers-Platters.pdf',
    boardFile: 'Board-4-Festive-Trays-Hampers.jpg',
    audience: 'Festive Hosting, Dry-Fruit Hamper Curators, Family & Corporate Gifting',
    filter: (item) => {
      const c = String(item.category || '').toLowerCase();
      return (
        c.includes('tray') ||
        c.includes('hamper') ||
        c.includes('basket') ||
        c.includes('gift box') ||
        c.includes('jar') ||
        c.includes('candle')
      );
    },
    sort: (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0),
    whatsappCopy: `🎁 *DECORBEATS · FESTIVE TRAYS, DRY-FRUIT HAMPERS & PICHWAI PLATTERS* 🎁

Host in style or build unforgettable Diwali hampers with our artisan metal & brass platters:

✨ *Royal Cobalt & Crimson Floral Enamel Jars with Pierced Golden Jali Trays (660 g)*
✨ *Heavy 500 g Thick Aluminium & Solid Brass-Rim Pichwai Kamadhenu Trays (8.5")*
✨ *Royal Red Velvet Gift Box Sets with 2 Gold Bowls & Spoons (36 Sets Ready)*
✨ *Botanical & Kalamkari Jali Trays, Golden Leaf Platters & 5-Arm Brass Candelabras*

📲 *Browse the Full Tray & Hamper Collection:*
https://www.decorbeats.com/diwali-stock?pack=pack-4-festive-trays-hampers`
  },
  {
    id: 'pack-5-pooja-essentials-return-gifts',
    number: '05',
    shortTitle: 'Pooja Thalis, Diyas & Return Gifts',
    badge: 'PACK 05 · POOJA THALIS, DIYAS & RETURN GIFTS',
    title: 'POOJA ESSENTIALS, THALIS & RETURN GIFTS',
    subtitle: 'Solid Brass Pooja Thalis, Kuber & Kamal Diyas, Kumkum Handis & Kalpavriksha Trees',
    pdfFile: 'Decorbeats-Pack-5-Pooja-Essentials-Return-Gifts.pdf',
    boardFile: 'Board-5-Pooja-Essentials-Return-Gifts.jpg',
    audience: 'Diwali Pooja Shoppers, Housewarming Return Gifts & Auspicious Keepsakes',
    filter: (item) => {
      const c = String(item.category || '').toLowerCase();
      return (
        c.includes('thali') ||
        c.includes('plate') ||
        c.includes('box') ||
        c.includes('haldi') ||
        c.includes('tree') ||
        c.includes('decor & gifting') ||
        (c.includes('diya') && Number(item.weightG) < 150)
      );
    },
    sort: (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0),
    whatsappCopy: `🪔 *DECORBEATS · SOLID BRASS POOJA THALIS, DIYAS & AUSPICIOUS RETURN GIFTS* 🪔

Pure Moradabad solid brass essentials for Lakshmi Pooja and memorable festive return gifting:

🌼 *100 Units Ready: Blooming Kamal Brass Diyas (80 g) & Kalpavriksha Wish Trees (160 g)*
🪔 *170 Units Ready: Kuber & Kurma Tortoise Pedestal Solid Brass Diyas*
🍽️ *250+ Units Ready: Engraved Solid Brass Bhog & Aarti Plates (4", 6" & 7")*
🍎 *45 Units Ready: 330 g Solid Brass Apple Paperweights & Peacock Kumkum Handis*

📲 *Shortlist Your Pooja & Return Gift Items Here:*
https://www.decorbeats.com/diwali-stock?pack=pack-5-pooja-essentials-return-gifts`
  }
];

async function renderSixUpSummaryBoard(packDef, packItems, asOfDate) {
  const totalUnits = packItems.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const showcase = packItems.slice(0, 6);

  const titleLines = wrapChars(packDef.title, 34, 2);
  const subLines = wrapChars(packDef.subtitle, 58, 2);

  const cardsSvg = [];
  const composites = [];

  const imgBuffers = await Promise.all(
    showcase.map((item) => fetchImageBuffer(item.imageUrl, 416, 232))
  );

  for (let idx = 0; idx < showcase.length; idx++) {
    const item = showcase[idx];
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 64 + col * (460 + 32);
    const y = 450 + row * (386 + 24);

    const imgBuf = imgBuffers[idx];
    if (imgBuf) {
      composites.push({ input: imgBuf, left: x + 22, top: y + 48 });
    }

    const nameLines = wrapChars(item.name, 26, 2);
    const weightBadge = item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass';
    const dimBadge = item.dimensionsSpec.inchSummary
      ? `${item.dimensionsSpec.cmSummary} (${item.dimensionsSpec.inchSummary})`
      : item.dimensionsSpec.cmSummary;
    const stockBadge =
      item.quantity > 0 ? `${item.quantity} READY` : 'ENQUIRE';

    cardsSvg.push(`
      <g>
        <rect x="${x}" y="${y}" width="460" height="386" rx="20" fill="#FFFFFF" stroke="#D8C398" stroke-width="2.5"/>
        <rect x="${x + 16}" y="${y + 12}" width="170" height="30" rx="8" fill="#231E1A"/>
        <text x="${x + 28}" y="${y + 32}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#E5C878">${esc(item.sku)}</text>

        <rect x="${x + 314}" y="${y + 12}" width="130" height="30" rx="8" fill="#13332D"/>
        <text x="${x + 379}" y="${y + 32}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">${esc(stockBadge)}</text>

        <rect x="${x + 16}" y="${y + 284}" width="428" height="32" rx="8" fill="#1B1714"/>
        <text x="${x + 28}" y="${y + 305}" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#E5C878">WEIGHT: ${esc(weightBadge)}</text>
        <text x="${x + 432}" y="${y + 305}" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#D9CEBA">${esc(dimBadge.slice(0, 26))}</text>

        ${nameLines
          .map(
            (nl, nIdx) =>
              `<text x="${x + 20}" y="${y + 340 + nIdx * 22}" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#181412">${esc(nl)}</text>`
          )
          .join('')}
      </g>
    `);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="418" fill="#161311"/>
    <rect y="418" width="${W}" height="10" fill="#C59B43"/>
    <rect width="${W}" height="16" fill="#C59B43"/>
    <rect y="${H - 16}" width="${W}" height="16" fill="#C59B43"/>
    <rect x="24" y="32" width="${W - 48}" height="${H - 64}" rx="20" fill="none" stroke="#C59B43" stroke-opacity="0.45" stroke-width="1.5"/>

    <rect x="64" y="58" width="500" height="40" rx="20" fill="#2A2218" stroke="#C59B43" stroke-width="1.5"/>
    <text x="88" y="84" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#E5C878">${esc(packDef.badge)}</text>

    <text x="${W - 64}" y="84" text-anchor="end" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#FAF6EE">DECORBEATS</text>

    ${titleLines
      .map(
        (l, idx) =>
          `<text x="64" y="${152 + idx * 50}" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="#FFFFFF">${esc(l)}</text>`
      )
      .join('')}

    ${subLines
      .map(
        (l, idx) =>
          `<text x="64" y="${258 + idx * 30}" font-family="Arial, sans-serif" font-size="21" fill="#D7CBB8">${esc(l)}</text>`
      )
      .join('')}

    <rect x="64" y="330" width="${W - 128}" height="62" rx="14" fill="#13332D" stroke="#C59B43" stroke-width="1.5"/>
    <circle cx="94" cy="361" r="7" fill="#E5C878"/>
    <text x="114" y="368" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">VERIFIED STOCK AS OF ${esc(asOfDate.toUpperCase())}</text>
    <text x="${W - 88}" y="368" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#E5C878">${packItems.length} SKUs · ${totalUnits} Ready Units</text>

    ${cardsSvg.join('\n')}

    <rect x="64" y="1690" width="${W - 128}" height="172" rx="22" fill="#13332D" stroke="#C59B43" stroke-width="2.5"/>
    <text x="96" y="1736" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#E5C878">1-TAP SHORTLIST &amp; WHATSAPP RESERVATION · NO MINIMUM ORDER</text>
    <text x="96" y="1780" font-family="Georgia, serif" font-size="30" font-weight="bold" fill="#FFFFFF">WhatsApp Megha: ${esc(DECORBEATS_BRAND.phoneDisplay)}</text>
    <text x="96" y="1822" font-family="Arial, sans-serif" font-size="20" fill="#E0D6C5">Live Lookbook: www.decorbeats.com/diwali-stock  ·  Bengaluru &amp; Moradabad</text>
  </svg>`;

  return await sharp(Buffer.from(svg))
    .composite(composites)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

export async function buildShareablePacks() {
  const localDraftsPath = path.join(rootDir, 'public', 'catalogues', 'lightbox-captures.json');
  if (!fs.existsSync(localDraftsPath)) {
    throw new Error(`lightbox-captures.json not found at ${localDraftsPath}`);
  }
  const rawDrafts = JSON.parse(fs.readFileSync(localDraftsPath, 'utf8'));
  const allItems = rawDrafts
    .map((d) => normalizeCatalogueItem(d, 'draft'))
    .filter((x) => x && x.imageUrl);

  const asOfDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const packsDir = path.join(rootDir, 'public', 'catalogues', 'packs');
  fs.mkdirSync(packsDir, { recursive: true });

  const manifest = [];

  for (const packDef of SHAREABLE_PACK_DEFS) {
    const matched = allItems.filter(packDef.filter);
    if (packDef.sort) {
      matched.sort(packDef.sort);
    }

    const config = {
      title: packDef.title,
      subtitle: packDef.subtitle,
      asOfDate,
      priceMode: 'hide_price'
    };

    const pages = [];
    const cover = await renderCoverJpeg(matched, config);
    pages.push(cover);

    for (let i = 0; i < matched.length; i++) {
      const prodPage = await renderProductJpeg(matched[i], i + 1, matched.length, config);
      pages.push(prodPage);
    }

    const back = await renderBackCoverJpeg(config);
    pages.push(back);

    const pdfBytes = compileJpegPagesToPdf(pages);
    const pdfPath = path.join(packsDir, packDef.pdfFile);
    fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));

    const boardBuffer = await renderSixUpSummaryBoard(packDef, matched, asOfDate);
    const boardPath = path.join(packsDir, packDef.boardFile);
    fs.writeFileSync(boardPath, boardBuffer);

    const totalUnits = matched.reduce((s, x) => s + (Number(x.quantity) || 0), 0);

    manifest.push({
      id: packDef.id,
      number: packDef.number,
      shortTitle: packDef.shortTitle,
      title: packDef.title,
      subtitle: packDef.subtitle,
      audience: packDef.audience,
      skuCount: matched.length,
      totalUnits,
      pdfUrl: `/catalogues/packs/${packDef.pdfFile}`,
      pdfSizeMB: Number((pdfBytes.length / (1024 * 1024)).toFixed(2)),
      boardUrl: `/catalogues/packs/${packDef.boardFile}`,
      lookbookUrl: `/diwali-stock?pack=${packDef.id}`,
      whatsappCopy: packDef.whatsappCopy,
      skus: matched.map((x) => ({
        sku: x.sku,
        name: x.name,
        weight: x.weightSpec.shortLabel,
        dimensions: x.dimensionsSpec.combinedSummary,
        quantity: x.quantity
      }))
    });
  }

  const manifestPath = path.join(packsDir, 'packs-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildShareablePacks()
    .then((res) => {
      console.log(
        JSON.stringify(
          res.map((p) => ({
            id: p.id,
            skuCount: p.skuCount,
            totalUnits: p.totalUnits,
            pdfUrl: p.pdfUrl,
            pdfSizeMB: p.pdfSizeMB,
            boardUrl: p.boardUrl
          })),
          null,
          2
        )
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
