/**
 * Decorbeats — WhatsApp "DecorBeats Marketing" Group Lightbox Sync
 *
 * Reads today's (2026-10-17+) product photo albums & captions from the local
 * macOS WhatsApp SQLite database (`ZCHATSESSION = 895`, "DecorBeats Marketing"),
 * copies all high-res lightbox photos into `public/catalogues/whatsapp-2026-10-17/`,
 * enriches each item with parsed weight (g), dimensions (cm + inches), stock quantity,
 * and curated titles/descriptions, and writes `public/catalogues/lightbox-captures.json`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const WHATSAPP_SHARED_DIR =
  '/Users/k0d3/Library/Group Containers/group.net.whatsapp.WhatsApp.shared';
const WHATSAPP_DB_PATH = path.join(WHATSAPP_SHARED_DIR, 'ChatStorage.sqlite');
const WHATSAPP_MEDIA_ROOT = path.join(WHATSAPP_SHARED_DIR, 'Message');
const MARKETING_CHAT_SESSION = 895; // 120363400403211823@g.us (DecorBeats Marketing)

/**
 * Curated overrides for the albums visually inspected from today's lightbox shoot (2026-10-17),
 * keyed by the first message Z_PK of the album.
 * Ensures the cleanest non-hand top-down photo is selected as Hero (`heroIndex`) and
 * provides rich, accurate product names & descriptions matching the visual artwork.
 */
const CURATED_ALBUM_OVERRIDES = {
  96372: {
    sku: 'DB-DW26-01',
    name: 'Kalamkari Deer Print Iron Jali Tray (Gold Rim)',
    category: 'Festive Trays & Platters',
    material: 'Enamel-Printed Iron with Gold Jali Rim',
    unit: '1 Decorative Iron Jali Tray',
    heroMediaSubpath: '986eac3f-f139-48c4-bfd5-e8b3624d9d10.jpg',
    description:
      'Handcrafted 27 cm decorative iron tray featuring an intricate Kalamkari twin-deer forest motif on a vibrant festive crimson base, framed by a raised 5 cm pierced gold jali rim.'
  },
  96375: {
    sku: 'DB-DW26-02',
    name: 'Lotus & Pichwai Floral Iron Jali Tray (Gold Rim)',
    category: 'Festive Trays & Platters',
    material: 'Enamel-Printed Iron with Gold Jali Rim',
    unit: '1 Decorative Iron Jali Tray',
    stockNote: 'Stock Count in Progress · Enquire on WhatsApp',
    heroMediaSubpath: 'e6c7b3a2-cd42-4d86-a0c4-8bf2dc4c0c21.jpg',
    galleryOrderSubpaths: [
      'e6c7b3a2-cd42-4d86-a0c4-8bf2dc4c0c21.jpg',
      '28025f2c-95ae-443b-87a4-02c3630fb6b6.jpg',
      'ed47f70f-116b-4c9c-aaf7-9b5869520975.jpg',
      '2e178f92-9769-4a39-821c-905df0c22cf6.jpg'
    ],
    description:
      'Generous 27 cm festive iron hamper and pooja tray adorned with blooming pink Pichwai lotus motifs against a serene aqua-mint backdrop, finished with a 5 cm high golden cutout jali border.'
  },
  96380: {
    sku: 'DB-DW26-03',
    name: 'Royal Peacock Motif Iron Jali Tray — Emerald Green',
    category: 'Festive Trays & Platters',
    material: 'Enamel-Printed Iron with Gold Jali Rim',
    unit: '1 Decorative Iron Jali Tray',
    heroMediaSubpath: '3a4553ec-d18f-40de-aacb-e45fe26fe02c.jpg',
    galleryOrderSubpaths: [
      '3a4553ec-d18f-40de-aacb-e45fe26fe02c.jpg',
      'd630ae21-c4b2-477c-a090-4cba6654d5f1.jpg',
      'cdbf21b1-9d8b-408b-b4e8-b4d6801c94d8.jpg'
    ],
    description:
      'Regal 27 cm emerald-green decorative iron tray showcasing a traditional royal peacock amidst floral vines, encircled by a gleaming 5 cm golden pierced jali rim for luxury Diwali gifting.'
  },
  96384: {
    sku: 'DB-DW26-04',
    name: 'Royal Peacock Motif Iron Jali Tray — Festive Crimson',
    category: 'Festive Trays & Platters',
    material: 'Enamel-Printed Iron with Gold Jali Rim',
    unit: '1 Decorative Iron Jali Tray',
    heroMediaSubpath: 'c9f1a7a8-c0ef-49b7-89a8-d8503a87ad34.jpg',
    galleryOrderSubpaths: [
      'c9f1a7a8-c0ef-49b7-89a8-d8503a87ad34.jpg',
      '81ddc784-3bdd-44ac-889d-e1c81020ec46.jpg',
      'd166626b-8d56-464f-a577-c7754c615468.jpg',
      '65127ba4-6452-475e-9643-fed7cdbbf5ef.jpg'
    ],
    description:
      'Auspicious crimson-red 27 cm iron jali tray featuring an ornate royal peacock and botanical illustration with a 5 cm raised gold filigree border. Ideal for dry-fruit hampers and festive styling.'
  },
  96389: {
    sku: 'DB-DW26-05',
    name: 'Botanical Petals Print Compact Iron Jali Tray (15 cm)',
    category: 'Festive Trays & Platters',
    material: 'Enamel-Printed Iron with Gold Jali Rim',
    unit: '1 Compact Iron Jali Tray',
    quantityOverride: 40,
    stockNote: '40 Ready to Ship (100 Total · 60 Pcs Booked)',
    heroMediaSubpath: '5a8b4646-b15e-443d-8942-20c3cbb34492.jpg',
    galleryOrderSubpaths: [
      '5a8b4646-b15e-443d-8942-20c3cbb34492.jpg',
      'df8fe1b5-35a2-4d3a-906f-3ff1cf8cd442.jpg',
      '30eae982-5939-47d0-b991-892a837f7e30.jpg',
      'a4dbe64c-b9f5-4f9e-bdf6-cdbd06c4a6b0.jpg'
    ],
    description:
      'Compact 15 cm round decorative iron tray featuring delicate crimson and blush botanical petals on a warm ivory bed with a 5 cm gold pierced jali rim. Perfect for return gifts, tealights, and sweet boxes.'
  },
  96395: {
    sku: 'DB-DW26-06',
    name: 'Vintage English Rose Oval Iron Jali Tray (19.5 × 11 cm)',
    category: 'Festive Trays & Platters',
    material: 'Powder-Coated & Enamel-Printed Iron',
    unit: '1 Oval Iron Jali Tray',
    heroMediaSubpath: '34750fd7-cb9a-42e8-9bc7-f20f2a11e5aa.jpg',
    galleryOrderSubpaths: [
      '34750fd7-cb9a-42e8-9bc7-f20f2a11e5aa.jpg',
      '1275be6d-9f10-4d63-979b-fa5916dabec4.jpg',
      '717e1a23-c5c1-4cbf-a846-b6851a892324.jpg'
    ],
    description:
      'Graceful oval decorative iron tray (19.5 cm wide × 11 cm breadth × 5 cm high) finished in soft ivory with a vintage rose bouquet print and geometric lattice cutout gallery rim.'
  },
  96451: {
    sku: 'DB-DW26-07',
    name: 'Textured Golden Leaf Platter with Solid Brass Lotus Diya',
    category: 'Diyas & Pooja Platters',
    material: 'Thick Cast Aluminium Platter & Solid Brass Diya',
    unit: '1 Leaf Platter + 1 Brass Diya',
    heroMediaSubpath: 'c5ba007f-ec9a-4106-8cc3-6187cb963682.jpg',
    galleryOrderSubpaths: [
      'c5ba007f-ec9a-4106-8cc3-6187cb963682.jpg',
      '34802a5d-4f9d-4697-8baa-e6a1d7d401c8.jpg',
      '06cef4af-1b05-4b7c-956a-4a64d2556383.jpg'
    ],
    description:
      'Substantial 275 g festive centerpiece pairing a 20 cm thick golden leaf-veined platter and scalloped rim with a traditional 5-wick solid brass lotus diya at the center.'
  },
  96456: {
    sku: 'DB-DW26-08',
    name: 'Golden Floral Wreath Hammered Petal Urli (12 cm)',
    category: 'Urlis & Floating Bowls',
    material: 'Golden Finished Hammered Aluminium',
    unit: '1 Decorative Petal Urli',
    heroMediaSubpath: '0743f90d-5ff0-437e-ac68-a663c0fcbcb8.jpg',
    galleryOrderSubpaths: [
      '0743f90d-5ff0-437e-ac68-a663c0fcbcb8.jpg',
      '4021ff87-4f7e-41e7-8304-445afd316e8b.jpg',
      '220c62a2-7802-4692-888a-91cd6b32b4db.jpg'
    ],
    description:
      'Charming 12 cm golden floral urli bowl with a hammered center well and sculpted blossom-and-leaf wreath flange. Ideal for floating rose petals, tealights, and festive table accents.'
  },
  96462: {
    sku: 'DB-DW26-09',
    name: 'Golden Hammered Urli Centerpiece with 6 Fluted Diya Cups',
    category: 'Urlis & Diya Thaals',
    material: 'Thick Golden Finished Aluminium',
    unit: '1 Urli Ring with 6 Integrated Diyas',
    heroMediaSubpath: '16b5a7b4-f3a4-4b2e-a90e-8e7996180606.jpg',
    galleryOrderSubpaths: [
      '16b5a7b4-f3a4-4b2e-a90e-8e7996180606.jpg',
      'b5b3ee9c-a854-4141-a427-3caa4142f0f3.jpg',
      '1d30ca85-54ff-4b52-b5d2-da63db71bbe7.jpg'
    ],
    description:
      'Radiant 18 cm festive illumination centerpiece featuring a central hammered floating-flower urli bowl surrounded by a ring of 6 fluted diya oil lamps.'
  },
  96466: {
    sku: 'DB-DW26-10',
    name: 'Meenakari Twin Peacock Engraved Solid Brass Plate (16 cm)',
    category: 'Brass Pooja Thalis & Plates',
    material: '100% Solid Moradabad Brass with Meenakari Enamel',
    unit: '1 Engraved Solid Brass Plate',
    heroMediaSubpath: 'ab48a7dd-be6f-41fa-91f3-b44107dd3af5.jpg',
    galleryOrderSubpaths: [
      'ab48a7dd-be6f-41fa-91f3-b44107dd3af5.jpg',
      '14d74b38-1431-4853-bdf8-3b6b76c5b4cc.jpg',
      '13ddb1d4-8fc9-4f8d-9ebb-2914671fbc92.jpg',
      '8fa1bcbc-cdb8-4356-8433-e6c7c8ea9ac0.jpg'
    ],
    description:
      'Exquisite 16 cm solid Moradabad brass plate with a fluted golden rim and finely stippled twin-peacock motif hand-accented in vibrant ruby, royal blue, and emerald Meenakari tones.'
  },
  96471: {
    sku: 'DB-DW26-11',
    name: 'Floral Engraved Fluted Solid Brass Pooja Plate (10 cm / 4")',
    category: 'Brass Pooja Thalis & Plates',
    material: '100% Solid Thick Moradabad Brass',
    unit: '1 Engraved Solid Brass Plate',
    heroMediaSubpath: 'ca46594b-812c-4d77-a54a-2a8b19962cba.jpg',
    galleryOrderSubpaths: [
      'ca46594b-812c-4d77-a54a-2a8b19962cba.jpg',
      '9edfe0ee-0d58-4faf-8319-e26eaeb3bc88.jpg',
      'd375ecb3-27ce-4401-856d-1c638b4e6e86.jpg'
    ],
    description:
      'Thick 50 g solid Moradabad brass ritual & prasad plate (10 cm / 4 inch diameter) featuring a finely stippled floral vine center and classic fluted gallery rim.'
  },
  96475: {
    sku: 'DB-DW26-12',
    name: 'Floral Engraved Fluted Solid Brass Pooja Plate (8.9 cm / 3.5")',
    category: 'Brass Pooja Thalis & Plates',
    material: '100% Solid Thick Moradabad Brass',
    unit: '1 Engraved Solid Brass Plate',
    heroMediaSubpath: '147815a0-d045-4a5d-b57c-c2013f55c748.jpg',
    galleryOrderSubpaths: [
      '147815a0-d045-4a5d-b57c-c2013f55c748.jpg',
      '5aeef751-a058-4d12-9838-029b179a1427.jpg',
      '1567af27-8371-4d25-bbf6-e809e4dcc7f4.jpg',
      'c3a4ebf3-b977-41fc-9ca6-4cb4af836907.jpg'
    ],
    description:
      'Compact 32 g solid Moradabad brass kumkum, arti, and prasad plate (8.9 cm / 3.5 inch diameter) with intricate botanical engraving and a gleaming fluted border.'
  },
  96480: {
    sku: 'DB-DW26-13',
    name: 'Crimson Enamel Ganesha Leaf Base with Solid Brass Pyali Diya',
    category: 'Diyas & Pooja Platters',
    material: 'Enamel-Finished Aluminium Leaf Base & Solid Brass Diya',
    unit: '1 Leaf Diya Stand with Solid Brass Cup',
    heroMediaSubpath: '41042b31-b53c-4abc-a39f-237705de3a8a.jpg',
    galleryOrderSubpaths: [
      '41042b31-b53c-4abc-a39f-237705de3a8a.jpg',
      '2df2e6e9-8294-4757-9894-9045bb4ac2e8.jpg'
    ],
    description:
      'Auspicious 4 inch (10.2 cm) scalloped golden-rimmed crimson leaf base adorned with a traditional Ganesha motif and topped with a raised solid brass bati diya cup (40 g).'
  },
  96487: {
    sku: 'DB-DW26-14',
    name: 'Crimson Enamel Sacred Chakra Leaf Base with Solid Brass Diya',
    category: 'Diyas & Pooja Platters',
    material: 'Enamel-Finished Aluminium Leaf Base & Solid Brass Diya',
    unit: '1 Leaf Diya Stand with Solid Brass Cup',
    heroMediaSubpath: 'e623e72b-4e2a-4268-b9a5-51226d5bdde5.jpg',
    galleryOrderSubpaths: [
      'e623e72b-4e2a-4268-b9a5-51226d5bdde5.jpg',
      'f411b581-c225-4e96-b8f8-d3c2d0eb9cd3.jpg'
    ],
    description:
      'Festive 4 inch (10.2 cm) scalloped golden-rimmed crimson leaf base featuring a sacred lotus-chakra emblem paired with an elevated solid brass pyali diya cup (45 g).'
  },
  96491: {
    sku: 'DB-DW26-15',
    name: 'Pichwai Kamdhenu Cow Enamel Lid Solid Brass Kumkum Dibbi (2")',
    category: 'Brass Pooja Boxes & Dibbis',
    material: 'Solid Brass & Pichwai Enamel Lid',
    unit: '1 Brass Box + Fitted Lid',
    heroMediaSubpath: '2fe3d802-3654-4e71-9196-0e461fb9b2ec.jpg',
    galleryOrderSubpaths: [
      '2fe3d802-3654-4e71-9196-0e461fb9b2ec.jpg',
      'b785c57f-c3ad-4c5e-b2b9-caa59ba6100d.jpg',
      '33c587b2-734a-4b1f-9225-06278b9c474c.jpg'
    ],
    description:
      'Traditional 2 inch (5.1 cm) solid brass kumkum, sindoor, and haldi dibbi (32 g) crowned with a vibrant Pichwai Kamdhenu cow & lotus enamel dome lid in assorted festive colors.'
  },
  96496: {
    sku: 'DB-DW26-16',
    name: 'Embossed Golden Stag Enamel Leaf Base with Solid Brass Diya',
    category: 'Diyas & Pooja Platters',
    material: 'Enamel Aluminium Leaf & Brass Diya',
    unit: '1 Leaf Base + Brass Diya',
    quantityOverride: 36,
    stockNote: 'Yellow: 10 · Crimson Red: 16 · Blue: 10',
    heroMediaSubpath: 'a2d419f3-1b02-4c73-990a-0192c9cc36bf.jpg',
    galleryOrderSubpaths: [
      'a2d419f3-1b02-4c73-990a-0192c9cc36bf.jpg',
      '66cf1a97-2a9e-4de1-8b32-611d6521fbe6.jpg'
    ],
    description:
      'Sculpted 4 inch (10.2 cm) scalloped maple-leaf aluminium base in glossy Yellow, Crimson Red, and Powder Blue enamel featuring an embossed golden stag accent and raised solid brass pyali diya (45 g).'
  },
  96499: {
    sku: 'DB-DW26-17',
    name: 'Antique Silver Kamdhenu Cow & Calf Idol on Pedestal (with Brass Bell)',
    category: 'Sacred Idols & Figurines',
    material: 'Antique Silver Aluminium & Brass Bell',
    unit: '1 Single Cow & Calf Idol',
    quantityOverride: 100,
    stockNote: '41 Right-Facing · 59 Left-Facing (100 Pcs)',
    heroMediaSubpath: 'd5aa9445-ab7c-4602-8f45-56920adfb4a2.jpg',
    galleryOrderSubpaths: [
      'd5aa9445-ab7c-4602-8f45-56920adfb4a2.jpg',
      '93b362fc-4541-4061-9e13-87733ca52ab9.jpg',
      '239e7418-03ee-4f3f-8a69-c61243055a5c.jpg',
      '5f40cb33-0984-433e-897c-e99ba5d24bfa.jpg'
    ],
    description:
      'Auspicious 4 inch (10.2 cm) oxidized antique-silver finish Kamdhenu cow and suckling calf idol on an ornate scalloped pedestal with a hanging golden brass bell.'
  },
  96504: {
    sku: 'DB-DW26-18',
    name: 'Multicolor Blooming Lotus Petal Base with Solid Brass Diya (3")',
    category: 'Diyas & Pooja Platters',
    material: 'Painted Metal Lotus & Solid Brass Diya',
    unit: '1 Lotus Diya (Assorted Colors)',
    quantityOverride: 80,
    stockNote: '80 Ready · 6 Assorted Festive Lotus Colors',
    heroMediaSubpath: '63eb98e1-3741-403b-bbe1-c277aa1920f6.jpg',
    galleryOrderSubpaths: [
      '63eb98e1-3741-403b-bbe1-c277aa1920f6.jpg',
      'e288a210-a0b8-451e-9389-be18ce4a99f4.jpg',
      'f67ae40d-eaad-4985-9f6e-2cb100fefc94.jpg'
    ],
    description:
      'Vibrant 3 inch (7.6 cm) double-layered blooming lotus petal metal base in 6 festive colors (Marigold, Yellow, Magenta, Crimson, Blue & Violet) topped with a solid brass pyali diya cup (26 g).'
  },
  96508: {
    sku: 'DB-DW26-19',
    name: 'Golden Embossed Pipal Leaf Base with Solid Brass Pyali Diya (4")',
    category: 'Diyas & Pooja Platters',
    material: 'Golden Aluminium Leaf & Brass Diya',
    unit: '1 Leaf Base + Brass Diya',
    heroMediaSubpath: 'd1d6889b-3e5e-406f-8b01-f48e570d9aa1.jpg',
    galleryOrderSubpaths: [
      'd1d6889b-3e5e-406f-8b01-f48e570d9aa1.jpg',
      '16885b1d-2812-423a-bfb4-6c5b5425c63d.jpg',
      '91c74c67-562e-412b-afc0-a3d8e4780d29.jpg',
      '537a56c0-2be3-471a-97b8-be1db8797116.jpg'
    ],
    description:
      'Auspicious 4 inch (10.2 cm) golden veined pipal-leaf aluminium base with serrated edges and stem, crowned with a concentric-ring solid brass pyali bati diya cup (22 g).'
  },
  96513: {
    sku: 'DB-DW26-20',
    name: 'Kolam Engraved Solid Brass Lotus Kamal Stand / Footed Thali (4")',
    category: 'Brass Pooja Thalis & Plates',
    material: '100% Solid Moradabad Brass',
    unit: '1 Footed Brass Kamal Stand',
    heroMediaSubpath: 'fe7f6062-3a0d-42a7-862d-e16364ea2f9e.jpg',
    galleryOrderSubpaths: [
      'fe7f6062-3a0d-42a7-862d-e16364ea2f9e.jpg',
      '3a196f16-f470-4aa5-9df8-31b60d531430.jpg',
      '85219c77-1a15-416e-bfb2-57ce0d47bf45.jpg'
    ],
    description:
      'Sacred 4" × 1.5" (10.2 × 3.8 cm) solid Moradabad brass footed lotus kamal stand (73 g) featuring an auspicious Kolam mandala & lotus garland engraving on a double-scalloped petal pedestal.'
  },
  96517: {
    sku: 'DB-DW26-21',
    name: 'Pichwai & Kalamkari Enamel Metal Jar with Crystal Knob Lid (4")',
    category: 'Festive Jars & Utility',
    material: 'Enamel-Printed Metal & Crystal Knob',
    unit: '1 Lidded Jar (Assorted Prints)',
    quantityOverride: 100,
    stockNote: '100 Ready · Assorted Pichwai & Kalamkari Prints',
    heroMediaSubpath: '48c5091d-bc2f-432c-b127-d29cd95db030.jpg',
    galleryOrderSubpaths: [
      '48c5091d-bc2f-432c-b127-d29cd95db030.jpg',
      '7f1e1af3-0a42-4f15-8ffe-612699faaba4.jpg',
      '310f7c17-a713-4dbe-824c-2347d198bc64.jpg',
      '6e59821e-96e7-48f0-a181-b5a3865d30b4.jpg'
    ],
    description:
      'Handcrafted 4 inch (10.2 cm) pot-bellied metal dry-fruit and mukhwas jar (163 g) in assorted Pichwai Kamdhenu cow, Kalamkari tree-of-life, and lotus prints, crowned with a faceted crystal knob lid.'
  },
  96522: {
    sku: 'DB-DW26-22',
    name: 'Tropical Cockatoo Enamel Square Silver Filigree Tray (8" × 8")',
    category: 'Festive Trays & Platters',
    material: 'Silver-Finish Filigree Metal & Enamel',
    unit: '1 Square Filigree Tray (8")',
    heroMediaSubpath: '1abd1c03-649a-4ea2-80bd-4c6033ac3297.jpg',
    galleryOrderSubpaths: [
      '1abd1c03-649a-4ea2-80bd-4c6033ac3297.jpg',
      '76f9969f-4bc6-4be5-b5a4-905e3d980094.jpg',
      '6e4760ed-336c-454b-9ee2-7e6bd4e620b3.jpg',
      '0115cef4-311f-4f9b-adb8-d4995dd1f59b.jpg'
    ],
    description:
      'Substantial 338 g square decorative metal tray (8 inch / 20.3 cm) showcasing a glossy sage-green tropical cockatoo and blossom enamel bed, framed by a pierced silver filigree gallery rim on ball feet.'
  },
  96527: {
    sku: 'DB-DW26-23',
    name: 'Pichwai Kamdhenu Cow Royal Arch Platter on Golden Elephant Feet (13")',
    category: 'Festive Trays & Platters',
    material: 'Heavy-Gauge Metal & Cast Elephant Feet',
    unit: '1 Footed Royal Platter (13")',
    stockNote: '1 Exclusive Collector Piece Available',
    heroMediaSubpath: '3a5c0010-3219-416d-ac76-0b255a7abb6d.jpg',
    galleryOrderSubpaths: [
      '3a5c0010-3219-416d-ac76-0b255a7abb6d.jpg',
      '57051d9d-dcff-41b8-8b55-364f9d5bc3ce.jpg',
      '1e3dc35d-756e-4150-a5dd-2a168ab7633b.jpg',
      'a8c3cf33-6718-4f70-9f4e-7032e23e4a0c.jpg'
    ],
    description:
      'Grand 13 inch (33 cm) heavy-gauge round statement platter featuring a Pichwai Kamdhenu cow and blooming lotus jharokha painting, elevated on sculpted golden trunk-up elephant legs.'
  },
  96533: {
    sku: 'DB-DW26-24',
    name: 'Golden Filigree Jali Pooja & Gift Basket with Twisted Handle (4")',
    category: 'Festive Baskets & Trays',
    material: 'Golden Finished Embossed Filigree Metal',
    unit: '1 Golden Basket with Handle',
    heroMediaSubpath: '4d407d50-4fdd-4c63-bff9-b94eea1e3a1f.jpg',
    galleryOrderSubpaths: [
      '4d407d50-4fdd-4c63-bff9-b94eea1e3a1f.jpg',
      '8cfcd5d5-5798-4854-9b48-ddc3ba1194db.jpg',
      '005afc4b-d89a-4c5d-ade0-9b90466c950b.jpg',
      '410b7baf-6154-42b6-8073-92ade1178e3c.jpg'
    ],
    description:
      'Charming 4" × 2" (10.2 × 5.1 cm) golden metal filigree basket (74 g) with a pierced teardrop jali gallery wall and twisted-rope arch handle for pooja flowers, chocolates, and return gifts.'
  },
  96541: {
    sku: 'DB-DW26-25',
    name: 'Pichwai Lotus Enamel Metal Jar Set of 2 in Crimson Gift Box (3.5")',
    category: 'Festive Gift Box Sets',
    material: 'Enamel Metal Jars & Gold Crystal Lids',
    unit: 'Set of 2 Jars in Gift Box',
    quantityOverride: 43,
    stockNote: '43 Gift Boxes Ready (2 Jars / Box · 86 Jars)',
    heroMediaSubpath: 'ae5de8c5-e4e0-4e03-a299-6788b092000d.jpg',
    galleryOrderSubpaths: [
      'ae5de8c5-e4e0-4e03-a299-6788b092000d.jpg',
      '384782c3-d881-49e6-98aa-5093f41590a4.jpg',
      '4a2a7bee-64b4-4814-936d-8fcbf51096eb.jpg',
      '2c69c063-43e1-4075-be63-fc5a0a275e02.jpg'
    ],
    description:
      'Luxury Diwali hamper set of 2 cylindrical metal dry-fruit jars (230 g each · 3.5" high × 3.5" wide) adorned with blooming Pichwai lotuses, airtight golden crystal-knob lids, and a crimson gift box.'
  },
  96546: {
    sku: 'DB-DW26-26',
    name: 'Lord Ganesha on Lotus Finial Solid Brass Pooja Arti Bell (5")',
    category: 'Brass Pooja Bells & Arti',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Pooja Bell',
    heightOverride: 12.7,
    widthOverride: 5.6,
    lengthOverride: 5.6,
    stockNote: '2 Ready Now · +50 More Pcs Arriving Shortly',
    heroMediaSubpath: '64feead6-e1a9-41fc-ad4e-71c6adc9d8a0.jpg',
    galleryOrderSubpaths: [
      '64feead6-e1a9-41fc-ad4e-71c6adc9d8a0.jpg',
      '6984fd2d-7e87-4fa3-8646-19c9faae310b.jpg',
      'daa484cf-936c-431c-9d7a-cad0d07815dd.jpg'
    ],
    description:
      'Resonant 150 g solid Moradabad brass pooja arti ghanti (5 inch / 12.7 cm tall) crowned with a sculpted four-armed Lord Ganesha seated on a lotus pedestal and an auspicious Om halo on the reverse.'
  },
  96551: {
    sku: 'DB-DW26-27',
    name: 'Meenakari Dancing Peacock Embossed Aluminium Pooja Thali (9.5")',
    category: 'Festive Pooja Thalis',
    material: 'Embossed Meenakari Aluminium',
    unit: '1 Embossed Pooja Thali (9.5")',
    heroMediaSubpath: '4bcbca34-9518-4495-b715-947d1d9ad821.jpg',
    galleryOrderSubpaths: [
      '4bcbca34-9518-4495-b715-947d1d9ad821.jpg',
      '46fab74c-50bd-4b45-aba3-f399fa0303f0.jpg',
      'c8356a33-5e8e-4b34-bbaa-710dcdb12d7e.jpg',
      '76f1b260-9395-457f-9309-2d078b957b5f.jpg'
    ],
    description:
      'Ornate 9.5 inch (24.1 cm) embossed aluminium pooja thali (110 g) showcasing a jewel-toned Meenakari dancing peacock with ruby, emerald, sapphire, and amber plumage inside a crimson-scalloped border.'
  },
  96560: {
    sku: 'DB-DW26-28',
    name: 'Royal Stag Antler Solid Brass Candle Stand (4")',
    category: 'Brass Candle Stands',
    material: 'Mirror-Polished Solid Brass',
    unit: '1 Solid Brass Deer Candle Stand',
    widthOverride: 10.2,
    lengthOverride: 10.2,
    heroMediaSubpath: '56411aec-bd6c-41d0-8389-38eaeb44823c.jpg',
    galleryOrderSubpaths: [
      '56411aec-bd6c-41d0-8389-38eaeb44823c.jpg',
      '8b94951a-0fae-4302-aca8-3b04f1612a61.jpg',
      'bc11c720-1f2f-469e-ad30-97e4523ffcc1.jpg',
      '3d9a88bd-6184-43a5-9665-5bebdcff36d5.jpg'
    ],
    description:
      'Sculptural 190 g mirror-polished solid Moradabad brass stag candle holder (4 inch / 10.2 cm wide) featuring sweeping twin antlers arching above a flared back-mounted taper candle cup.'
  },
  96565: {
    sku: 'DB-DW26-29',
    name: 'Heavy Cast Brass Scrollwork Pedestal Aarti Diya (6.5")',
    category: 'Diyas & Pooja Lamps',
    material: 'Heavy Cast Antique Solid Brass',
    unit: '1 Heavy Designer Brass Diya',
    heightOverride: 6.4,
    widthOverride: 16.5,
    lengthOverride: 14.0,
    heroMediaSubpath: 'aa349952-68ce-4071-aa13-cabfdfcd527b.jpg',
    galleryOrderSubpaths: [
      'aa349952-68ce-4071-aa13-cabfdfcd527b.jpg',
      'aae9e8bf-869f-4140-aa74-cf32dd6281ea.jpg',
      '512d70f4-9692-45df-bfa1-2fb32d35c241.jpg',
      '28c11bff-3322-4c13-b984-47367ce42a55.jpg'
    ],
    description:
      'Heirloom 716 g heavy-cast Moradabad solid brass aarti diya (6.5" W x 5.5" D x 2.5" H) featuring a lotus-carved oil reservoir elevated on an openwork scrollwork pedestal with a curved handle.'
  },
  96571: {
    sku: 'DB-DW26-30',
    name: 'Meenakari Peacock Floral Solid Brass Pooja Ghanti (4")',
    category: 'Sacred Pooja Bells',
    material: 'Meenakari Enamel Solid Brass',
    unit: '1 Solid Brass Pooja Bell (4")',
    heightOverride: 10.2,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    heroMediaSubpath: '8e7c972c-4774-4cec-9520-516567be4d8a.jpg',
    galleryOrderSubpaths: [
      '8e7c972c-4774-4cec-9520-516567be4d8a.jpg',
      '3a229757-fdb1-4663-9d19-a41ad5727aec.jpg',
      'b611906f-2115-42ea-931b-7120733b375b.jpg',
      '633f47c3-e9ea-429d-a446-896c2c9bec52.jpg'
    ],
    description:
      'Resonant 100 g solid Moradabad brass pooja hand bell (4 inch / 10.2 cm high) crowned with a ringed spire handle and hand-inlaid crimson, emerald, and turquoise Meenakari peacock-and-floral enamel.'
  },
  96576: {
    sku: 'DB-DW26-31',
    name: 'Sheshashayi Vishnu Carved Heavy Solid Brass Shankh (7.5")',
    category: 'Sacred Temple Brassware',
    material: 'Heavy Cast Antique Solid Brass',
    unit: '1 Heavy Carved Brass Shankh',
    weightOverride: 1650,
    widthOverride: 10.2,
    lengthOverride: 19.1,
    heroMediaSubpath: 'f02be7e8-19d0-475b-846d-c7fac4a5423f.jpg',
    galleryOrderSubpaths: [
      'f02be7e8-19d0-475b-846d-c7fac4a5423f.jpg',
      'cbea5726-1a90-4312-aba3-acb5c1e95ba2.jpg',
      '07223095-2979-4993-9e2c-4ab6e9b93ce0.jpg',
      '13a0df17-6070-4210-9b63-d3ff109559c0.jpg'
    ],
    description:
      'Monumental 1,650 g (1.65 kg) heavy-cast Moradabad solid brass ritual conch (7.5" L x 4" W) deeply sculpted in high relief with Lord Vishnu reclining on Sheshnag beside Goddess Lakshmi.'
  },
  96582: {
    sku: 'DB-DW26-32',
    name: 'Chaturbhuja Blessing Lord Ganesha Solid Brass Idol (2.5")',
    category: 'Sacred Brass Idols',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Solid Brass Ganesha Idol',
    heightOverride: 6.4,
    heroMediaSubpath: '4b6585f8-fed9-4caf-9021-78460d2bc23e.jpg',
    galleryOrderSubpaths: [
      '4b6585f8-fed9-4caf-9021-78460d2bc23e.jpg',
      '12afdb6b-43e8-49d2-9b42-8c7150cb27ca.jpg',
      'b6c730ca-29c0-4576-9710-a2563ea58152.jpg',
      '47425350-e404-4ba2-b76e-60e719607fce.jpg'
    ],
    description:
      'Dense 250 g solid Moradabad brass seated four-armed Lord Ganesha idol (2.5 inch / 6.4 cm high) engraved with an auspicious Om emblem on the trunk, raised Abhaya Mudra blessing hand, and Modak.'
  },
  96588: {
    sku: 'DB-DW26-33',
    name: 'Royal Peacock Finial Heavy Hanging Brass Temple Bell (7.5")',
    category: 'Hanging Temple Bells',
    material: 'Heavy Cast Antique Solid Brass',
    unit: '1 Brass Bell + 16" Chain',
    weightOverride: 1000,
    heightOverride: 19.1,
    lengthOverride: 40.6,
    heroMediaSubpath: '2079efba-1233-497e-9a77-ad754dc64a96.jpg',
    galleryOrderSubpaths: [
      '2079efba-1233-497e-9a77-ad754dc64a96.jpg',
      'fc7136e0-0659-4822-a7e7-5394372cef45.jpg',
      '05752de9-1cc8-4c9e-8d56-c0390ad2b3ac.jpg',
      'b3fe0d51-d0e7-4eaa-92ae-3ef405d47ffa.jpg'
    ],
    description:
      'Monumental 1,000 g (1.00 kg) heavy-cast Moradabad solid brass hanging temple bell (7.5" / 19.1 cm high) crowned with a sculpted royal peacock finial, 16" (40.6 cm) brass link chain, and S-hook.'
  },
  96594: {
    sku: 'DB-DW26-34',
    name: 'Emerald Malachite Gem-Inlaid Brass Kalpavriksha Tree (7")',
    category: 'Sacred Brass Trees & Decor',
    material: 'Gemstone-Inlaid Solid Brass',
    unit: '1 Gem-Inlaid Brass Tree (7")',
    weightOverride: 470,
    heightOverride: 17.8,
    widthOverride: 15.2,
    lengthOverride: 7.6,
    heroMediaSubpath: '0fb67a02-adfe-457e-8267-9a7c48fcf375.jpg',
    galleryOrderSubpaths: [
      '0fb67a02-adfe-457e-8267-9a7c48fcf375.jpg',
      '1365b834-4f17-4270-96e4-2dcdadaf3eee.jpg',
      'd39d1162-cdb5-4128-8c98-87b93535894c.jpg',
      'e4ab2776-ca4f-4eee-8e5b-5a45e5302fa7.jpg'
    ],
    description:
      'Auspicious 470 g solid Moradabad brass Kalpavriksha wish-fulfilling tree (7" H x 6" W) hand-inlaid with banded emerald-green malachite leaves and lapis-and-malachite cabochons on a domed base.'
  },
  96600: {
    sku: 'DB-DW26-35',
    name: 'Vastu Kurma Tortoise Pedestal Solid Brass Diya (2")',
    category: 'Diyas & Pooja Lamps',
    material: 'Fine Carved Solid Brass',
    unit: '1 Solid Brass Tortoise Diya',
    weightOverride: 70,
    heightOverride: 5.1,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    heroMediaSubpath: 'b6e125f0-6ee5-4344-9a72-074a28522e76.jpg',
    galleryOrderSubpaths: [
      'b6e125f0-6ee5-4344-9a72-074a28522e76.jpg',
      'aa47ed50-a740-4c61-909d-789305ab38e4.jpg',
      '41a72506-68c8-4ab5-b59a-48923999d84a.jpg',
      'd2bebe73-0c73-42ef-a55b-2d2293267ea5.jpg'
    ],
    description:
      'Auspicious 70 g fine-carved solid Moradabad brass Vastu Kurma (tortoise) pedestal diya (2" H x 2" W / 5.1 x 5.1 cm) featuring an embossed filigree shell supporting a scalloped oil lamp bowl.'
  },
  96605: {
    sku: 'DB-DW26-36',
    name: 'Lotus Petal Pedestal Scroll-Carved Solid Brass Diya (2")',
    category: 'Diyas & Pooja Lamps',
    material: 'Fine Carved Solid Brass',
    unit: '1 Solid Brass Pedestal Diya',
    weightOverride: 45,
    heightOverride: 3.8,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    heroMediaSubpath: '22465638-32a5-4c73-98c5-17ee70c7e26d.jpg',
    galleryOrderSubpaths: [
      '22465638-32a5-4c73-98c5-17ee70c7e26d.jpg',
      '885c2cea-0bc0-4048-9772-d4afd277fada.jpg',
      'a124733c-3b98-491a-b4d4-caf10d9b9d54.jpg',
      '2be985f7-c5b7-4328-9039-3689a9761b37.jpg'
    ],
    description:
      'Heirloom 45 g fine-carved solid Moradabad brass pedestal diya (2" W x 1.5" H / 5.1 x 3.8 cm) featuring a floral scroll-embossed oil bowl elevated on a fluted inverted lotus-petal base.'
  },
  96611: {
    sku: 'DB-DW26-37',
    name: 'Royal Peacock Finial Lidded Solid Brass Kumkum Handi (3.5")',
    category: 'Pooja Essentials & Haldi',
    material: 'Fine Carved Solid Brass',
    unit: '1 Lidded Brass Kumkum Handi',
    weightOverride: 78,
    heightOverride: 2.5,
    widthOverride: 8.9,
    lengthOverride: 8.9,
    heroMediaSubpath: '512385a4-8430-463b-b193-3aa3bc4d0ef6.jpg',
    galleryOrderSubpaths: [
      '512385a4-8430-463b-b193-3aa3bc4d0ef6.jpg',
      '00c0729f-d4e6-4f3c-ac19-ad75d95c839d.jpg',
      'a83b8ae7-77a2-41a5-8272-57865bb8a754.jpg',
      '59c73ba2-e4f0-409e-afad-ce09c04b60c4.jpg'
    ],
    description:
      'Premium 78 g solid Moradabad brass peacock-shaped kumkum handi (3.5" L x 1" H / 8.9 x 2.5 cm) featuring an intricately carved feathered body and a removable beaded dome lid.'
  },
  96616: {
    sku: 'DB-DW26-38',
    name: 'Sacred Kalpavriksha Wish-Fulfilling Solid Brass Tree (3.5")',
    category: 'Sacred Brass Trees & Decor',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Tree (3.5")',
    weightOverride: 160,
    heightOverride: 8.9,
    widthOverride: 8.9,
    lengthOverride: 8.9,
    heroMediaSubpath: 'af925e76-69d3-451b-a6e8-085bed8206a7.jpg',
    galleryOrderSubpaths: [
      'af925e76-69d3-451b-a6e8-085bed8206a7.jpg',
      'b9658cef-9da9-4383-ac10-1b02fa917255.jpg',
      'b225fdd2-c501-45d6-ae68-4a7bf403ab59.jpg'
    ],
    description:
      'Auspicious 160 g solid Moradabad brass Kalpavriksha wish-fulfilling tree (3.5" H x 3.5" W / 8.9 x 8.9 cm) sculpted with perched songbirds, textured banyan foliage, and aerial roots.'
  },
  96620: {
    sku: 'DB-DW26-39',
    name: 'Superfine Tirupati Balaji Venkateswara Brass Idol (6")',
    category: 'Sacred Brass Idols',
    material: 'Superfine Carved Solid Brass',
    unit: '1 Brass Tirupati Idol (6")',
    weightOverride: 315,
    heightOverride: 15.2,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 4,
    heroMediaSubpath: 'fa1b8af8-7658-4418-bdcf-39403571e964.jpg',
    galleryOrderSubpaths: [
      'fa1b8af8-7658-4418-bdcf-39403571e964.jpg',
      'dc1d982b-2da3-490e-8142-61adfbca0bff.jpg',
      '55427161-198f-4ada-8a3c-15b57c6602c7.jpg',
      'b91f9a16-f22b-4005-90cb-518723be6227.jpg',
      '1c26168c-e4e1-454c-a5d5-285bdf65fe91.jpg'
    ],
    description:
      'Superfine 315 g solid Moradabad brass Lord Tirupati Balaji (Venkateswara) idol (6" H x 2" W / 15.2 x 5.1 cm) holding Shankha and Sudarshana Chakra in Varada Mudra on a lotus pedestal.'
  },
  96627: {
    sku: 'DB-DW26-40',
    name: 'Royal Peacock Finial Kurma Tortoise Brass Loban Dhoopdani (5")',
    category: 'Dhoopdanis & Loban Burners',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Large Brass Loban Burner',
    weightOverride: 900,
    heightOverride: 12.7,
    widthOverride: 15.2,
    lengthOverride: 15.2,
    heroMediaSubpath: '0a760245-4f3b-421f-850f-ac92a91f55f3.jpg',
    galleryOrderSubpaths: [
      '0a760245-4f3b-421f-850f-ac92a91f55f3.jpg',
      '54e6b37a-e1c4-496a-98e0-8bc6c53b2e3d.jpg',
      '81365a44-2736-4de7-bbc2-18b6bfba95b9.jpg',
      'ae68df4a-0eed-43ea-89d0-2996ec63b624.jpg',
      '05d26bd2-70be-412e-ad47-681f95395043.jpg'
    ],
    description:
      'Substantial 900 g heavy-cast Moradabad solid brass Kurma tortoise loban dhoopdani (5" / 12.7 cm high) featuring a pierced jali smoke dome crowned with a sculpted royal peacock finial.'
  },
  96633: {
    sku: 'DB-DW26-41',
    name: 'Sheshashayi Lord Vishnu & Mata Lakshmi Brass Idol (4")',
    category: 'Sacred Brass Idols',
    material: 'Superfine Carved Solid Brass',
    unit: '1 Brass Vishnu-Lakshmi Idol',
    weightOverride: 330,
    heightOverride: 10.2,
    widthOverride: 8.9,
    lengthOverride: 8.9,
    heroMediaSubpath: '304a17ba-3eb9-42d3-8bdc-a249eddeebc9.jpg',
    galleryOrderSubpaths: [
      '304a17ba-3eb9-42d3-8bdc-a249eddeebc9.jpg',
      'f0c8b386-b16c-407a-b449-352be68605cc.jpg',
      '2dbbffcf-b7e9-4728-92e0-700933da3d89.jpg',
      '52d9b17e-72b2-4885-9644-55e669bebe9c.jpg'
    ],
    description:
      'Superfine 330 g solid Moradabad brass Lord Vishnu and Devi Lakshmi idol (4" H x 3.5" W / 10.2 x 8.9 cm) seated beneath the five-hooded canopy of Adi Sheshnag on a coiled serpent throne.'
  },
  96638: {
    sku: 'DB-DW26-42',
    name: 'Superfine Devi Annapurna Seated Solid Brass Idol (3")',
    category: 'Sacred Brass Idols',
    material: 'Superfine Carved Solid Brass',
    unit: '1 Brass Annapurna Idol (3")',
    weightOverride: 120,
    heightOverride: 7.6,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    heroMediaSubpath: 'fb973c1a-bff6-4fc1-bf7e-6389614d2f05.jpg',
    galleryOrderSubpaths: [
      'fb973c1a-bff6-4fc1-bf7e-6389614d2f05.jpg',
      'fe52ab19-2c87-421f-90a2-5e71ef8c4c92.jpg',
      'f4d544ce-ac68-4af5-a39c-def36e518034.jpg',
      'e98d9cd0-2d09-44d9-b31e-f1d829554dac.jpg',
      '5d9665e9-e41a-4153-85c7-49aa4f1d4a14.jpg'
    ],
    description:
      'Superfine 120 g solid Moradabad brass Goddess Annapurna idol (3" H x 2" W / 7.6 x 5.1 cm) holding a sacred ladle and overflowing Akshaya Patra grain pot with an engraved Swastika halo.'
  },
  96644: {
    sku: 'DB-DW26-43',
    name: 'Sacred Kamadhenu Wall-Hanging Solid Brass Cows (Set of 2)',
    category: 'Wall Hangings & Temple Art',
    material: 'Heavy Cast Solid Brass',
    unit: 'Set of 2 Brass Wall Cows',
    weightOverride: 830,
    heightOverride: 8.9,
    widthOverride: 10.2,
    lengthOverride: 10.2,
    heroMediaSubpath: 'f3c42cf0-4f63-4457-b179-7cce24d8bed7.jpg',
    galleryOrderSubpaths: [
      'f3c42cf0-4f63-4457-b179-7cce24d8bed7.jpg',
      '52d7621b-7c78-49a9-85aa-1a47c89ec209.jpg',
      '70ece008-6d41-4ee1-b572-dbf1163eba34.jpg',
      'e0614c71-c758-448a-b022-3d22798cc5f4.jpg',
      '3f091a3c-072f-4d65-af66-0c1c5cf5fa94.jpg'
    ],
    description:
      'Substantial 830 g (pair weight) heavy-cast Moradabad solid brass facing Kamadhenu wall-hanging cows (3.5" H x 4" W / 8.9 x 10.2 cm each) with engraved jhool blankets and rear wall hooks.'
  },
  96650: {
    sku: 'DB-DW26-44',
    name: 'Sacred Blooming Kamal Lotus Solid Brass Wall Hanging (4")',
    category: 'Wall Hangings & Temple Art',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Brass Lotus Wall Hanging',
    weightOverride: 370,
    heightOverride: 6.4,
    widthOverride: 10.2,
    lengthOverride: 10.2,
    heroMediaSubpath: '19be18f2-d012-417d-b0a0-dbba0386bdb6.jpg',
    galleryOrderSubpaths: [
      '19be18f2-d012-417d-b0a0-dbba0386bdb6.jpg',
      'de14b566-5c52-48fa-84e0-a4ab58eddc7c.jpg',
      '956a0cf0-e730-4cf5-9efe-da636d083cac.jpg',
      '4b8f6779-47a8-4b69-90af-60c161296140.jpg',
      'a3a307bf-50fe-4a65-b285-0ca0a52ddcb3.jpg'
    ],
    description:
      'Heavy 370 g solid Moradabad brass blooming Kamal (lotus) wall hanging (2.5" H x 4" W / 6.4 x 10.2 cm) sculpted with layered stamen-engraved petals and a rear keyhole wall-mounting slot.'
  },
  96656: {
    sku: 'DB-DW26-45',
    name: 'Heavy Dhokra Tribal Village Women Brass Figurines (Set of 5)',
    category: 'Tribal & Folk Brass Art',
    material: 'Heavy Cast Solid Brass',
    unit: 'Set of 5 Brass Figurines',
    weightOverride: 2400,
    heightOverride: 19.1,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 4,
    stockOverride: '4 Sets Ready (5 Figurines / Set · 20 Pcs)',
    heroMediaSubpath: '5b15f8f9-4c31-4e08-b993-b02f54ec3cbe.jpg',
    galleryOrderSubpaths: [
      '5b15f8f9-4c31-4e08-b993-b02f54ec3cbe.jpg',
      '747c4243-d393-4657-83a1-fedc18d7f98b.jpg',
      '7b4e9eaa-d64d-4f6d-9328-40ac5ebdd35d.jpg',
      'cbae624f-21e7-4a7f-aca8-f09d34d88ef2.jpg',
      'ba752735-ea11-4fa7-a22b-0bb25e91b6a7.jpg',
      '8531f3aa-96ed-47ec-85bc-2a18ffbbd1d6.jpg'
    ],
    description:
      'Substantial 2,400 g (2.40 kg set weight) solid Moradabad brass Dhokra tribal village women figurines (7.5" H x 2" Base / 19.1 x 5.1 cm each) carrying traditional harvest vessels (Set of 5).'
  },
  96663: {
    sku: 'DB-DW26-46',
    name: 'Royal Cobalt Floral Enamel Jars & Golden Jali Tray Set (8")',
    category: 'Festive Gift Hamper Sets',
    material: 'Enamel Metal & Pierced Brass',
    unit: '1 Jali Tray + 2 Enamel Jars',
    weightOverride: 660,
    heightOverride: 5.1,
    widthOverride: 20.3,
    lengthOverride: 20.3,
    quantityOverride: 0,
    stockOverride: 'Stock Count in Progress · Enquire on WhatsApp',
    heroMediaSubpath: '3986f2bf-3744-4def-b8c1-f097c4602045.jpg',
    galleryOrderSubpaths: [
      '3986f2bf-3744-4def-b8c1-f097c4602045.jpg',
      '482f66eb-4bf2-46f7-bf94-4c2d8411a064.jpg',
      'eb957971-ed2e-4fb1-b1e1-1e1d537659d4.jpg',
      'cca6d659-5237-4237-b32b-876f735c13ca.jpg',
      'fb6b9ca8-59ac-4a13-a1bd-8446f5b4790e.jpg'
    ],
    description:
      'Festive 660 g royal cobalt-blue floral enamel hamper set (8" W x 2" H / 20.3 x 5.1 cm with tray) pairing a pierced golden jali rimmed tray with two crystal-knobbed dry-fruit jars.'
  },
  96669: {
    sku: 'DB-DW26-47',
    name: 'Crimson Floral Enamel Jars & Golden Jali Tray Set (8")',
    category: 'Festive Gift Hamper Sets',
    material: 'Enamel Metal & Pierced Brass',
    unit: '1 Jali Tray + 2 Enamel Jars',
    weightOverride: 660,
    heightOverride: 5.1,
    widthOverride: 20.3,
    lengthOverride: 20.3,
    quantityOverride: 20,
    heroMediaSubpath: '9e301b45-0f19-4ac0-8411-05c62eaa908e.jpg',
    galleryOrderSubpaths: [
      '9e301b45-0f19-4ac0-8411-05c62eaa908e.jpg',
      '4537237a-47f2-44ea-9466-55d4c82e3939.jpg',
      '40fc699f-bcbf-4a7c-abed-8b4ca114802f.jpg',
      'f698f732-81cd-440c-b122-43d4f8b18eb4.jpg',
      '170724a3-e209-444f-8edf-f9e08b98de2b.jpg'
    ],
    description:
      'Festive 660 g crimson-red floral enamel hamper set (8" W x 2" H / 20.3 x 5.1 cm with tray) pairing a pierced golden jali rimmed tray with two faceted crystal-knobbed dry-fruit jars.'
  },
  96675: {
    sku: 'DB-DW26-48',
    name: 'Surya Halo Dancing Peacock 7-Wick Brass Pedestal Diya (7.5")',
    category: 'Diyas & Pooja Lamps',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Peacock Diya',
    weightOverride: 480,
    heightOverride: 19.1,
    widthOverride: 15.2,
    lengthOverride: 15.2,
    quantityOverride: 4,
    heroMediaSubpath: '45211d9d-f666-4379-a274-71f7682e2808.jpg',
    galleryOrderSubpaths: [
      '45211d9d-f666-4379-a274-71f7682e2808.jpg',
      '9a0b53e8-e35c-4386-8d02-eed1d4c329a0.jpg',
      'd30b54c7-759b-4e04-b2bd-352c177978d6.jpg',
      'ca7f7235-4e21-49ae-bd46-6b44231b6f03.jpg',
      '4fc70f2e-7c3b-4ea4-a5a5-2bb43c81002f.jpg',
      '399b004b-ae1e-4f4f-b476-7162aa4e824c.jpg'
    ],
    description:
      'Ornate 480 g solid Moradabad brass Saptamukhi (7-wick) pedestal diya (7.5" H x 6" W / 19.1 x 15.2 cm) featuring a dancing peacock framed inside a rayed Surya Prabhavali halo ring.'
  },
  96682: {
    sku: 'DB-DW26-49',
    name: 'Navratna Mosaic Inlaid Royal Peacock Heavy Brass Diya (7")',
    category: 'Diyas & Pooja Lamps',
    material: 'Mosaic Stone-Inlaid Brass',
    unit: '1 Heavy Brass Peacock Diya',
    weightOverride: 970,
    heightOverride: 17.8,
    widthOverride: 16.5,
    lengthOverride: 16.5,
    quantityOverride: 4,
    heroMediaSubpath: 'b2f914b0-fa40-4991-b5e0-bd3c1fcc1639.jpg',
    galleryOrderSubpaths: [
      'b2f914b0-fa40-4991-b5e0-bd3c1fcc1639.jpg',
      '879a98ab-104e-4635-97f0-b524988986a1.jpg',
      'fb47de3d-c47d-4853-ab05-3056ce4db70d.jpg',
      '668d2750-d95f-4029-883b-9065f59f3ee4.jpg',
      '4b1e95f6-2283-46dc-9f1f-cb31e9345ca0.jpg'
    ],
    description:
      'Substantial 970 g designer solid Moradabad brass royal peacock pedestal diya (7" H x 6.5" W / 17.8 x 16.5 cm) hand-inlaid with ruby, emerald, and cobalt mosaic stonework and a deep oil spoon.'
  },
  96688: {
    sku: 'DB-DW26-50',
    name: 'Superfine Panchmukhi Hanuman 10-Armed Solid Brass Idol (4")',
    category: 'Sacred Brass Idols',
    material: 'Superfine Carved Solid Brass',
    unit: '1 Brass Hanuman Idol (4")',
    weightOverride: 370,
    heightOverride: 10.2,
    widthOverride: 10.2,
    lengthOverride: 10.2,
    quantityOverride: 2,
    heroMediaSubpath: '685fa1e3-54d7-4273-86f3-e2f6660c46ff.jpg',
    galleryOrderSubpaths: [
      '685fa1e3-54d7-4273-86f3-e2f6660c46ff.jpg',
      '50acb3a4-73d4-4518-9b26-a28f762057b9.jpg',
      'b622254f-6f6a-4aaf-ac6a-69fcfbc7f4b2.jpg',
      'f21504c4-9aad-4ff6-995e-3a7328eba63d.jpg',
      '2ef6dda5-3b21-4948-b4fb-730240adbb9a.jpg'
    ],
    description:
      'Superfine 370 g solid Moradabad brass kneeling Panchmukhi Hanuman idol (4" H x 4" W / 10.2 x 10.2 cm) with five sacred faces and ten arms wielding divine weapons in Abhaya Mudra.'
  },
  96695: {
    sku: 'DB-DW26-51',
    name: 'Superfine Seated Panchmukhi Hanuman Solid Brass Idol (2.5")',
    category: 'Sacred Brass Idols',
    material: 'Superfine Carved Solid Brass',
    unit: '1 Brass Hanuman Idol (2.5")',
    weightOverride: 135,
    heightOverride: 6.4,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 2,
    heroMediaSubpath: 'bb312507-f3f0-43de-83e9-1fdba480da7a.jpg',
    galleryOrderSubpaths: [
      'bb312507-f3f0-43de-83e9-1fdba480da7a.jpg',
      'e27e2ef0-cae5-49f6-8c3e-d61e7fa74427.jpg',
      '529fe15e-c87b-4fae-ae1a-16cceb434e62.jpg',
      '051fbb2c-b869-4dd8-8ef2-a48911bbe6b5.jpg',
      '8cdbb3b5-3c47-4555-ac28-972cb7c32a0c.jpg'
    ],
    description:
      'Superfine 135 g solid Moradabad brass Padmasana-seated Panchmukhi Hanuman idol (2.5" H x 2.5" W / 6.4 x 6.4 cm) with five sacred faces and ten arms wielding divine weapons.'
  },
  96701: {
    sku: 'DB-DW26-52',
    name: 'Heirloom Leaf-Stem Solid Brass Apple Paperweight (3.5")',
    category: 'Festive Decor & Gifting',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Apple (3.5")',
    weightOverride: 330,
    heightOverride: 8.9,
    widthOverride: 8.9,
    lengthOverride: 8.9,
    quantityOverride: 45,
    heroMediaSubpath: '9718c4c0-2504-4c42-ab9d-bd6de2b4ff68.jpg',
    galleryOrderSubpaths: [
      '9718c4c0-2504-4c42-ab9d-bd6de2b4ff68.jpg',
      'da8a9455-0732-4838-9c5f-77365dc3430e.jpg',
      'cb503955-a9b3-436f-bac9-c29c6fd0a4ce.jpg',
      '68176a16-0aac-44bb-933d-379681a09a30.jpg',
      '1d4bab81-c1b9-43a9-94b4-d4c02206ed62.jpg'
    ],
    description:
      'Premium 330 g solid Moradabad brass apple paperweight and desk keepsake (3.5" H x 3.5" W / 8.9 x 8.9 cm) crafted with a mirror-polished body and a textured botanical leaf stem.'
  },
  96707: {
    sku: 'DB-DW26-53',
    name: 'Golden Peacock Plume Filigree Metal Tealight Holder (4")',
    category: 'Diyas & Pooja Lamps',
    material: 'Gold-Finished Artisan Metal',
    unit: '1 Peacock Tealight Holder',
    weightOverride: 15,
    heightOverride: 10.2,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 31,
    heroMediaSubpath: 'cf9ea299-aee6-4a0c-a44f-d99ce879c284.jpg',
    galleryOrderSubpaths: [
      'cf9ea299-aee6-4a0c-a44f-d99ce879c284.jpg',
      '45958f17-ea45-412c-9093-35c7ddf17342.jpg',
      'a5b528d9-0466-4a5c-89e6-44970c55ea46.jpg',
      'b4530570-8418-47cc-b144-2601f8e269ec.jpg'
    ],
    description:
      'Festive 15 g gold-finished metal peacock plume tealight candle holder (4" L x 2.5" W / 10.2 x 6.4 cm) featuring a pierced filigree feather fan behind a round votive cup.'
  },
  96712: {
    sku: 'DB-DW26-54',
    name: 'Scalloped Beaded Rim Solid Brass Pooja Diya (2.5")',
    category: 'Diyas & Pooja Lamps',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Diya (2.5")',
    weightOverride: 66,
    heightOverride: 2.5,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 21,
    heroMediaSubpath: 'f392f8e0-edea-4cf7-ac47-910f9cf6ea0a.jpg',
    galleryOrderSubpaths: [
      'f392f8e0-edea-4cf7-ac47-910f9cf6ea0a.jpg',
      '18c672db-2d37-4426-bfdb-cf10add35ebd.jpg',
      '38359198-7955-462a-a304-a67dd7556b33.jpg',
      '338d2617-7d47-4136-8a9d-47864ebf819e.jpg'
    ],
    description:
      'Heirloom 66 g solid Moradabad brass pooja oil diya (2.5" W x 1" H / 6.4 x 2.5 cm) crafted with a deep polished reservoir, embossed beaded border, and scalloped petal rim.'
  },
  97462: {
    sku: 'DB-DW26-55',
    name: 'Royal Peacock Plume Pedestal Solid Brass Standing Diya (4.5")',
    category: 'Diyas & Pooja Lamps',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Standing Peacock Diya (4.5")',
    weightOverride: 100,
    heightOverride: 11.4,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    heroMediaSubpath: 'a911d3fb-9fa5-4005-802a-a71c967db609.jpg',
    galleryOrderSubpaths: [
      'a911d3fb-9fa5-4005-802a-a71c967db609.jpg',
      'c029b71f-4a27-4971-a7ec-ec3bd06fd64d.jpg',
      '88b41122-0d2b-42b3-b352-186ca75c4aa3.jpg',
      '8eac9018-6d3d-4df2-a9be-164ecedff843.jpg'
    ],
    description:
      'Artisanal 100 g solid Moradabad brass standing peacock pooja diya (4.5" H x 2.5" W / 11.4 x 6.4 cm) featuring an ornate carved peacock perched on a lotus dome pedestal supporting an embossed oil lamp cup atop its flowing tail plume.'
  },
  97467: {
    sku: 'DB-DW26-56',
    name: 'Royal Peacock Finial Carved Solid Brass Pooja Arti Bell (6.5")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Peacock Pooja Bell (6.5")',
    weightOverride: 217,
    heightOverride: 16.5,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 1,
    heroMediaSubpath: '871704b0-0cda-44ae-b1bd-e60fe6867839.jpg',
    galleryOrderSubpaths: [
      '871704b0-0cda-44ae-b1bd-e60fe6867839.jpg',
      '139462a6-c9bd-48eb-a15c-b22104276c7a.jpg',
      '479c49e1-06f5-4127-83f6-21ac1e20222b.jpg'
    ],
    description:
      'Heirloom 217 g solid Moradabad brass pooja arti bell (6.5" H x 2.5" W / 16.5 x 6.4 cm) crowned with a finely sculpted royal peacock finial over a cross-hatched pillar handle and floral-embossed resonant bell dome.'
  },
  97472: {
    sku: 'DB-DW26-57',
    name: 'Sacred Garuda Finial Carved Solid Brass Pooja Arti Bell (7")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Garuda Pooja Bell (7")',
    weightOverride: 200,
    heightOverride: 17.8,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 2,
    heroMediaSubpath: '90fc787b-3a6d-46cf-a16b-4472afc42150.jpg',
    galleryOrderSubpaths: [
      '90fc787b-3a6d-46cf-a16b-4472afc42150.jpg',
      '327a8271-c436-482b-9ad8-37886e6d9898.jpg',
      '24dd6059-59aa-4dd8-86d5-196e7dd2ead4.jpg'
    ],
    description:
      'Traditional 200 g solid Moradabad brass temple pooja arti bell (7" H x 2.5" W / 17.8 x 6.4 cm) crowned with a kneeling winged Garuda in Anjali Mudra atop a fluted pillar handle and floral scroll-embossed bell dome.'
  },
  97477: {
    sku: 'DB-DW26-58',
    name: 'Sacred Garuda Finial Carved Solid Brass Pooja Arti Bell (4.5")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Garuda Pooja Bell (4.5")',
    weightOverride: 90,
    heightOverride: 11.4,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 1,
    heroMediaSubpath: '0e049154-70f3-46de-ad95-ce21534a1b98.jpg',
    galleryOrderSubpaths: [
      '0e049154-70f3-46de-ad95-ce21534a1b98.jpg',
      '9bcd1464-49de-4018-8c97-3668ac4653ff.jpg',
      '52865a63-b2fd-4474-b464-25ac3570e2aa.jpg'
    ],
    description:
      'Compact 90 g solid Moradabad brass pooja arti bell (4.5" H x 2" W / 11.4 x 5.1 cm) featuring a kneeling winged Garuda finial in Anjali Mudra over a fluted pillar shaft and scroll-carved resonant bell base.'
  },
  97481: {
    sku: 'DB-DW26-59',
    name: 'Kneeling Bhakta Hanuman Finial Solid Brass Pooja Arti Bell (5")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Hanuman Pooja Bell (5")',
    weightOverride: 171,
    heightOverride: 12.7,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 1,
    heroMediaSubpath: '9d32d62f-1018-48e6-8e22-b692232c6040.jpg',
    galleryOrderSubpaths: [
      '9d32d62f-1018-48e6-8e22-b692232c6040.jpg',
      '080fe8b4-53b8-4b7a-badc-58dbee1707ae.jpg',
      '09af1348-84c1-4625-a463-4470ac6b7e8c.jpg'
    ],
    description:
      'Sacred 171 g solid Moradabad brass pooja arti bell (5" H x 2.5" W / 12.7 x 6.4 cm) crowned with a kneeling Bhakta Hanuman in Anjali Mudra over a lattice-carved pillar handle and floral-embossed bell dome.'
  },
  97485: {
    sku: 'DB-DW26-60',
    name: 'Sacred Nandi Bull Finial Carved Solid Brass Pooja Arti Bell (4.5")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Nandi Pooja Bell (4.5")',
    weightOverride: 110,
    heightOverride: 11.4,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 1,
    heroMediaSubpath: 'aae82d5e-3de0-416f-b5bc-5082b7891bb2.jpg',
    galleryOrderSubpaths: [
      'aae82d5e-3de0-416f-b5bc-5082b7891bb2.jpg',
      '8a6beb5e-27c1-473a-9574-9f8107a24804.jpg',
      'f99aa6a0-9e4e-4f8a-9b00-95d9d18a9233.jpg'
    ],
    description:
      'Auspicious 110 g solid Moradabad brass pooja arti bell (4.5" H x 2" W / 11.4 x 5.1 cm) crowned with a seated sacred Nandi bull finial over a lattice-carved pillar handle and floral-embossed bell dome.'
  },
  97490: {
    sku: 'DB-DW26-61',
    name: 'Kalash Sphere Finial Lattice-Carved Solid Brass Pooja Bell (4.5")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Kalash Finial Pooja Bell (4.5")',
    weightOverride: 118,
    heightOverride: 11.4,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 1,
    heroMediaSubpath: '87d4ae1b-d3c2-4e77-9176-4dfccf6530c5.jpg',
    galleryOrderSubpaths: [
      '87d4ae1b-d3c2-4e77-9176-4dfccf6530c5.jpg',
      '742a2a52-b24c-408a-870e-ac15c109524d.jpg',
      '5bf896e2-66fb-440b-887d-e3adc8c51864.jpg'
    ],
    description:
      'Traditional 118 g solid Moradabad brass pooja arti bell (4.5" H x 2" W / 11.4 x 5.1 cm) topped with a classic spherical Kalash finial over a diamond-lattice pillar handle and floral-embossed bell dome.'
  },
  97494: {
    sku: 'DB-DW26-62',
    name: 'Meditating Lord Shiva & Trishul Finial Solid Brass Pooja Bell (5")',
    category: 'Brass Pooja Bells & Ghantis',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Shiva Pooja Bell (5")',
    weightOverride: 120,
    heightOverride: 12.7,
    widthOverride: 3.8,
    lengthOverride: 3.8,
    quantityOverride: 1,
    heroMediaSubpath: '85656d40-6612-4bca-bd8e-53544c87a3cd.jpg',
    galleryOrderSubpaths: [
      '85656d40-6612-4bca-bd8e-53544c87a3cd.jpg',
      '95df73df-623e-438f-bffc-cf59d1b7dfd6.jpg',
      'ffc1efbd-06a0-4da4-a934-d47e04ac5835.jpg'
    ],
    description:
      'Sacred 120 g solid Moradabad brass pooja arti bell (5" H x 1.5" W / 12.7 x 3.8 cm) crowned with a meditating Lord Shiva and sacred Trishul finial over a lattice-carved pillar handle and floral-embossed bell dome.'
  },
  97498: {
    sku: 'DB-DW26-63',
    name: 'Royal Cascading Feather-Train Peacock Solid Brass Figurine (5")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Peacock Figurine (5")',
    weightOverride: 168,
    heightOverride: 7.6,
    widthOverride: 12.7,
    lengthOverride: 12.7,
    quantityOverride: 1,
    heroMediaSubpath: 'e4d63267-8323-4af8-8da5-09b61aa95642.jpg',
    galleryOrderSubpaths: [
      'e4d63267-8323-4af8-8da5-09b61aa95642.jpg',
      '8f346e26-9ce0-436d-ae32-2ffa7365420d.jpg',
      '22d89a30-986e-4cb9-b574-873e8a5e94e3.jpg'
    ],
    description:
      'Regal 168 g solid Moradabad brass royal peacock figurine (3" H x 5" L / 7.6 x 12.7 cm) perched on a floral-embossed dome pedestal with an intricately pierced cascading tail-feather train.'
  },
  97506: {
    sku: 'DB-DW26-64',
    name: 'Compact Cascading Feather-Train Peacock Solid Brass Figurine (3")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Peacock Figurine (3")',
    weightOverride: 73,
    heightOverride: 6.4,
    widthOverride: 7.6,
    lengthOverride: 7.6,
    quantityOverride: 1,
    heroMediaSubpath: '68e7f63c-57f2-4fd7-a90f-5ad36ecd5b1b.jpg',
    galleryOrderSubpaths: [
      '68e7f63c-57f2-4fd7-a90f-5ad36ecd5b1b.jpg',
      'd9e4df7a-52df-42ab-bbd8-fa9284426308.jpg',
      'a84a6c2d-2643-4a8b-a1f8-c53abaff1f3e.jpg'
    ],
    description:
      'Artisanal 73 g solid Moradabad brass peacock figurine (2.5" H x 3" W / 6.4 x 7.6 cm) standing on a floral-embossed dome base with a finely detailed cascading tail-feather train.'
  },
  97510: {
    sku: 'DB-DW26-65',
    name: 'Standing Royal Peacock with Trailing Plume Solid Brass Figurine (5")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Standing Peacock Figurine (5")',
    weightOverride: 100,
    heightOverride: 7.6,
    widthOverride: 12.7,
    lengthOverride: 12.7,
    quantityOverride: 1,
    heroMediaSubpath: 'e0eaa722-244d-4c80-8d4a-36a3ee6c00e3.jpg',
    galleryOrderSubpaths: [
      'e0eaa722-244d-4c80-8d4a-36a3ee6c00e3.jpg',
      '062aaeae-3428-4305-9252-abc6347286bd.jpg',
      '93a952c4-ecc4-46ae-8623-212dcf95fe11.jpg',
      'dfe2dcae-efe4-4be9-9cb9-37608d3d7aa4.jpg'
    ],
    description:
      'Sculptural 100 g solid Moradabad brass standing royal peacock figurine (3" H x 5" W / 7.6 x 12.7 cm) crafted with embossed eye-spot plumage, crested head, and a sweeping trailing tail train.'
  },
  97514: {
    sku: 'DB-DW26-66',
    name: 'Royal Floral-Saddled Standing Stallion Solid Brass Figurine (4.5")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Royal Horse Figurine (4.5")',
    weightOverride: 123,
    heightOverride: 8.9,
    widthOverride: 11.4,
    lengthOverride: 11.4,
    quantityOverride: 1,
    heroMediaSubpath: 'afd91369-529b-45ba-a88c-d26250ac848d.jpg',
    galleryOrderSubpaths: [
      'afd91369-529b-45ba-a88c-d26250ac848d.jpg',
      '7d70e410-4b01-4fd8-9a14-fcf52b216c37.jpg',
      '47c27120-ff1d-402c-b225-5d79611e493f.jpg'
    ],
    description:
      'Regal 123 g solid Moradabad brass royal horse figurine (3.5" H x 4.5" W / 8.9 x 11.4 cm) adorned with an embossed floral-scroll ceremonial saddle blanket and beaded bridle.'
  },
  97518: {
    sku: 'DB-DW26-67',
    name: 'Dancing Peacock Halo on Kurma Tortoise Base Brass Diya (2.5")',
    category: 'Diyas & Pooja Lamps',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Peacock & Tortoise Diya (2.5")',
    weightOverride: 45,
    heightOverride: 6.4,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 1,
    heroMediaSubpath: 'abf2bd5c-927d-46b8-bc35-60df9d7aecb9.jpg',
    galleryOrderSubpaths: [
      'abf2bd5c-927d-46b8-bc35-60df9d7aecb9.jpg',
      '71789442-efec-4a9f-ba2c-0b55fcbed08c.jpg',
      'b3d1b0a9-539f-4e6e-b493-82dea0fe20a6.jpg'
    ],
    description:
      'Auspicious 45 g solid Moradabad brass pooja oil diya (2.5" H x 2" W / 6.4 x 5.1 cm) resting on a sacred Kurma tortoise pedestal and crowned with a fanned dancing peacock plume halo.'
  },
  97522: {
    sku: 'DB-DW26-68',
    name: 'Eight-Armed Sherawali Mata Durga Riding Lion Solid Brass Idol (3.5")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Durga Idol (3.5")',
    weightOverride: 108,
    heightOverride: 8.9,
    widthOverride: 7.6,
    lengthOverride: 7.6,
    quantityOverride: 1,
    heroMediaSubpath: '354ef73e-2b8c-4092-b218-71f826ba58e9.jpg',
    galleryOrderSubpaths: [
      '354ef73e-2b8c-4092-b218-71f826ba58e9.jpg',
      '03932675-415d-48f8-bb69-3f4be37bb869.jpg',
      '4be69fa9-30f0-4d22-8a00-91fa089720f7.jpg'
    ],
    description:
      'Auspicious 108 g solid Moradabad brass Eight-Armed Sherawali Mata Durga idol (3.5" H x 3" W / 8.9 x 7.6 cm) seated upon her roaring lion Simha Vahana with sacred weapons.'
  },
  97527: {
    sku: 'DB-DW26-69',
    name: 'Divine Flute-Playing Radha Krishna on Oval Pedestal Brass Idol (6")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Radha Krishna Idol (6")',
    weightOverride: 390,
    heightOverride: 15.2,
    widthOverride: 12.7,
    lengthOverride: 12.7,
    quantityOverride: 3,
    heroMediaSubpath: '49dc2150-4241-4503-b3a0-655b1765e55e.jpg',
    galleryOrderSubpaths: [
      '49dc2150-4241-4503-b3a0-655b1765e55e.jpg',
      '7c6d6c6e-e52b-4005-b850-dfe39e6c8478.jpg',
      '1b0484e3-0f5d-4a88-bc16-997acc8e6d16.jpg'
    ],
    description:
      'Substantial 390 g solid Moradabad brass Radha Krishna idol (6" H x 5" W / 15.2 x 12.7 cm) depicting flute-playing Lord Krishna and Goddess Radha standing on an ornate peacock-carved oval pedestal.'
  },
  97531: {
    sku: 'DB-DW26-70',
    name: 'Sacred Shiv Parivar Seated on Mount Kailash Solid Brass Idol (4")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Shiv Parivar Idol (4")',
    weightOverride: 300,
    heightOverride: 10.2,
    widthOverride: 7.6,
    lengthOverride: 7.6,
    quantityOverride: 1,
    heroMediaSubpath: '1a62c8f1-5c9f-4832-8a97-bd3ea1bfa0f5.jpg',
    galleryOrderSubpaths: [
      '1a62c8f1-5c9f-4832-8a97-bd3ea1bfa0f5.jpg',
      'bec4427c-1425-4045-9f04-d137ca936fe3.jpg',
      '36cad98d-4a0b-4dd3-9cc9-5d539c6cf89c.jpg'
    ],
    description:
      'Substantial 300 g solid Moradabad brass Shiv Parivar idol (4" H x 3" W / 10.2 x 7.6 cm) depicting Lord Shiva with Trishul, Goddess Parvati, Lord Ganesha, Lord Kartikeya, Nandi, and Shiva Lingam on Mount Kailash.'
  },
  97535: {
    sku: 'DB-DW26-71',
    name: 'Royal Peacock Filigree Pillar Multi-Wick Solid Brass Standing Diya (8")',
    category: 'Diyas & Pooja Lamps',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Peacock Pillar Diya (8")',
    weightOverride: 310,
    heightOverride: 20.3,
    widthOverride: 7.6,
    lengthOverride: 7.6,
    quantityOverride: 1,
    heroMediaSubpath: '132e093f-09bd-44c7-89bd-c2f5cbba933c.jpg',
    galleryOrderSubpaths: [
      '132e093f-09bd-44c7-89bd-c2f5cbba933c.jpg',
      '4523cbec-2a14-48e1-92a2-c369b16eca50.jpg',
      '08378f69-7764-4b59-8691-2b773f49ca7d.jpg'
    ],
    description:
      'Ornate 310 g solid Moradabad brass standing peacock diya (8" H x 3" W / 20.3 x 7.6 cm) crafted with a sweeping filigree-carved peacock plume column, multi-wick floral oil bowl, and miniature peacock finial.'
  },
  97539: {
    sku: 'DB-DW26-72',
    name: 'Sacred Vastu Kurma Tortoise with Pearl Crown Solid Brass Figurine (2")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Vastu Tortoise (2")',
    weightOverride: 40,
    heightOverride: 2.5,
    widthOverride: 5.1,
    lengthOverride: 5.1,
    quantityOverride: 19,
    heroMediaSubpath: 'a05fadc4-b9b9-4fe9-990f-c6b6ef565ccc.jpg',
    galleryOrderSubpaths: [
      'a05fadc4-b9b9-4fe9-990f-c6b6ef565ccc.jpg',
      'cd513b4f-b3a7-4967-bc87-e8d68c53fd61.jpg',
      'b24ac308-f77e-44ce-92b6-9109f9b8c6e9.jpg',
      'efd6bc8a-e363-49e1-b038-12a7fcffea66.jpg'
    ],
    description:
      'Auspicious 40 g solid Moradabad brass Vastu Kurma tortoise figurine (1" H x 2" W / 2.5 x 5.1 cm) featuring an intricately pierced filigree shell crowned with a lustrous white pearl cabochon.'
  },
  97544: {
    sku: 'DB-DW26-73',
    name: 'Sacred Vastu Kuber Yantra Kurma Tortoise Solid Brass Figurine (2.5")',
    category: 'Brass Idols & Figurines',
    material: '100% Solid Moradabad Brass',
    unit: '1 Solid Brass Vastu Yantra Tortoise (2.5")',
    weightOverride: 50,
    heightOverride: 2.5,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 47,
    heroMediaSubpath: '45e53d74-c840-4560-8272-bb18c1c6f4e8.jpg',
    galleryOrderSubpaths: [
      '45e53d74-c840-4560-8272-bb18c1c6f4e8.jpg',
      '1f0380a2-2019-4153-a01a-8b4c66d75cb9.jpg',
      'ec2d6db1-047c-449d-b355-6a54d56996b0.jpg',
      '67764c54-ecbe-4c2d-b430-6c47d6cbbaad.jpg'
    ],
    description:
      'Auspicious 50 g solid Moradabad brass Vastu Kurma tortoise figurine (1" H x 2.5" W / 2.5 x 6.4 cm) crafted with a hexagonal floral-textured carapace and an embossed 9-grid Vastu Kuber Yantra underneath.'
  },
  97549: {
    sku: 'DB-DW26-74',
    name: 'Heavy Seated Goddess Saraswati with Veena on Lotus Pedestal Brass Idol (7.5")',
    category: 'Brass Idols & Figurines',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Heavy Brass Saraswati Idol (7.5")',
    weightOverride: 1810,
    heightOverride: 19.1,
    widthOverride: 14.0,
    lengthOverride: 14.0,
    quantityOverride: 12,
    heroMediaSubpath: 'b567bf5c-ab1b-4868-8b25-0e2d703dbe29.jpg',
    galleryOrderSubpaths: [
      'b567bf5c-ab1b-4868-8b25-0e2d703dbe29.jpg',
      '72e3060f-4b3a-4572-81f4-80e3cdbcd811.jpg',
      'c111a485-4c98-4b9c-b922-872f882eb9d1.jpg'
    ],
    description:
      'Heirloom 1,810 g (1.81 kg) heavy-cast solid Moradabad brass Goddess Saraswati idol (7.5" H x 5.5" W / 19.1 x 14.0 cm) seated in Padmasana on an engraved lotus pedestal playing the sacred Veena.'
  },
  97553: {
    sku: 'DB-DW26-75',
    name: 'Sacred Blooming Kamal Lotus with Scroll Stem Solid Brass Wall Hanging (5")',
    category: 'Wall Hangings & Temple Art',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Solid Brass Lotus Wall Hanging (5")',
    weightOverride: 515,
    heightOverride: 12.7,
    widthOverride: 11.4,
    lengthOverride: 11.4,
    quantityOverride: 15,
    heroMediaSubpath: 'baa883b2-4161-47ff-9019-5b8d84d5e71e.jpg',
    galleryOrderSubpaths: [
      'baa883b2-4161-47ff-9019-5b8d84d5e71e.jpg',
      '7b335670-c1e8-4e76-982d-97a4d31358fa.jpg',
      '352ad320-6532-4a53-80c0-5949eb24f0c4.jpg'
    ],
    description:
      'Substantial 515 g heavy-cast Moradabad solid brass blooming Kamal (lotus) wall hanging (5" H x 4.5" W / 12.7 x 11.4 cm) sculpted with stamen-engraved petals, twin floral-scroll stem base, and rear keyhole wall slot.'
  },
  97557: {
    sku: 'DB-DW26-76',
    name: 'Royal Meenakari Gaja Elephant Pedestal Solid Brass Ghungroo Urli (9")',
    category: 'Urlis & Floating Vessels',
    material: 'Heavy Cast Solid Brass & Meenakari Enamel',
    unit: '1 Heavy Brass Elephant Urli (9")',
    weightOverride: 3100,
    heightOverride: 22.9,
    widthOverride: 15.2,
    lengthOverride: 15.2,
    quantityOverride: 12,
    heroMediaSubpath: '109765d1-1aed-4b50-9ecb-d09f7c8a5d98.jpg',
    galleryOrderSubpaths: [
      '109765d1-1aed-4b50-9ecb-d09f7c8a5d98.jpg',
      '88a29d89-5617-42bb-9b2a-2fcad73ca7ea.jpg',
      '421e253a-6d6a-467e-9b1a-a88a051258c1.jpg',
      '454934b7-009a-4ef8-9a33-c96958515682.jpg',
      '9e33c5f9-aaa5-43e2-b014-f7143aa6e1f4.jpg'
    ],
    description:
      'Heirloom 3,100 g (3.10 kg) heavy-cast Moradabad solid brass royal Gaja elephant pedestal urli (9" H x 6" W / 22.9 x 15.2 cm) adorned with emerald and crimson Meenakari inlay and a rim of dangling brass ghungroo bells.'
  },
  97564: {
    sku: 'DB-DW26-77',
    name: 'Twin Royal Gaja Elephant & Swan Base Peacock Finial Brass Standing Diya (9")',
    category: 'Diyas & Pooja Lamps',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Solid Brass Twin-Elephant Standing Diya (9")',
    weightOverride: 690,
    heightOverride: 22.9,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 2,
    heroMediaSubpath: 'a51202e3-6deb-4e91-9a36-980b4f50c54f.jpg',
    galleryOrderSubpaths: [
      'a51202e3-6deb-4e91-9a36-980b4f50c54f.jpg',
      '559a7984-1699-44ae-9986-d7210a33d874.jpg',
      'b36dffed-f79b-4e42-b48c-965a9bb80c56.jpg',
      'f6b2bdda-774d-4236-b969-baf13aad29df.jpg',
      '7dcfa8e0-c278-437b-9cea-3396d87aa44a.jpg'
    ],
    description:
      'Grand 690 g heavy-cast Moradabad solid brass standing temple diya (9" H x 2.5" W / 22.9 x 6.4 cm) sculpted with twin facing royal Gaja elephants, a Hamsa swan-carved bell pedestal, multi-wick floral bowl, and peacock finial.'
  },
  97571: {
    sku: 'DB-DW26-78',
    name: 'Twin Gaja-Mayura Elephant & Peacock Pillar Brass Standing Diya (9")',
    category: 'Diyas & Pooja Lamps',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Solid Brass Gaja-Mayura Standing Diya (9")',
    weightOverride: 745,
    heightOverride: 22.9,
    widthOverride: 6.4,
    lengthOverride: 6.4,
    quantityOverride: 1,
    heroMediaSubpath: '7e8aace8-65ae-4a93-8fb4-b229ac3df0a9.jpg',
    galleryOrderSubpaths: [
      '7e8aace8-65ae-4a93-8fb4-b229ac3df0a9.jpg',
      '26c197f8-788e-4f1b-97bc-d0b6f4efebf6.jpg',
      'c9960e15-e77a-42c8-833e-cd20c2bc7b00.jpg',
      '6205d6a2-0ca4-4756-89ee-0fb5a5ba7b89.jpg',
      'a9922430-28a2-41c9-a9b1-e9d1166e3c53.jpg'
    ],
    description:
      'Heirloom 745 g heavy-cast Moradabad solid brass standing temple diya (9" H x 2.5" W / 22.9 x 6.4 cm) featuring twin royal Gaja elephants surmounted by cascading-plume peacocks, a swan-carved base, 5-wick bowl, and peacock finial.'
  },
  97577: {
    sku: 'DB-DW26-79',
    name: 'Sacred Tirupati Balaji Tilak Kalash & Peacock Finial Brass Standing Diya (8")',
    category: 'Diyas & Pooja Lamps',
    material: 'Heavy Cast Solid Brass',
    unit: '1 Solid Brass Balaji Tilak Standing Diya (8")',
    weightOverride: 530,
    heightOverride: 20.3,
    widthOverride: 7.6,
    lengthOverride: 7.6,
    quantityOverride: 2,
    heroMediaSubpath: 'b47231d0-d4da-469d-a0dd-cb9ce18b6a06.jpg',
    galleryOrderSubpaths: [
      'b47231d0-d4da-469d-a0dd-cb9ce18b6a06.jpg',
      '9de9a7c2-6bf9-4592-ad9d-d6cb48ffb5f4.jpg',
      '824e76e1-4cc2-4528-ab46-0f5e1f00695c.jpg',
      'bf684589-8648-4040-8805-ccf46f42c96f.jpg'
    ],
    description:
      'Auspicious 530 g heavy-cast Moradabad solid brass standing temple diya (8" H x 3" W / 20.3 x 7.6 cm) sculpted with a sacred Tirupati Balaji Namam (Tilak) beaded Kalash pillar, tiered lotus base, 5-wick bowl, and peacock finial.'
  }
};

function parseDimToken(clean, dirRegexStr) {
  // Handle dual-unit like "10 cm/4 inch wide" first
  const dualRe = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(?:cm|can)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)\\s*(?:inches|inch|in|")\\s*(?:${dirRegexStr})\\b`,
    'i'
  );
  const dualMatch = clean.match(dualRe);
  if (dualMatch) return Number(dualMatch[1]);

  // Handle compound dimension like "3.5 inch high & wide" or "10 cm wide and high"
  const compoundRe = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(cm|can|inches|inch|in|")?\\s*(?:high|height|tall|hugh|wide|width)\\s*(?:&|and)\\s*(?:${dirRegexStr})\\b`,
    'i'
  );
  const singleRe = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(cm|can|inches|inch|in|")?\\s*(?:${dirRegexStr})\\b`,
    'i'
  );
  const prefixRe = new RegExp(
    `\\b(?:${dirRegexStr})\\s*[:=-]?\\s*(\\d+(?:\\.\\d+)?)\\s*(cm|can|inches|inch|in|")?\\b`,
    'i'
  );
  const m = clean.match(singleRe) || clean.match(compoundRe) || clean.match(prefixRe);
  if (!m) return 0;
  const val = Number(m[1]);
  const unit = (m[2] || 'cm').toLowerCase();
  if (unit.startsWith('in') || unit === '"') {
    return Math.round(val * 2.54 * 10) / 10;
  }
  return val;
}

/**
 * Parses a raw WhatsApp caption like:
 * "170 gms, 5 cm high, 27 can wide, Aluminium Deer Tray with beautiful print, qty 25"
 * or "50gms, 10 cm/4 inch wide, thick brass plate small with beautiful design, qty 109"
 */
export function parseWhatsAppCaption(rawCaption = '') {
  const clean = String(rawCaption || '').replace(/\s+/g, ' ').trim();

  // Weight in grams or kg
  let weightG = 0;
  const kgMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|k\s*grms?|k\s*gms?)\b/i);
  const gmMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:grms?|gms?|grams?|g)\b/i);
  if (kgMatch) {
    weightG = Math.round(Number(kgMatch[1]) * 1000);
  } else if (gmMatch) {
    weightG = Math.round(Number(gmMatch[1]));
  }

  const heightCm = parseDimToken(clean, 'high|height|tall|hugh');
  const widthCm = parseDimToken(clean, 'wide|width|dia|diameter');
  const breadthVal = parseDimToken(clean, 'bredth|breadth|deep|depth|long|length');
  const lengthCm = breadthVal > 0 ? breadthVal : widthCm > 0 ? widthCm : 0;

  // Quantity (supports single number, "pending", or multi-variant breakdown like "qty yellow 10, red 16, blue 10")
  let quantity = 0;
  let stockNote = '';
  const qtyClauseMatch = clean.match(/\b(?:qty|qnty|quanty|quantity|stock)\s*[:=-]?\s*(.+)$/i);
  const qtyNumMatch = clean.match(/\b(?:qty|qnty|quanty|quantity|stock|pcs|pieces)\s*[:=-]?\s*(\d+)\b/i);
  const qtyPendingMatch = clean.match(/\b(?:qty|qnty|quanty|quantity)\s*[:=-]?\s*(?:pending|to\s+be\s+confirmed|tbc)\b/i);
  if (qtyPendingMatch) {
    quantity = 0;
    stockNote = 'Stock Count in Progress · Enquire on WhatsApp';
  } else if (qtyClauseMatch) {
    const clause = qtyClauseMatch[1].trim();
    const nums = [...clause.matchAll(/\b(\d+)\b/g)].map((m) => Number(m[1]));
    if (nums.length > 1) {
      quantity = nums.reduce((acc, n) => acc + n, 0);
      stockNote = `${quantity} Ready (${clause})`;
    } else if (nums.length === 1) {
      quantity = nums[0];
    }
  } else if (qtyNumMatch) {
    quantity = Number(qtyNumMatch[1]);
  }

  // Extract descriptive core by stripping out parsed tokens
  let coreDesc = clean
    .replace(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|grms?|gms?|grams?|g)(?:\s*set\s*of\s*\d+)?\b/gi, '')
    .replace(
      /(\d+(?:\.\d+)?)\s*(?:cm|can)?\s*\/\s*(\d+(?:\.\d+)?)\s*(?:inches|inch|in|")?\s*(?:high|height|tall|wide|width|dia|diameter|bredth|breadth|deep|depth|long|length)\b/gi,
      ''
    )
    .replace(
      /(\d+(?:\.\d+)?)\s*(?:cm|can|inches|inch|in|")?\s*(?:high|height|tall|wide|width|dia|diameter|bredth|breadth|deep|depth|long|length)\b/gi,
      ''
    )
    .replace(/\b(?:qty|qnty|quanty|quantity|stock)\s*[:=-]?\s*.+$/gi, '')
    .replace(/^[\s,.;:/-]+|[\s,.;:/-]+$/g, '')
    .replace(/(?:,\s*){2,}/g, ', ')
    .trim();

  if (!coreDesc) {
    coreDesc = 'Handcrafted Festive Metal Decor Accent';
  }

  // Title-case name from coreDesc
  const rawName = coreDesc
    .replace(/\bwith beautiful (?:print|design)\b/i, '')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim();

  const prettyName = (rawName || coreDesc)
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

  const lower = clean.toLowerCase();
  let material = 'Solid Moradabad Metalwork';
  if (lower.includes('aluminium') && lower.includes('brass')) {
    material = 'Thick Cast Aluminium & Solid Brass';
  } else if (lower.includes('brass')) {
    material = '100% Solid Moradabad Brass';
  } else if (lower.includes('aluminium') || lower.includes('aluminum')) {
    material = 'Artisan Finished Aluminium';
  } else if (lower.includes('copper')) {
    material = 'Pure Handcrafted Copper & Brass';
  }

  let category = 'Festive Decor & Gifting';
  if (lower.includes('tray')) category = 'Festive Trays & Platters';
  else if (lower.includes('urli')) category = 'Urlis & Floating Bowls';
  else if (lower.includes('diya')) category = 'Diyas & Pooja Platters';
  else if (lower.includes('plate') || lower.includes('thali')) category = 'Brass Pooja Thalis & Plates';

  return {
    weightG,
    heightCm,
    widthCm,
    lengthCm,
    quantity,
    stockNote,
    name: prettyName,
    material,
    category,
    rawCaption: clean,
    description: `${prettyName} — handcrafted in Moradabad for festive home styling, pooja rituals, and Diwali gifting.${
      weightG ? ` Verified studio scale weight of ${weightG} g.` : ''
    }`
  };
}

export function syncWhatsAppGroupCaptures({ sinceDate = '2026-10-17 00:00:00' } = {}) {
  if (!fs.existsSync(WHATSAPP_DB_PATH)) {
    throw new Error(`WhatsApp database not found at ${WHATSAPP_DB_PATH}`);
  }

  const sql = `
    SELECT m.Z_PK,
           datetime(m.ZMESSAGEDATE + 978307200, 'unixepoch', 'localtime') AS ts,
           m.ZMESSAGETYPE,
           REPLACE(REPLACE(COALESCE(m.ZTEXT, ''), char(10), ' '), '|', '/') AS ztext,
           COALESCE(med.ZMEDIALOCALPATH, '') AS media_path,
           REPLACE(REPLACE(COALESCE(med.ZTITLE, ''), char(10), ' '), '|', '/') AS media_title
    FROM ZWAMESSAGE m
    LEFT JOIN ZWAMEDIAITEM med ON med.ZMESSAGE = m.Z_PK
    WHERE (m.ZCHATSESSION = ${MARKETING_CHAT_SESSION} OR (m.ZCHATSESSION = 940 AND m.Z_PK >= 97564))
      AND datetime(m.ZMESSAGEDATE + 978307200, 'unixepoch', 'localtime') >= '${sinceDate}'
      AND m.ZMESSAGETYPE IN (0, 1)
      AND (m.ZMESSAGETYPE = 0 OR m.ZISFROMME = 1 OR m.Z_PK > 97458)
    ORDER BY m.ZMESSAGEDATE ASC, m.Z_PK ASC;
  `;

  const rawOut = execFileSync(
    'sqlite3',
    [`file://${ encodeURI(WHATSAPP_DB_PATH) }?mode=ro`, sql],
    { encoding: 'utf8' }
  );

  const rows = rawOut
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pk, ts, type, ztext, mediaPath, mediaTitle] = line.split('|');
      return {
        pk: Number(pk),
        ts,
        type: Number(type),
        text: (ztext || '').trim(),
        mediaPath: (mediaPath || '').trim(),
        mediaTitle: (mediaTitle || '').trim()
      };
    });

  // Group image rows (type === 1) into albums:
  // Batch 1 (Oct 17 shoot): pk 96363..96715
  // Batch 2 (Oct 20+ additions): pk > 97458
  const albums = [];
  let currentAlbum = null;
  let preCaptionBuffer = [];

  for (const row of rows) {
    if (row.pk < 96363) continue;
    // Skip non-product discussion & sample card replies between Batch 1 and Batch 2
    if (row.pk > 96715 && row.pk <= 97458) {
      currentAlbum = null;
      preCaptionBuffer = [];
      continue;
    }

    if (row.type === 1 && row.mediaPath) {
      if (row.mediaTitle) {
        currentAlbum = {
          firstPk: row.pk,
          timestamp: row.ts,
          lastPhotoTs: row.ts,
          caption: row.mediaTitle,
          mediaPaths: [...preCaptionBuffer.map((b) => b.mediaPath), row.mediaPath],
          followUpNotes: []
        };
        preCaptionBuffer = [];
        albums.push(currentAlbum);
      } else if (
        currentAlbum &&
        (row.pk <= 96715 ||
          (!currentAlbum.closedByText &&
            Math.abs(new Date(row.ts) - new Date(currentAlbum.lastPhotoTs || currentAlbum.timestamp)) <= 15000))
      ) {
        currentAlbum.mediaPaths.push(row.mediaPath);
        currentAlbum.lastPhotoTs = row.ts;
      } else {
        preCaptionBuffer.push({ pk: row.pk, ts: row.ts, mediaPath: row.mediaPath });
      }
    } else if (row.type === 0 && row.text) {
      if (
        row.text.startsWith('🫡') ||
        row.text.startsWith('✅') ||
        row.text.startsWith('Hi Boss') ||
        row.text.startsWith('Yes Boss') ||
        row.text.startsWith('Done Megha')
      ) {
        continue;
      }
      if (row.pk > 97458 && preCaptionBuffer.length > 0) {
        currentAlbum = {
          firstPk: preCaptionBuffer[0].pk,
          timestamp: preCaptionBuffer[0].ts,
          caption: row.text,
          mediaPaths: preCaptionBuffer.map((b) => b.mediaPath),
          followUpNotes: [],
          closedByText: true
        };
        preCaptionBuffer = [];
        albums.push(currentAlbum);
      } else if (currentAlbum) {
        currentAlbum.followUpNotes.push(row.text);
        if (row.pk > 97458) currentAlbum.closedByText = true;
      }
    }
  }

  const outPhotoDir = path.join(rootDir, 'public', 'catalogues', 'whatsapp-2026-10-17');
  fs.mkdirSync(outPhotoDir, { recursive: true });

  const syncedDrafts = [];

  // Excluded sold-out / removed items:
  // - 96546: DB-DW26-26 (Lord Ganesha on Lotus Finial Solid Brass Pooja Arti Bell 5")
  // - 96560: DB-DW26-28 (Royal Stag Antler Solid Brass Candle Stand 4" — Sold Out in Experience Center Db pk=97435)
  const EXCLUDED_ALBUM_PKS = new Set([96546, 96560]);

  for (let i = 0; i < albums.length; i++) {
    const album = albums[i];
    if (EXCLUDED_ALBUM_PKS.has(album.firstPk)) continue;
    const indexNum = i + 1;
    const indexPad = String(indexNum).padStart(2, '0');
    const parsed = parseWhatsAppCaption(album.caption);
    const override = CURATED_ALBUM_OVERRIDES[album.firstPk] || {};

    // Order photos so the cleanest non-hand Hero shot is first
    let orderedRelPaths = [...album.mediaPaths];
    if (Array.isArray(override.galleryOrderSubpaths) && override.galleryOrderSubpaths.length) {
      const reordered = [];
      for (const sub of override.galleryOrderSubpaths) {
        const found = orderedRelPaths.find((p) => p.endsWith(sub));
        if (found && !reordered.includes(found)) reordered.push(found);
      }
      for (const rem of orderedRelPaths) {
        if (!reordered.includes(rem)) reordered.push(rem);
      }
      orderedRelPaths = reordered;
    } else if (override.heroMediaSubpath) {
      const heroPath = orderedRelPaths.find((p) => p.endsWith(override.heroMediaSubpath));
      if (heroPath) {
        orderedRelPaths = [heroPath, ...orderedRelPaths.filter((p) => p !== heroPath)];
      }
    } else if (orderedRelPaths.length > 1) {
      // Heuristic discovered from Ashwarya's shooting pattern:
      // The last photo in each WhatsApp album is consistently the clean top-down tabletop shot without hands!
      const lastPhoto = orderedRelPaths[orderedRelPaths.length - 1];
      orderedRelPaths = [lastPhoto, ...orderedRelPaths.slice(0, -1)];
    }

    // Copy photos to public/catalogues/whatsapp-2026-10-17/
    const publicPhotoUrls = [];
    for (let pIdx = 0; pIdx < orderedRelPaths.length; pIdx++) {
      const relMedia = orderedRelPaths[pIdx];
      const absSrc = path.join(WHATSAPP_MEDIA_ROOT, relMedia);
      if (!fs.existsSync(absSrc)) continue;
      const ext = path.extname(absSrc) || '.jpg';
      const destFileName = `item-${indexPad}-${album.firstPk}-angle-${pIdx + 1}${ext}`;
      const absDest = path.join(outPhotoDir, destFileName);
      fs.copyFileSync(absSrc, absDest);
      publicPhotoUrls.push(`/catalogues/whatsapp-2026-10-17/${destFileName}`);
    }

    const sku = override.sku || `DB-DW26-${indexPad}`;
    const name = override.name || parsed.name;
    const category = override.category || parsed.category;
    const material = override.material || parsed.material;
    const unit = override.unit || '1 Complete Unit';
    const quantity =
      override.quantityOverride !== undefined ? override.quantityOverride : parsed.quantity;
    const weightG =
      override.weightOverride !== undefined ? override.weightOverride : parsed.weightG;
    const heightCm =
      override.heightOverride !== undefined ? override.heightOverride : parsed.heightCm;
    const widthCm =
      override.widthOverride !== undefined ? override.widthOverride : parsed.widthCm;
    const lengthCm =
      override.lengthOverride !== undefined ? override.lengthOverride : parsed.lengthCm;
    const stockNote = override.stockOverride || override.stockNote || parsed.stockNote || '';
    const description = override.description || parsed.description;

    const slots = ['hero', 'front', 'back', 'detail'];
    const photosObj = {};
    publicPhotoUrls.slice(0, 4).forEach((url, idx) => {
      photosObj[slots[idx] || `extra_${idx}`] = {
        url,
        capturedAt: album.timestamp
      };
    });

    const isoTime = new Date(album.timestamp.replace(' ', 'T') + '+05:30').toISOString();

    syncedDrafts.push({
      id: `wa-${album.firstPk}`,
      whatsapp_synced: true,
      whatsapp_pk: album.firstPk,
      whatsapp_caption: album.caption,
      whatsapp_followup: album.followUpNotes.join(' | '),
      sku,
      name,
      category,
      material,
      unit,
      weight_g: weightG,
      height_cm: heightCm,
      width_cm: widthCm,
      length_cm: lengthCm,
      quantity,
      stock_note: stockNote,
      description,
      status: 'ready',
      location: 'Bengaluru Warehouse Lightbox',
      primary_photo: publicPhotoUrls[0] || '',
      photos: publicPhotoUrls,
      updated_at: isoTime,
      data: {
        sku,
        name,
        category,
        material,
        unit,
        weight_g: String(weightG || ''),
        height: heightCm ? String(heightCm) : '',
        width: widthCm ? String(widthCm) : '',
        length: lengthCm ? String(lengthCm) : '',
        quantity,
        stock_note: stockNote,
        whatsapp_synced: true,
        notes: description,
        photos: photosObj,
        locations: [
          {
            name: 'Bengaluru Warehouse',
            sellable: quantity > 0 ? String(quantity) : '',
            damaged: '0'
          }
        ]
      }
    });
  }

  const outJsonPath = path.join(rootDir, 'public', 'catalogues', 'lightbox-captures.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(syncedDrafts, null, 2), 'utf8');

  return {
    syncedCount: syncedDrafts.length,
    outJsonPath,
    outPhotoDir,
    items: syncedDrafts
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = syncWhatsAppGroupCaptures();
  console.log(
    JSON.stringify(
      {
        syncedCount: result.syncedCount,
        outJsonPath: result.outJsonPath,
        items: result.items.map((x) => ({
          sku: x.sku,
          name: x.name,
          weight_g: x.weight_g,
          dims_cm: `H:${x.height_cm} W:${x.width_cm} D:${x.length_cm}`,
          quantity: x.quantity,
          stock_note: x.stock_note,
          photosCount: x.photos.length
        }))
      },
      null,
      2
    )
  );
}
