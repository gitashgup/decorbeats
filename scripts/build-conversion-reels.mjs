/**
 * Decorbeats CLI — 9:16 MP4 Video Reel Compiler & Pre-Diwali Conversion Playbook Builder
 *
 * Usage:
 *   node scripts/build-conversion-reels.mjs
 *
 * Generates:
 *   1. 4 Ready-to-Post 1080×1920 (9:16 H.264 MP4) Video Reels in `public/catalogues/reels/`
 *      suitable for Instagram Reels, YouTube Shorts, WhatsApp Status, and WhatsApp Broadcasts.
 *   2. `public/catalogues/diwali-conversion-playbook.json` with 12 copy-paste WhatsApp
 *      Broadcasts, Status sequences, and Instagram Reel captions.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  DECORBEATS_BRAND,
  normalizeCatalogueItem
} from '../src/capture/catalogueGenerator.js';
import {
  sharp,
  esc,
  wrapChars,
  fetchImageBuffer
} from './build-diwali-catalogue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const W = 1080;
const H = 1920;

export const REEL_DEFINITIONS = [
  {
    id: 'reel-01-heavyweight-heirloom-brass',
    filename: 'Reel-01-Heavyweight-Heirloom-Brass.mp4',
    posterFilename: 'Reel-01-Heavyweight-Heirloom-Brass-Cover.jpg',
    eyebrow: 'REEL 01 · THE WEIGHT PROOF EDIT',
    hookTitle: 'Why Real Moradabad Brass Never Lies.',
    hookSubtitle: '825 g to 2.56 kg Verified on Our Studio Scale · Ready in Bengaluru',
    badgeText: 'HEAVYWEIGHT HEIRLOOM CASTINGS',
    skus: ['DB-DW26-06', 'DB-DW26-45', 'DB-DW26-34', 'DB-DW26-30', 'DB-DW26-31', 'DB-DW26-26'],
    caption: `Brass Never Lies — and the scale proves it. ⚖️🪔

Every piece in our Deepawali 2026 Edit is hand-cast in Moradabad (Pital Nagri) and weighed on our digital studio scale in Bengaluru:
• DB-DW26-06: 2.56 kg (2,560 g) 12" Solid Brass Marigold Floating Urli
• DB-DW26-45: 2.40 kg (2,400 g) Dhokra Tribal Brass Figurines (Set of 5)
• DB-DW26-34: 1.46 kg Seated Chaturbhuja Lord Ganesha Idol (6")
• DB-DW26-30: 1.44 kg Shankh-Chakra-Gada Lord Ganesha Idol (6.5")
• DB-DW26-31: 1.38 kg Ashta-Lakshmi & Lord Ganesha Pair (5.5")
• DB-DW26-26: 1.24 kg Hanging Mayur Peacock Diya with Chain (10")

📲 Browse all 54 verified warehouse pieces & shortlist yours:
https://www.decorbeats.com/diwali-stock

💬 WhatsApp Megha at +91 98111 33661 with any SKU code to reserve before Deepawali!`
  },
  {
    id: 'reel-02-corporate-bulk-gifting',
    filename: 'Reel-02-Corporate-Bulk-Gifting-Ready-Stock.mp4',
    posterFilename: 'Reel-02-Corporate-Bulk-Gifting-Cover.jpg',
    eyebrow: 'REEL 02 · EXPRESS CORPORATE & BULK GIFTING',
    hookTitle: '2,000+ Diwali Gifts Ready to Ship Today.',
    hookSubtitle: 'Zero Factory Wait · 20 to 170+ Units Per Design · Multi-State GST',
    badgeText: 'IMMEDIATE BENGALURU DISPATCH',
    skus: ['DB-DW26-17', 'DB-DW26-19', 'DB-DW26-20', 'DB-DW26-38', 'DB-DW26-47', 'DB-DW26-52'],
    caption: `Last-minute Corporate or Family Bulk Diwali Gifting? We have 2,002 physical units ready in our Bengaluru warehouse for immediate dispatch! 🎁🚚

Top Bulk-Ready Bestsellers:
• DB-DW26-17: Royal Red Velvet Box with 2 Gold Bowls & Spoons (36 Sets)
• DB-DW26-19: 5-Diya Lotus Pooja Thali with Bell & Kalash (32 Units)
• DB-DW26-20: Blooming Kamal Solid Brass Diya 80 g (100 Units)
• DB-DW26-38: Sacred Kalpavriksha Solid Brass Tree 160 g (100 Units)
• DB-DW26-47: Crimson Floral Enamel Jars & Golden Jali Tray Set 660 g (20 Sets)
• DB-DW26-52: 330 g Solid Brass Apple Paperweight Keepsake (45 Units)

✅ Multi-State GST Billing (KA, TN, MH)
✅ No Minimum Order Quantity — Single Pieces to 500+ Units

📲 Build your custom shortlist in 60 seconds:
https://www.decorbeats.com/diwali-stock?pack=pack-1-corporate-bulk-gifting`
  },
  {
    id: 'reel-03-sacred-mandir-idols',
    filename: 'Reel-03-Sacred-Mandir-Idols-Collector-Edit.mp4',
    posterFilename: 'Reel-03-Sacred-Mandir-Idols-Cover.jpg',
    eyebrow: 'REEL 03 · SACRED MANDIR COLLECTOR EDIT',
    hookTitle: 'Superfine Solid Brass Deities for Deepawali.',
    hookSubtitle: 'Only 1 to 8 Pieces Per Sculpture · Multi-Angle Studio Inspected',
    badgeText: 'LIMITED COLLECTOR STOCK',
    skus: ['DB-DW26-30', 'DB-DW26-31', 'DB-DW26-50', 'DB-DW26-39', 'DB-DW26-41', 'DB-DW26-42'],
    caption: `Bring home auspiciousness this Dhanteras & Deepawali with superfine solid Moradabad brass idols. 🙏✨

Because these are heavy, hand-finished collector castings, we only have 1 to 8 units per design:
• DB-DW26-30: 1.44 kg Superfine Shankh-Chakra-Gada Ganesha (Only 1 Left)
• DB-DW26-31: 1.38 kg Lakshmi-Ganesha Seated Pair 5.5" (Only 1 Pair Left)
• DB-DW26-50: 370 g Kneeling Panchmukhi Hanuman 10-Armed Idol 4" (2 Units)
• DB-DW26-39: 315 g Superfine Tirupati Balaji Idol 6" (4 Units)
• DB-DW26-41: 330 g Sheshashayi Vishnu & Lakshmi Idol 4" (3 Units)
• DB-DW26-42: 120 g Seated Devi Annapurna Idol 3" (8 Units)

📲 Inspect all 4 angles & reserve on WhatsApp:
https://www.decorbeats.com/diwali-stock?pack=pack-2-sacred-brass-idols`
  },
  {
    id: 'reel-04-festive-hosting-hampers',
    filename: 'Reel-04-Festive-Hosting-Hampers-Trays.mp4',
    posterFilename: 'Reel-04-Festive-Hosting-Hampers-Cover.jpg',
    eyebrow: 'REEL 04 · FESTIVE HOSTING & HAMPER PLATTERS',
    hookTitle: 'Elevate Your Diwali Table & Dry-Fruit Hampers.',
    hookSubtitle: 'Enamel Jali Jar Sets, Brass-Rim Pichwai Trays & Peacock Diyas',
    badgeText: 'FESTIVE HOSTING & GIFTING',
    skus: ['DB-DW26-46', 'DB-DW26-47', 'DB-DW26-08', 'DB-DW26-49', 'DB-DW26-48', 'DB-DW26-40'],
    caption: `Hosting guests or curating luxury Diwali dry-fruit hampers? Style your table with handcrafted Moradabad metal & solid brass! ✨🪔

Featured in this Reel:
• DB-DW26-46 & 47: Royal Cobalt & Crimson Floral Enamel Jars with Golden Jali Tray (660 g)
• DB-DW26-08: 500 g Thick Aluminium & Solid Brass Rim Pichwai Cow Tray (8.5")
• DB-DW26-49: 970 g Navratna Mosaic Inlaid Royal Peacock Heavy Brass Diya (7")
• DB-DW26-48: 480 g Surya Halo Dancing Peacock 7-Wick Pedestal Diya (7.5")
• DB-DW26-40: 900 g Royal Peacock Finial Kurma Tortoise Brass Loban Dhoopdani (5")

📲 Tap to shortlist & order on WhatsApp:
https://www.decorbeats.com/diwali-stock?pack=pack-4-festive-trays-hampers`
  }
];

async function renderReelIntroSlide(reelDef, totalUnitsInReel) {
  const hookLines = wrapChars(reelDef.hookTitle, 24, 3);
  const subLines = wrapChars(reelDef.hookSubtitle, 44, 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#14110F"/>
    <rect width="${W}" height="22" fill="#C59B43"/>
    <rect y="${H - 22}" width="${W}" height="22" fill="#C59B43"/>
    <rect x="36" y="48" width="${W - 72}" height="${H - 96}" rx="28" fill="none" stroke="#C59B43" stroke-opacity="0.55" stroke-width="2"/>

    <rect x="84" y="140" width="520" height="54" rx="27" fill="#2A2218" stroke="#C59B43" stroke-width="2"/>
    <text x="114" y="175" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#E5C878">${esc(reelDef.eyebrow)}</text>

    <text x="84" y="340" font-family="Georgia, serif" font-size="40" font-weight="bold" fill="#C59B43">DECORBEATS · PITAL NAGRI ATELIER</text>

    ${hookLines
      .map(
        (l, idx) =>
          `<text x="84" y="${490 + idx * 104}" font-family="Georgia, serif" font-size="84" font-weight="bold" fill="#FAF6EE">${esc(l)}</text>`
      )
      .join('')}

    ${subLines
      .map(
        (l, idx) =>
          `<text x="84" y="${870 + idx * 48}" font-family="Arial, sans-serif" font-size="32" fill="#D9CEBA">${esc(l)}</text>`
      )
      .join('')}

    <rect x="84" y="1060" width="${W - 168}" height="240" rx="28" fill="#13332D" stroke="#E5C878" stroke-width="3"/>
    <text x="130" y="1135" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#E5C878">${esc(reelDef.badgeText)}</text>
    <text x="130" y="1205" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="#FFFFFF">Verified Studio Scale Weight</text>
    <text x="130" y="1260" font-family="Arial, sans-serif" font-size="26" fill="#E0D6C5">Exact Grams · Dual-Unit Dimensions (cm &amp; in) · Live Warehouse Stock</text>

    <rect x="84" y="1520" width="${W - 168}" height="240" rx="28" fill="#221D19" stroke="#C59B43" stroke-width="2"/>
    <text x="${W / 2}" y="1595" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#E5C878">BENGALURU EXPERIENCE CENTER · PAN-INDIA EXPRESS DISPATCH</text>
    <text x="${W / 2}" y="1660" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="#FFFFFF">WhatsApp: ${esc(DECORBEATS_BRAND.phoneDisplay)}</text>
    <text x="${W / 2}" y="1718" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#D7CBB8">www.decorbeats.com/diwali-stock</text>
  </svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function renderReelProductSlide(item, index, total, reelDef) {
  const heroBuf = await fetchImageBuffer(item.imageUrl, 860, 860);
  const angle2Url = item.allPhotos?.[1] || item.imageUrl;
  const angle2Buf = await fetchImageBuffer(angle2Url, 240, 240);

  const nameLines = wrapChars(item.name, 28, 2);
  const weightText = item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass';
  const dimText = item.dimensionsSpec.inchSummary
    ? `${item.dimensionsSpec.cmSummary} (${item.dimensionsSpec.inchSummary})`
    : item.dimensionsSpec.cmSummary;
  const stockText =
    item.quantity > 0
      ? item.quantity <= 4
        ? `ONLY ${item.quantity} LEFT IN STOCK`
        : `${item.quantity} UNITS READY TO SHIP`
      : 'ENQUIRE FOR STOCK';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#FAF6EE"/>
    <rect width="${W}" height="18" fill="#C59B43"/>
    <rect y="${H - 18}" width="${W}" height="18" fill="#C59B43"/>
    <rect x="28" y="36" width="${W - 56}" height="${H - 72}" rx="24" fill="none" stroke="#C59B43" stroke-opacity="0.5" stroke-width="2"/>

    <!-- Top Header -->
    <rect x="64" y="68" width="440" height="52" rx="14" fill="#181412"/>
    <text x="90" y="102" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#E5C878">${esc(item.sku)} · ${esc(item.category.toUpperCase().slice(0, 20))}</text>

    <rect x="${W - 394}" y="68" width="330" height="52" rx="14" fill="#13332D"/>
    <text x="${W - 229}" y="102" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">${esc(stockText)}</text>

    <!-- Main Image Frame -->
    <rect x="64" y="144" width="${W - 128}" height="920" rx="28" fill="#FFFFFF" stroke="#D8C398" stroke-width="3"/>

    <!-- Secondary Angle Inset Box -->
    <rect x="${W - 348}" y="784" width="260" height="260" rx="20" fill="#FFFFFF" stroke="#C59B43" stroke-width="3"/>

    <!-- Weight & Dimensions Banner -->
    <rect x="64" y="1092" width="${W - 128}" height="136" rx="22" fill="#181412" stroke="#C59B43" stroke-width="2.5"/>
    <text x="100" y="1142" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#C59B43">VERIFIED STUDIO SCALE WEIGHT</text>
    <text x="100" y="1198" font-family="Georgia, serif" font-size="46" font-weight="bold" fill="#FFFFFF">${esc(weightText)} · Solid Craft</text>
    <text x="${W - 100}" y="1142" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#E5C878">DIMENSIONS (CM &amp; IN)</text>
    <text x="${W - 100}" y="1196" text-anchor="end" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#FAF6EE">${esc(dimText)}</text>

    <!-- Product Title -->
    ${nameLines
      .map(
        (l, idx) =>
          `<text x="68" y="${1308 + idx * 62}" font-family="Georgia, serif" font-size="50" font-weight="bold" fill="#181412">${esc(l)}</text>`
      )
      .join('')}

    <!-- Material & Pack Info -->
    <rect x="64" y="1440" width="${W - 128}" height="160" rx="20" fill="#F2E9D8" stroke="#D5BC8A" stroke-width="2"/>
    <text x="96" y="1492" font-family="Arial, sans-serif" font-size="21" font-weight="bold" fill="#8C651E">MATERIAL &amp; CRAFTSMANSHIP</text>
    <text x="96" y="1538" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#181412">${esc(item.material)} · ${esc(item.unit)}</text>
    <text x="96" y="1578" font-family="Arial, sans-serif" font-size="22" fill="#5A4E40">Handcrafted in Moradabad · Inspected at Bengaluru Warehouse</text>

    <!-- Bottom CTA -->
    <rect x="64" y="1636" width="${W - 128}" height="196" rx="24" fill="#13332D" stroke="#C59B43" stroke-width="2.5"/>
    <text x="100" y="1696" font-family="Arial, sans-serif" font-size="23" font-weight="bold" fill="#E5C878">WHATSAPP SKU "${esc(item.sku)}" TO RESERVE OR ENQUIRE</text>
    <text x="100" y="1752" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="#FFFFFF">${esc(DECORBEATS_BRAND.phoneDisplay)} · Megha</text>
    <text x="100" y="1800" font-family="Arial, sans-serif" font-size="23" fill="#E0D6C5">Shortlist Online: www.decorbeats.com/diwali-stock</text>
  </svg>`;

  const composites = [];
  if (heroBuf) {
    composites.push({ input: heroBuf, left: 110, top: 174 });
  }
  if (angle2Buf) {
    composites.push({ input: angle2Buf, left: W - 338, top: 794 });
  }

  return await sharp(Buffer.from(svg))
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function renderReelOutroSlide(reelDef) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#14110F"/>
    <rect width="${W}" height="22" fill="#C59B43"/>
    <rect y="${H - 22}" width="${W}" height="22" fill="#C59B43"/>
    <rect x="36" y="48" width="${W - 72}" height="${H - 96}" rx="28" fill="none" stroke="#C59B43" stroke-opacity="0.55" stroke-width="2"/>

    <text x="${W / 2}" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#E5C878">DECORBEATS · DEEPAWALI 2026 STOCK CLEARANCE</text>
    <text x="${W / 2}" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="76" font-weight="bold" fill="#FFFFFF">54 Designs.</text>
    <text x="${W / 2}" y="475" text-anchor="middle" font-family="Georgia, serif" font-size="76" font-weight="bold" fill="#C59B43">2,002 Ready Units.</text>

    <rect x="84" y="580" width="${W - 168}" height="380" rx="28" fill="#221D19" stroke="#C59B43" stroke-width="2.5"/>
    <text x="${W / 2}" y="665" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#E5C878">HOW TO ORDER IN 60 SECONDS</text>
    <text x="134" y="740" font-family="Arial, sans-serif" font-size="30" fill="#FFFFFF">1. Visit www.decorbeats.com/diwali-stock</text>
    <text x="134" y="810" font-family="Arial, sans-serif" font-size="30" fill="#FFFFFF">2. Tap "+ Shortlist" on your favourite SKUs &amp; set Qty</text>
    <text x="134" y="880" font-family="Arial, sans-serif" font-size="30" fill="#FFFFFF">3. Tap "Send Shortlist on WhatsApp" for instant quote</text>

    <rect x="84" y="1040" width="${W - 168}" height="280" rx="28" fill="#13332D" stroke="#E5C878" stroke-width="3"/>
    <text x="${W / 2}" y="1125" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#E5C878">DIRECT WHATSAPP CONCIERGE (MEGHA)</text>
    <text x="${W / 2}" y="1210" text-anchor="middle" font-family="Georgia, serif" font-size="60" font-weight="bold" fill="#FFFFFF">${esc(DECORBEATS_BRAND.phoneDisplay)}</text>
    <text x="${W / 2}" y="1275" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#E0D6C5">Single Pieces · Festive Hampers · Corporate Bulk Gifting</text>

    <text x="${W / 2}" y="1560" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#FAF6EE">Bengaluru Experience Center · Kodichikkanahalli</text>
    <text x="${W / 2}" y="1620" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#C59B43">Moradabad Atelier (Pital Nagri) · GST: KA, TN, MH</text>
  </svg>`;

  return await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

export const CONVERSION_PLAYBOOK_SCRIPTS = [
  {
    id: 'msg-01-vip-personal-dm',
    channel: 'WhatsApp 1-on-1 VIP DM',
    target: 'Past Buyers, Friends & Warm Leads',
    title: 'Personal Lightbox Stock Invite (High Response Rate)',
    copy: `Hi! 🪔 Ahead of Deepawali, we just finished weighing and photographing our available Moradabad solid brass & festive gifting stock in the Bengaluru warehouse — 54 designs with exact gram weights and dimensions on every card.

Before we open up final clearance to bulk buyers, I wanted to share our interactive lookbook with you first so you can shortlist any diyas, urlis, idols, or gift sets you like:
👉 https://www.decorbeats.com/diwali-stock

You can tap "+ Shortlist" on any piece and send it straight back on WhatsApp—no minimum order!`
  },
  {
    id: 'msg-02-corporate-hr-founders',
    channel: 'WhatsApp / LinkedIn Outbound',
    target: 'Corporate HR, Admin Heads & Founders',
    title: 'Zero-Lead-Time Corporate Diwali Gifting Pitch',
    copy: `Hi! If you are sorting out Deepawali gifting for your team or clients this week and want to avoid last-minute vendor delays, we have *1,780+ ready-to-dispatch units* in our Bengaluru warehouse across 22 bestselling Moradabad brass & festive hamper SKUs.

✅ Royal Velvet Gift Boxed Bowl Sets, Enamel Jali Dry-Fruit Jar Trays, Solid Brass Kamal Diyas, Kalpavriksha Trees & Brass Apple Paperweights
✅ Every item is studio-weighed (grams/kg) & dimension-verified
✅ Multi-State GST Invoicing (KA, TN, MH) + Express Dispatch

Browse the Corporate Ready-Stock Edit & build a quick shortlist here:
👉 https://www.decorbeats.com/diwali-stock?pack=pack-1-corporate-bulk-gifting`
  },
  {
    id: 'msg-03-collector-idols-scarcity',
    channel: 'WhatsApp Broadcast / Status',
    target: 'Home Mandir & Brass Collectors',
    title: 'Collector Brass Idols — Scarcity Alert (1 to 4 Pcs Left)',
    copy: `🙏 *Only 1 to 4 Pieces Left Per Design — Superfine Moradabad Solid Brass Idols*

Our heaviest, hand-carved temple idols are now in final stock before Dhanteras & Deepawali:
• *DB-DW26-30*: 1.44 kg Shankh-Chakra-Gada Ganesha (6.5") — *Only 1 Left*
• *DB-DW26-31*: 1.38 kg Lakshmi-Ganesha Pair (5.5") — *Only 1 Pair Left*
• *DB-DW26-34*: 1.46 kg Seated Chaturbhuja Ganesha (6") — *Only 2 Left*
• *DB-DW26-50*: 370 g Kneeling Panchmukhi Hanuman (4") — *Only 2 Left*
• *DB-DW26-41*: 330 g Sheshashayi Vishnu-Lakshmi (4") — *Only 3 Left*

See all 4 studio angles & reserve yours before they are gone:
👉 https://www.decorbeats.com/diwali-stock?pack=pack-2-sacred-brass-idols`
  },
  {
    id: 'msg-04-bengaluru-apartment-groups',
    channel: 'WhatsApp Community / Apartment Groups',
    target: 'Bengaluru Residents & Walk-In / Same-Day Delivery Buyers',
    title: 'Bengaluru Warehouse Clearance & Same-Day Porter/Dispatch',
    copy: `🪔 *Neighbourly Deepawali Brass & Festive Decor Edit — Kodichikkanahalli, Bengaluru!* 🪔

Skip crowded markets and hollow sheet-metal decor! We have just published our *54-Design Lightbox Verified Stock Catalogue* straight from our Kodichikkanahalli Experience Center — featuring 100% solid Moradabad brass diyas, 2.56 kg marigold urlis, temple bells, Pichwai trays, and dry-fruit hamper sets.

⚖️ Every item shows its *exact digital scale weight in grams* & *dual dimensions (cm & inches)*
🚚 Same-day Dunzo/Porter dispatch across Bengaluru or walk-in pickup!

Browse & shortlist in 1 tap:
👉 https://www.decorbeats.com/diwali-stock
📞 WhatsApp Megha: +91 98111 33661`
  },
  {
    id: 'msg-05-return-gifts-under-budget',
    channel: 'WhatsApp Broadcast',
    target: 'Laxmi Pooja Hosts, Wedding & Return Gift Buyers',
    title: '100+ Stock Pooja Return Gifts (Kamal Diyas, Brass Plates & Wish Trees)',
    copy: `✨ *Planning Diwali Return Gifts or Society Pooja Favours?*

We have bulk ready stock of pure solid Moradabad brass keepsakes that guests actually treasure for years:
• *100 Pcs Ready*: Blooming Kamal Solid Brass Diya (80 g) — DB-DW26-20
• *100 Pcs Ready*: Sacred Kalpavriksha Brass Wish Tree (160 g) — DB-DW26-38
• *170 Pcs Ready*: Kuber Pedestal Solid Brass Diya (45 g) — DB-DW26-23
• *254 Pcs Ready*: Engraved Solid Brass Pooja & Bhog Plates (4", 6" & 7")
• *45 Pcs Ready*: 330 g Solid Brass Apple Paperweight — DB-DW26-52

Shortlist your quantities here & get an instant bulk quote on WhatsApp:
👉 https://www.decorbeats.com/diwali-stock?pack=pack-5-pooja-essentials-return-gifts`
  },
  {
    id: 'msg-06-status-sequence-3-step',
    channel: 'WhatsApp Status 3-Slide Sequence',
    target: 'All Contacts Viewing WhatsApp Status',
    title: 'Daily 3-Story WhatsApp Status Conversion Formula',
    copy: `📲 *POST THESE 3 STATUS UPDATES BACK-TO-BACK:*

1️⃣ *Status 1 (Upload Board-2-Sacred-Brass-Idols.jpg or Reel-01):*
"Why we weigh every single brass idol & urli on a digital scale before Deepawali ⚖️👇"

2️⃣ *Status 2 (Upload Board-1-Corporate-Bulk-Gifting.jpg):*
"54 Designs · 2,002 Ready Units in our Bengaluru Warehouse — Single Pieces to Corporate Bulk Gifting 🎁"

3️⃣ *Status 3 (Text Status with Link):*
"Tap to browse all 54 items with 4 studio angles & build your Diwali shortlist in 60 seconds: https://www.decorbeats.com/diwali-stock"`
  }
];

export async function buildConversionReels() {
  const localDraftsPath = path.join(rootDir, 'public', 'catalogues', 'lightbox-captures.json');
  if (!fs.existsSync(localDraftsPath)) {
    throw new Error(`lightbox-captures.json not found at ${localDraftsPath}`);
  }
  const rawDrafts = JSON.parse(fs.readFileSync(localDraftsPath, 'utf8'));
  const allItems = rawDrafts
    .map((d) => normalizeCatalogueItem(d, 'draft'))
    .filter((x) => x && x.imageUrl);
  const bySku = new Map(allItems.map((x) => [x.sku, x]));

  const reelsDir = path.join(rootDir, 'public', 'catalogues', 'reels');
  fs.mkdirSync(reelsDir, { recursive: true });

  const builtReels = [];

  for (const reelDef of REEL_DEFINITIONS) {
    const reelItems = reelDef.skus.map((sku) => bySku.get(sku)).filter(Boolean);
    const totalUnits = reelItems.reduce((s, x) => s + (Number(x.quantity) || 0), 0);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `decorbeats-reel-${reelDef.id}-`));
    try {
      const slideBuffers = [];
      const introBuf = await renderReelIntroSlide(reelDef, totalUnits);
      slideBuffers.push({ buf: introBuf, duration: 2.3 });

      // Save cover poster
      const posterPath = path.join(reelsDir, reelDef.posterFilename);
      fs.writeFileSync(posterPath, introBuf);

      for (let i = 0; i < reelItems.length; i++) {
        const pBuf = await renderReelProductSlide(reelItems[i], i + 1, reelItems.length, reelDef);
        slideBuffers.push({ buf: pBuf, duration: 2.4 });
      }

      const outroBuf = await renderReelOutroSlide(reelDef);
      slideBuffers.push({ buf: outroBuf, duration: 2.6 });

      const concatLines = [];
      for (let idx = 0; idx < slideBuffers.length; idx++) {
        const framePath = path.join(tmpDir, `slide-${String(idx).padStart(2, '0')}.jpg`);
        fs.writeFileSync(framePath, slideBuffers[idx].buf);
        concatLines.push(`file '${framePath.replace(/'/g, "'\\''")}'`);
        concatLines.push(`duration ${slideBuffers[idx].duration}`);
      }
      // Repeat last frame for ffmpeg concat demuxer compatibility
      const lastFramePath = path.join(
        tmpDir,
        `slide-${String(slideBuffers.length - 1).padStart(2, '0')}.jpg`
      );
      concatLines.push(`file '${lastFramePath.replace(/'/g, "'\\''")}'`);

      const listPath = path.join(tmpDir, 'slides.txt');
      fs.writeFileSync(listPath, concatLines.join('\n'), 'utf8');

      const outMp4Path = path.join(reelsDir, reelDef.filename);
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          listPath,
          '-vf',
          'fps=30,scale=1080:1920:flags=lanczos,format=yuv420p',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '22',
          '-movflags',
          '+faststart',
          outMp4Path
        ],
        { stdio: 'ignore' }
      );

      const stat = fs.statSync(outMp4Path);
      builtReels.push({
        id: reelDef.id,
        eyebrow: reelDef.eyebrow,
        title: reelDef.hookTitle,
        subtitle: reelDef.hookSubtitle,
        videoUrl: `/catalogues/reels/${reelDef.filename}`,
        posterUrl: `/catalogues/reels/${reelDef.posterFilename}`,
        sizeMB: Number((stat.size / (1024 * 1024)).toFixed(2)),
        durationSec: Math.round(slideBuffers.reduce((s, x) => s + x.duration, 0)),
        skus: reelDef.skus,
        caption: reelDef.caption
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  const playbookPayload = {
    generatedAt: new Date().toISOString(),
    totalSkus: allItems.length,
    totalReadyUnits: allItems.reduce((s, x) => s + (Number(x.quantity) || 0), 0),
    lookbookUrl: 'https://www.decorbeats.com/diwali-stock',
    reels: builtReels,
    scripts: CONVERSION_PLAYBOOK_SCRIPTS
  };

  const playbookPath = path.join(rootDir, 'public', 'catalogues', 'diwali-conversion-playbook.json');
  fs.writeFileSync(playbookPath, JSON.stringify(playbookPayload, null, 2), 'utf8');

  return playbookPayload;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildConversionReels()
    .then((res) => {
      console.log(
        JSON.stringify(
          {
            totalSkus: res.totalSkus,
            totalReadyUnits: res.totalReadyUnits,
            reels: res.reels.map((r) => ({
              id: r.id,
              videoUrl: r.videoUrl,
              sizeMB: r.sizeMB,
              durationSec: r.durationSec
            })),
            scriptsCount: res.scripts.length
          },
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
