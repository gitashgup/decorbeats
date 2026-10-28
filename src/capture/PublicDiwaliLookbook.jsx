import React, { useEffect, useMemo, useState } from 'react';
import {
  DECORBEATS_BRAND,
  buildProductShareText,
  buildProductWhatsAppUrl,
  generateSingleProductCard,
  normalizeCatalogueItem
} from './catalogueGenerator';

const PACK_FILTERS = [
  {
    id: 'all',
    label: 'All Designs',
    match: () => true
  },
  {
    id: 'pack-1-corporate-bulk-gifting',
    label: '🎁 Bulk 15–170+ pcs',
    match: (item) => Number(item.quantity) >= 15
  },
  {
    id: 'pack-2-sacred-brass-idols',
    label: '🙏 Brass Idols',
    match: (item) => {
      const c = String(item.category || '').toLowerCase();
      return c.includes('idol') || c.includes('figurine') || c.includes('tribal');
    }
  },
  {
    id: 'pack-3-statement-urlis-diyas-bells',
    label: '🪔 Urlis & Diyas',
    match: (item) => {
      const c = String(item.category || '').toLowerCase();
      return (
        c.includes('urli') ||
        c.includes('bell') ||
        c.includes('dhoop') ||
        c.includes('temple') ||
        c.includes('wall') ||
        (c.includes('diya') && Number(item.weightG) >= 150)
      );
    }
  },
  {
    id: 'pack-4-festive-trays-hampers',
    label: '✨ Trays & Hampers',
    match: (item) => {
      const c = String(item.category || '').toLowerCase();
      return (
        c.includes('tray') ||
        c.includes('hamper') ||
        c.includes('basket') ||
        c.includes('gift box') ||
        c.includes('jar') ||
        c.includes('candle')
      );
    }
  },
  {
    id: 'pack-5-pooja-essentials-return-gifts',
    label: '🌼 Pooja & Return Gifts',
    match: (item) => {
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
    }
  },
  {
    id: 'heavyweight',
    label: '⚖️ Heavy 500g+',
    match: (item) => Number(item.weightG) >= 500
  }
];

const QUICK_NOTE_PRESETS = [
  'Inclusive of GST',
  '+ GST & Shipping Extra',
  'MOQ 10 pcs · Bulk Rate',
  'MOQ 25 pcs · Corporate Rate',
  'Includes Velvet Gift Box'
];

function getSpecCardUrl(index1Based, sku) {
  const safeSlug = `${String(index1Based).padStart(2, '0')}-${String(sku || '')
    .replace(/[^a-z0-9_-]/gi, '-')
    .slice(0, 40)}`;
  return `/catalogues/cards/${safeSlug}.jpg`;
}

function parseUrlParams() {
  if (typeof window === 'undefined') {
    return { pack: 'all', search: '', sku: '', urlPrices: {}, urlNotes: {} };
  }
  const params = new URLSearchParams(window.location.search);
  const packParam = params.get('pack');
  const pack = packParam && PACK_FILTERS.some((f) => f.id === packParam) ? packParam : 'all';
  const sku = (params.get('sku') || '').trim();
  const search = (params.get('search') || '').trim();
  const singlePrice = Number(params.get('price')) || 0;
  const singleNote = (params.get('note') || '').trim();

  const urlPrices = {};
  const urlNotes = {};

  if (sku && singlePrice > 0) {
    urlPrices[sku] = singlePrice;
  }
  if (sku && singleNote) {
    urlNotes[sku] = singleNote;
  }

  // Also support multi-SKU priced quote param: ?quote=DB-DW26-01:450,DB-DW26-22:180
  const quoteParam = (params.get('quote') || '').trim();
  if (quoteParam) {
    quoteParam.split(',').forEach((entry) => {
      const [k, p] = entry.split(':');
      if (k && Number(p) > 0) {
        urlPrices[k.trim()] = Number(p);
      }
    });
  }

  return { pack, search, sku, urlPrices, urlNotes };
}

export default function PublicDiwaliLookbook({ onBackToStore }) {
  const [rawDrafts, setRawDrafts] = useState([]);
  const [packsManifest, setPacksManifest] = useState([]);
  const [playbook, setPlaybook] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialUrlState = useMemo(() => parseUrlParams(), []);

  const [activePack, setActivePack] = useState(initialUrlState.pack);
  const [search, setSearch] = useState(initialUrlState.search || '');
  const [spotlightSku, setSpotlightSku] = useState(initialUrlState.sku || '');
  const [activeAngles, setActiveAngles] = useState({});

  // Saved custom prices entered by Megha (persisted in localStorage + merged with URL price params)
  const [customPrices, setCustomPrices] = useState(() => {
    try {
      const saved = localStorage.getItem('decorbeats_megha_prices_v1');
      const parsed = saved ? JSON.parse(saved) : {};
      return { ...parsed, ...initialUrlState.urlPrices };
    } catch {
      return { ...initialUrlState.urlPrices };
    }
  });

  const [customNotes, setCustomNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('decorbeats_megha_notes_v1');
      const parsed = saved ? JSON.parse(saved) : {};
      return { ...parsed, ...initialUrlState.urlNotes };
    } catch {
      return { ...initialUrlState.urlNotes };
    }
  });

  // Megha Quick-Price Mode toggle (shows inline ₹ input directly on every card!)
  const [quickPriceMode, setQuickPriceMode] = useState(false);

  // Active item in the "Quick Price & Share to WhatsApp" modal
  const [quoteModalItem, setQuoteModalItem] = useState(null);
  const [quotePriceInput, setQuotePriceInput] = useState('');
  const [quoteNoteInput, setQuoteNoteInput] = useState('');
  const [quoteQtyInput, setQuoteQtyInput] = useState('');
  const [generatingPricedCard, setGeneratingPricedCard] = useState(false);

  const [shortlist, setShortlist] = useState(() => {
    try {
      const saved = localStorage.getItem('decorbeats_diwali_shortlist_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareHubOpen, setShareHubOpen] = useState(false);
  const [specModalItem, setSpecModalItem] = useState(null);
  const [activeReelModal, setActiveReelModal] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  const [buyerName, setBuyerName] = useState('');
  const [buyerCity, setBuyerCity] = useState('Bengaluru');
  const [orderType, setOrderType] = useState('Retail / Home & Family Gifting');
  const [buyerNotes, setBuyerNotes] = useState('');

  useEffect(() => {
    document.title = 'Decorbeats — The Brass House of India | Deepawali 2026 Catalogue';
    Promise.all([
      fetch('/catalogues/lightbox-captures.json').then((r) => (r.ok ? r.json() : [])),
      fetch('/catalogues/packs/packs-manifest.json')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/catalogues/diwali-conversion-playbook.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ])
      .then(([draftsData, packsData, playbookData]) => {
        setRawDrafts(Array.isArray(draftsData) ? draftsData : []);
        setPacksManifest(Array.isArray(packsData) ? packsData : []);
        setPlaybook(playbookData);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('decorbeats_diwali_shortlist_v1', JSON.stringify(shortlist));
    } catch {
      // ignore storage errors
    }
  }, [shortlist]);

  useEffect(() => {
    try {
      localStorage.setItem('decorbeats_megha_prices_v1', JSON.stringify(customPrices));
    } catch {
      // ignore
    }
  }, [customPrices]);

  useEffect(() => {
    try {
      localStorage.setItem('decorbeats_megha_notes_v1', JSON.stringify(customNotes));
    } catch {
      // ignore
    }
  }, [customNotes]);

  const items = useMemo(() => {
    return rawDrafts
      .map((d, idx) => {
        const norm = normalizeCatalogueItem(d, 'draft');
        if (!norm) return null;
        return {
          ...norm,
          catalogueIndex: idx + 1,
          specCardUrl: getSpecCardUrl(idx + 1, norm.sku)
        };
      })
      .filter((x) => x && x.imageUrl);
  }, [rawDrafts]);

  const totalUnitsAll = useMemo(
    () => items.reduce((s, x) => s + (Number(x.quantity) || 0), 0),
    [items]
  );

  const spotlightItem = useMemo(() => {
    if (!spotlightSku) return null;
    return items.find((x) => x.sku.toLowerCase() === spotlightSku.toLowerCase()) || null;
  }, [items, spotlightSku]);

  const filteredItems = useMemo(() => {
    const packObj = PACK_FILTERS.find((f) => f.id === activePack) || PACK_FILTERS[0];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!packObj.match(item)) return false;
      if (q) {
        const hay = `${item.sku} ${item.name} ${item.category} ${item.material} ${item.weightG}g`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, activePack, search]);

  const shortlistedEntries = useMemo(() => {
    const map = new Map(items.map((x) => [x.sku, x]));
    return Object.entries(shortlist)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([sku, qty]) => {
        const item = map.get(sku);
        if (!item) return null;
        return { item, qty: Number(qty) };
      })
      .filter(Boolean);
  }, [items, shortlist]);

  const totalShortlistUnits = useMemo(
    () => shortlistedEntries.reduce((s, e) => s + e.qty, 0),
    [shortlistedEntries]
  );

  const totalShortlistWeightKg = useMemo(() => {
    const grams = shortlistedEntries.reduce(
      (s, e) => s + (Number(e.item.weightG) || 0) * e.qty,
      0
    );
    return (grams / 1000).toFixed(2);
  }, [shortlistedEntries]);

  function setItemQty(sku, nextQty) {
    const clean = Math.max(0, Math.round(Number(nextQty) || 0));
    setShortlist((prev) => {
      const copy = { ...prev };
      if (clean <= 0) {
        delete copy[sku];
      } else {
        copy[sku] = clean;
      }
      return copy;
    });
  }

  function updateItemCustomPrice(sku, priceVal) {
    const num = Number(priceVal);
    setCustomPrices((prev) => {
      const copy = { ...prev };
      if (!num || num <= 0) {
        delete copy[sku];
      } else {
        copy[sku] = Math.round(num);
      }
      return copy;
    });
  }

  function updateItemCustomNote(sku, noteVal) {
    setCustomNotes((prev) => ({
      ...prev,
      [sku]: noteVal
    }));
  }

  function openQuoteModal(item) {
    const existingPrice = customPrices[item.sku] || '';
    const existingNote = customNotes[item.sku] || '';
    setQuoteModalItem(item);
    setQuotePriceInput(existingPrice ? String(existingPrice) : '');
    setQuoteNoteInput(existingNote);
    setQuoteQtyInput('');
  }

  function buildPricedProductLink(item, priceVal, noteVal) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.decorbeats.com';
    const params = new URLSearchParams();
    params.set('sku', item.sku);
    if (Number(priceVal) > 0) {
      params.set('price', String(Math.round(Number(priceVal))));
    }
    if (noteVal && String(noteVal).trim()) {
      params.set('note', String(noteVal).trim());
    }
    return `${origin}/diwali-stock?${params.toString()}`;
  }

  function buildSingleItemQuoteWhatsAppMessage(item, priceVal, noteVal, qtyVal = '') {
    const cleanPrice = Math.round(Number(priceVal) || 0);
    const cleanQty = Math.round(Number(qtyVal) || 0);
    const shareUrl = buildPricedProductLink(item, cleanPrice, noteVal);
    const lines = [
      `🪔 *DECORBEATS — The Brass House of India*`,
      ``,
      `✨ *${item.name}*`,
      `• *SKU:* ${item.sku} | *Material:* ${item.material}`,
      `• *Weight:* ${item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass'}`,
      `• *Size:* ${item.dimensionsSpec.combinedSummary}`,
      `• *Ready Stock:* ${item.quantity > 0 ? `${item.quantity} pcs available` : 'Available on order'}`
    ];

    if (cleanPrice > 0) {
      lines.push(
        `💰 *Special Festive Price:* *₹${cleanPrice.toLocaleString('en-IN')} / pc*${
          noteVal ? ` _(${noteVal})_` : ''
        }`
      );
    }
    if (cleanQty > 0 && cleanPrice > 0) {
      lines.push(
        `📦 *Quote for ${cleanQty} pcs:* *₹${(cleanPrice * cleanQty).toLocaleString('en-IN')}*`
      );
    }

    lines.push(``);
    lines.push(`📲 *View Multi-Angle Photos & Confirm Order:*`);
    lines.push(shareUrl);
    return lines.join('\n');
  }

  async function handleSharePricedSpecCard(item, priceVal, noteVal, qtyVal = '') {
    const cleanPrice = Math.round(Number(priceVal) || 0);
    if (cleanPrice > 0) {
      updateItemCustomPrice(item.sku, cleanPrice);
    }
    if (noteVal !== undefined) {
      updateItemCustomNote(item.sku, noteVal);
    }

    const shareUrl = buildPricedProductLink(item, cleanPrice, noteVal);
    const whatsappMessage = buildSingleItemQuoteWhatsAppMessage(item, cleanPrice, noteVal, qtyVal);

    setGeneratingPricedCard(true);
    try {
      const cardData = await generateSingleProductCard(item, {
        customPrice: cleanPrice,
        customPriceNote: noteVal,
        shareUrl
      });

      const file = new File([cardData.imageBlob], cardData.imageFilename, {
        type: 'image/jpeg'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${item.name} — ₹${cleanPrice || ''}`,
          text: whatsappMessage
        });
        setGeneratingPricedCard(false);
        return;
      }

      // Desktop fallback: download the priced JPG card & open WhatsApp with the message
      const objUrl = URL.createObjectURL(cardData.imageBlob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = cardData.imageFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);

      window.open(
        `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch {
      // If user cancels native share or canvas fails, fallback to WhatsApp text share
    } finally {
      setGeneratingPricedCard(false);
    }
  }

  function handleSendInstantWhatsAppQuote(item, priceVal, noteVal, qtyVal = '') {
    const cleanPrice = Math.round(Number(priceVal) || 0);
    if (cleanPrice > 0) {
      updateItemCustomPrice(item.sku, cleanPrice);
    }
    if (noteVal !== undefined) {
      updateItemCustomNote(item.sku, noteVal);
    }
    const msg = buildSingleItemQuoteWhatsAppMessage(item, cleanPrice, noteVal, qtyVal);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  function buildShortlistWhatsAppMessage() {
    const lines = [
      `🪔 *DECORBEATS — The Brass House of India*`,
      `*Deepawali 2026 Stock Shortlist*`,
      ``
    ];
    if (buyerName.trim()) lines.push(`👤 *Name / Company:* ${buyerName.trim()}`);
    if (buyerCity.trim()) lines.push(`📍 *City:* ${buyerCity.trim()}`);
    lines.push(`🎁 *Order Type:* ${orderType}`);
    lines.push(``);
    lines.push(
      `📋 *Shortlisted Items (${shortlistedEntries.length} Designs · ${totalShortlistUnits} Units · ${totalShortlistWeightKg} kg):*`
    );

    let runningTotal = 0;
    let allHavePrice = true;

    shortlistedEntries.forEach(({ item, qty }, idx) => {
      const wLabel = item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass';
      const uPrice = Number(customPrices[item.sku]) || 0;
      if (uPrice > 0) {
        runningTotal += uPrice * qty;
      } else {
        allHavePrice = false;
      }
      const priceText = uPrice > 0 ? ` | *₹${uPrice.toLocaleString('en-IN')}/pc*` : '';
      lines.push(
        `${idx + 1}. *${item.sku}* — ${item.name}\n   • Qty: *${qty} pcs*${priceText} | ${wLabel} | ${item.dimensionsSpec.cmSummary}`
      );
    });

    if (runningTotal > 0) {
      lines.push(``);
      lines.push(
        `💰 *${allHavePrice ? 'Estimated Total' : 'Subtotal (Priced Items)'}:* ₹${runningTotal.toLocaleString('en-IN')}`
      );
    }

    if (buyerNotes.trim()) {
      lines.push(``);
      lines.push(`📝 *Notes:* ${buyerNotes.trim()}`);
    }

    lines.push(``);
    lines.push(`Please confirm availability and dispatch from Bengaluru.`);
    return lines.join('\n');
  }

  function handleSendShortlistWhatsApp() {
    const text = buildShortlistWhatsAppMessage();
    const url = `https://wa.me/${DECORBEATS_BRAND.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleShareMultiItemQuoteToCustomer() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.decorbeats.com';
    const quotePairs = shortlistedEntries
      .map(({ item }) => {
        const p = Number(customPrices[item.sku]) || 0;
        return p > 0 ? `${item.sku}:${p}` : `${item.sku}:0`;
      })
      .join(',');
    const quoteLink = `${origin}/diwali-stock?quote=${encodeURIComponent(quotePairs)}`;
    const text = `${buildShortlistWhatsAppMessage()}\n\n🔗 *View Curated Catalogue & Photos:*\n${quoteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  async function handleCopyText(id, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2200);
    } catch {
      // fallback
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF6EE',
        color: '#181412',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        paddingBottom: shortlistedEntries.length > 0 ? 100 : 40
      }}
    >
      {/* Top Gold Accent Bar */}
      <div style={{ height: 5, background: 'linear-gradient(90deg, #C59B43, #E5C878, #C59B43)' }} />

      {/* Clean, Minimal Mobile-First Header */}
      <header
        style={{
          background: '#161311',
          color: '#FAF6EE',
          padding: '14px 16px 16px',
          borderBottom: '2px solid #C59B43'
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          {/* Top Row: Brand Name + Tagline on Left, Quick Actions on Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {onBackToStore ? (
                  <button
                    type="button"
                    onClick={onBackToStore}
                    style={{
                      background: 'transparent',
                      color: '#C59B43',
                      border: '1px solid rgba(197,155,67,0.5)',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ← Store
                  </button>
                ) : (
                  <a
                    href="/"
                    style={{
                      color: '#C59B43',
                      border: '1px solid rgba(197,155,67,0.5)',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    ← Home
                  </a>
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: '#D7CBB8',
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}
                >
                  Moradabad Brass · {totalUnitsAll.toLocaleString('en-IN')} Ready Units
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 'clamp(22px, 5vw, 32px)',
                  margin: '6px 0 2px',
                  color: '#FAF6EE',
                  letterSpacing: '0.03em',
                  lineHeight: 1.1
                }}
              >
                DECORBEATS
              </h1>
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 'clamp(14px, 3.4vw, 18px)',
                  color: '#E5C878',
                  fontWeight: 600
                }}
              >
                The Brass House of India
              </div>
            </div>

            {/* Compact Action Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setQuickPriceMode((prev) => !prev)}
                style={{
                  background: quickPriceMode ? '#E5C878' : '#241E1A',
                  color: quickPriceMode ? '#161311' : '#E5C878',
                  border: '1.5px solid #C59B43',
                  borderRadius: 999,
                  padding: '7px 13px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                💰 {quickPriceMode ? 'Done Pricing' : 'Quick Price & Share'}
              </button>

              <a
                href="/catalogues/Decorbeats-Clean-Catalogue-2026.pdf"
                download="Decorbeats-Clean-Catalogue-2026.pdf"
                style={{
                  background: '#13332D',
                  color: '#FFFFFF',
                  border: '1.5px solid #C59B43',
                  borderRadius: 999,
                  padding: '7px 13px',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                ⬇ Clean PDF Catalogue
              </a>

              <button
                type="button"
                onClick={() => setShareHubOpen((prev) => !prev)}
                style={{
                  background: shareHubOpen ? '#C59B43' : 'transparent',
                  color: shareHubOpen ? '#161311' : '#D7CBB8',
                  border: '1px solid rgba(197,155,67,0.5)',
                  borderRadius: 999,
                  padding: '7px 11px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {shareHubOpen ? '✕ Close Kit' : '📦 Packs & Reels'}
              </button>
            </div>
          </div>

          {/* Megha Quick-Price Mode Helper Banner (Only visible when Quick Price Mode is toggled ON) */}
          {quickPriceMode && (
            <div
              style={{
                marginTop: 10,
                background: '#241E1A',
                border: '1px solid #E5C878',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                color: '#FAF6EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <span>
                ⚡ <strong>Megha Quick-Price Mode:</strong> Type a ₹ price on any product card below and tap{' '}
                <strong style={{ color: '#E5C878' }}>Send on WhatsApp</strong> to share a custom-priced Spec Card + Link!
              </span>
              {Object.keys(customPrices).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomPrices({});
                    setCustomNotes({});
                  }}
                  style={{
                    background: '#3A2020',
                    color: '#FFB4B4',
                    border: '1px solid #7C3030',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Reset Saved Prices ({Object.keys(customPrices).length})
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Expandable Share Packs & Reels Drawer (Collapsed by default so mobile stays ultra-clean) */}
      {shareHubOpen && (
        <section
          style={{
            background: '#211C18',
            color: '#FAF6EE',
            borderBottom: '2px solid #C59B43',
            padding: '16px'
          }}
        >
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E5C878', marginBottom: 10 }}>
              📲 Category Mini-PDFs, 6-Up Summary Boards &amp; 9:16 Video Reels
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 10,
                marginBottom: 14
              }}
            >
              {packsManifest.map((pack) => (
                <div
                  key={pack.id}
                  style={{
                    background: '#161311',
                    border: '1px solid rgba(197,155,67,0.5)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: '#E5C878', fontWeight: 700 }}>
                      PACK {pack.number} · {pack.skuCount} SKUs ({pack.totalUnits} Units)
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>
                      {pack.shortTitle}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a
                      href={pack.pdfUrl}
                      download
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: '#C59B43',
                        color: '#161311',
                        padding: '6px 8px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      ⬇ PDF ({pack.pdfSizeMB}MB)
                    </a>
                    <a
                      href={pack.boardUrl}
                      download
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: '#2A2218',
                        color: '#E5C878',
                        border: '1px solid #C59B43',
                        padding: '6px 8px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      🖼 6-Up JPG
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {playbook?.reels?.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 10
                }}
              >
                {playbook.reels.map((reel) => (
                  <div
                    key={reel.id}
                    style={{
                      background: '#161311',
                      border: '1px solid rgba(197,155,67,0.4)',
                      borderRadius: 10,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{reel.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setActiveReelModal(reel)}
                        style={{
                          background: '#13332D',
                          color: '#FFFFFF',
                          border: '1px solid #C59B43',
                          borderRadius: 6,
                          padding: '5px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ▶
                      </button>
                      <a
                        href={reel.videoUrl}
                        download
                        style={{
                          background: '#C59B43',
                          color: '#161311',
                          borderRadius: 6,
                          padding: '5px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        ⬇ MP4
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sticky Category Filter Pills & Search */}
      <section
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(250, 246, 238, 0.97)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #DEC99A',
          padding: '10px 12px'
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 6,
              scrollbarWidth: 'none'
            }}
          >
            {PACK_FILTERS.map((pf) => {
              const isSelected = activePack === pf.id && !spotlightItem;
              return (
                <button
                  key={pf.id}
                  type="button"
                  onClick={() => {
                    setSpotlightSku('');
                    setActivePack(pf.id);
                  }}
                  style={{
                    flexShrink: 0,
                    background: isSelected ? '#161311' : '#FFFFFF',
                    color: isSelected ? '#E5C878' : '#2C241E',
                    border: isSelected ? '1.5px solid #C59B43' : '1px solid #D5C197',
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {pf.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSpotlightSku('');
                setSearch(e.target.value);
              }}
              placeholder="Search SKU (e.g. DB-DW26-01), Ganesha, Urli, Tray, Diya..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1.5px solid #C59B43',
                background: '#FFFFFF',
                fontSize: 13,
                color: '#181412'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: '#231E1A',
                  color: '#E5C878',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ maxWidth: 1180, margin: '14px auto', padding: '0 12px' }}>
        {/* Customer Spotlight Card when opening a shared single-product priced link (?sku=DB-DW26-01&price=450) */}
        {spotlightItem && (
          <div
            style={{
              background: '#FFFFFF',
              border: '2.5px solid #C59B43',
              borderRadius: 18,
              padding: 16,
              marginBottom: 20,
              boxShadow: '0 12px 32px rgba(22, 19, 17, 0.12)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12
              }}
            >
              <span
                style={{
                  background: '#13332D',
                  color: '#E5C878',
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800
                }}
              >
                ✦ SHARED PRODUCT QUOTE · {spotlightItem.sku}
              </span>
              <button
                type="button"
                onClick={() => setSpotlightSku('')}
                style={{
                  background: '#FAF6EE',
                  color: '#181412',
                  border: '1px solid #C59B43',
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                View All Designs →
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
                alignItems: 'center'
              }}
            >
              <div>
                <div
                  style={{
                    height: 300,
                    background: '#F8F5EE',
                    borderRadius: 14,
                    border: '1px solid #EDE2CA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={
                      (spotlightItem.allPhotos || [spotlightItem.imageUrl])[
                        activeAngles[spotlightItem.sku] || 0
                      ] || spotlightItem.imageUrl
                    }
                    alt={spotlightItem.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
                {(spotlightItem.allPhotos || []).length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                    {spotlightItem.allPhotos.slice(0, 5).map((u, idx) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() =>
                          setActiveAngles((prev) => ({ ...prev, [spotlightItem.sku]: idx }))
                        }
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          border:
                            (activeAngles[spotlightItem.sku] || 0) === idx
                              ? '2px solid #C59B43'
                              : '1px solid #D8C398',
                          padding: 2,
                          background: '#FFF',
                          cursor: 'pointer'
                        }}
                      >
                        <img
                          src={u}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 22,
                    margin: '0 0 8px',
                    color: '#181412'
                  }}
                >
                  {spotlightItem.name}
                </h2>

                {customPrices[spotlightItem.sku] > 0 && (
                  <div
                    style={{
                      background: '#161311',
                      color: '#FFFFFF',
                      border: '2px solid #C59B43',
                      borderRadius: 12,
                      padding: '10px 14px',
                      marginBottom: 12
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#E5C878', fontWeight: 700 }}>
                      SPECIAL FESTIVE QUOTE
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>
                      ₹{Number(customPrices[spotlightItem.sku]).toLocaleString('en-IN')}{' '}
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#E5C878' }}>/ pc</span>
                    </div>
                    {customNotes[spotlightItem.sku] && (
                      <div style={{ fontSize: 12, color: '#D7CBB8', marginTop: 2 }}>
                        {customNotes[spotlightItem.sku]}
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 12,
                    fontSize: 13,
                    fontWeight: 700
                  }}
                >
                  <span
                    style={{
                      background: '#F4ECE0',
                      padding: '6px 10px',
                      borderRadius: 8
                    }}
                  >
                    ⚖️ {spotlightItem.weightG > 0 ? spotlightItem.weightSpec.shortLabel : 'Solid Brass'}
                  </span>
                  <span
                    style={{
                      background: '#F4ECE0',
                      padding: '6px 10px',
                      borderRadius: 8
                    }}
                  >
                    📐 {spotlightItem.dimensionsSpec.combinedSummary}
                  </span>
                  <span
                    style={{
                      background: '#E8F4F0',
                      color: '#13332D',
                      padding: '6px 10px',
                      borderRadius: 8
                    }}
                  >
                    📦 {spotlightItem.quantity > 0 ? `${spotlightItem.quantity} Ready` : 'Available'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={buildProductWhatsAppUrl(spotlightItem, {
                      customPrice: customPrices[spotlightItem.sku] || 0
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#13332D',
                      color: '#FFFFFF',
                      border: '1.5px solid #C59B43',
                      borderRadius: 12,
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    📲 Confirm / Order on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => openQuoteModal(spotlightItem)}
                    style={{
                      background: '#FAF6EE',
                      color: '#181412',
                      border: '1.5px solid #C59B43',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    💰 Edit Price &amp; Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, fontSize: 16, color: '#6E5D47' }}>
            Loading Decorbeats Deepawali collection…
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #DEC99A'
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>No matching designs</h3>
            <button
              type="button"
              onClick={() => {
                setActivePack('all');
                setSearch('');
              }}
              style={{
                background: '#161311',
                color: '#E5C878',
                border: '1px solid #C59B43',
                borderRadius: 999,
                padding: '8px 16px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Show All Designs
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 14
            }}
          >
            {filteredItems.map((item) => {
              const photos = item.allPhotos?.length ? item.allPhotos : [item.imageUrl];
              const currentPhotoIdx = activeAngles[item.sku] || 0;
              const activePhotoUrl = photos[currentPhotoIdx] || item.imageUrl;
              const shortlistedQty = shortlist[item.sku] || 0;
              const itemPrice = Number(customPrices[item.sku]) || 0;
              const itemNote = customNotes[item.sku] || '';

              const isScarce = item.quantity > 0 && item.quantity <= 4;
              const isBulkReady = item.quantity >= 20;

              return (
                <article
                  key={item.sku}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    border:
                      shortlistedQty > 0
                        ? '2px solid #13332D'
                        : itemPrice > 0
                        ? '2px solid #C59B43'
                        : '1px solid #E2D2B0',
                    boxShadow: '0 4px 14px rgba(24, 20, 18, 0.05)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Minimal Top Strip: SKU + Ready Stock */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px 6px',
                        gap: 6
                      }}
                    >
                      <span
                        style={{
                          background: '#231E1A',
                          color: '#E5C878',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800
                        }}
                      >
                        {item.sku}
                      </span>

                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {itemPrice > 0 && (
                          <span
                            style={{
                              background: '#FEF3C7',
                              color: '#78350F',
                              border: '1px solid #C59B43',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 800
                            }}
                          >
                            ₹{itemPrice.toLocaleString('en-IN')}/pc
                          </span>
                        )}
                        <span
                          style={{
                            background: isScarce ? '#7C1D1D' : isBulkReady ? '#13332D' : '#2C241E',
                            color: '#FFFFFF',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {item.quantity > 0
                            ? isScarce
                              ? `Only ${item.quantity} Left`
                              : `${item.quantity} Ready`
                            : 'Enquire'}
                        </span>
                      </div>
                    </div>

                    {/* Crisp Product Image */}
                    <div
                      style={{
                        position: 'relative',
                        height: 250,
                        background: '#F8F5EE',
                        margin: '0 10px',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid #EFE4CE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={activePhotoUrl}
                        alt={item.name}
                        loading="lazy"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSpecModalItem(item)}
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          background: 'rgba(22, 19, 17, 0.82)',
                          color: '#E5C878',
                          border: '1px solid #C59B43',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        📄 Card
                      </button>
                    </div>

                    {/* Compact Angle Thumbnails */}
                    {photos.length > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          padding: '8px 10px 2px',
                          overflowX: 'auto'
                        }}
                      >
                        {photos.slice(0, 5).map((pUrl, idx) => (
                          <button
                            key={pUrl}
                            type="button"
                            onClick={() =>
                              setActiveAngles((prev) => ({
                                ...prev,
                                [item.sku]: idx
                              }))
                            }
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              border:
                                currentPhotoIdx === idx
                                  ? '2px solid #C59B43'
                                  : '1px solid #D8C398',
                              padding: 1,
                              background: '#FFFFFF',
                              cursor: 'pointer',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}
                          >
                            <img
                              src={pUrl}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: 5
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Clean Title + 1-Line Weight & Size Pills (No Wall of Text!) */}
                    <div style={{ padding: '10px 12px 6px' }}>
                      <h2
                        style={{
                          fontFamily: 'Georgia, serif',
                          fontSize: 16,
                          margin: '0 0 6px',
                          color: '#181412',
                          lineHeight: 1.25
                        }}
                      >
                        {item.name}
                      </h2>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#2C241E'
                        }}
                      >
                        <span
                          style={{
                            background: '#181412',
                            color: '#E5C878',
                            padding: '4px 8px',
                            borderRadius: 6
                          }}
                        >
                          ⚖️ {item.weightG > 0 ? item.weightSpec.shortLabel : 'Solid Brass'}
                        </span>
                        <span
                          style={{
                            background: '#F3ECE0',
                            padding: '4px 8px',
                            borderRadius: 6
                          }}
                        >
                          📐 {item.dimensionsSpec.inchSummary || item.dimensionsSpec.cmSummary}
                        </span>
                        <span
                          style={{
                            background: '#F3ECE0',
                            color: '#6E5D47',
                            padding: '4px 8px',
                            borderRadius: 6
                          }}
                        >
                          {item.material.includes('Iron')
                            ? 'Artisan Iron'
                            : item.material.includes('Aluminium')
                            ? 'Metal & Brass'
                            : 'Solid Brass'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Inline Quick-Price Bar (if enabled) + 1-Tap Action Buttons */}
                  <div
                    style={{
                      padding: '8px 12px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    {/* Inline Quick-Price Input when Megha toggles Quick Price Mode */}
                    {quickPriceMode && (
                      <div
                        style={{
                          background: '#FDF8EC',
                          border: '1.5px solid #C59B43',
                          borderRadius: 10,
                          padding: 6,
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#78350F', paddingLeft: 4 }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          placeholder="Price/pc"
                          value={itemPrice || ''}
                          onChange={(e) => updateItemCustomPrice(item.sku, e.target.value)}
                          style={{
                            width: 82,
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #C59B43',
                            fontSize: 13,
                            fontWeight: 800
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSendInstantWhatsAppQuote(item, itemPrice, itemNote)}
                          style={{
                            flex: 1,
                            background: '#13332D',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 7,
                            padding: '7px 8px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          📲 WhatsApp Quote
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSharePricedSpecCard(item, itemPrice, itemNote)}
                          title="Generate & Share Priced 9:16 Photo Card"
                          style={{
                            background: '#C59B43',
                            color: '#161311',
                            border: 'none',
                            borderRadius: 7,
                            padding: '7px 8px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🖼 Card
                        </button>
                      </div>
                    )}

                    {shortlistedQty === 0 ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setItemQty(item.sku, 1)}
                          style={{
                            flex: 1,
                            background: '#13332D',
                            color: '#FFFFFF',
                            border: '1px solid #C59B43',
                            borderRadius: 10,
                            padding: '9px 10px',
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          + Shortlist
                        </button>

                        <button
                          type="button"
                          onClick={() => openQuoteModal(item)}
                          style={{
                            background: '#FAF3E0',
                            color: '#181412',
                            border: '1.5px solid #C59B43',
                            borderRadius: 10,
                            padding: '9px 11px',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          💰 {itemPrice > 0 ? `₹${itemPrice} · Share` : 'Price & Share'}
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: '#EDF7F4',
                          border: '1.5px solid #13332D',
                          borderRadius: 10,
                          padding: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setItemQty(item.sku, shortlistedQty - 1)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 7,
                            border: '1px solid #13332D',
                            background: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: 16,
                            cursor: 'pointer'
                          }}
                        >
                          −
                        </button>
                        <div style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={shortlistedQty}
                            onChange={(e) => setItemQty(item.sku, e.target.value)}
                            style={{
                              width: 58,
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: 14,
                              border: '1px solid #C59B43',
                              borderRadius: 6,
                              padding: '2px'
                            }}
                          />{' '}
                          <span style={{ fontSize: 11, fontWeight: 700 }}>pcs</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setItemQty(item.sku, shortlistedQty + 1)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 7,
                            border: '1px solid #13332D',
                            background: '#13332D',
                            color: '#FFFFFF',
                            fontWeight: 800,
                            fontSize: 16,
                            cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuoteModal(item)}
                          style={{
                            background: '#FAF3E0',
                            color: '#181412',
                            border: '1px solid #C59B43',
                            borderRadius: 7,
                            padding: '6px 8px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          💰 Share
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Megha's 1-Tap "Quick Price & Share to Customer on WhatsApp" Modal */}
      {quoteModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14
          }}
          onClick={() => setQuoteModalItem(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#FAF6EE',
              borderRadius: 20,
              border: '2px solid #C59B43',
              padding: 18,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1.5px solid #DEC99A',
                paddingBottom: 10,
                marginBottom: 12
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#8C651E' }}>
                  QUICK PRICE &amp; WHATSAPP SHARE
                </div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700 }}>
                  {quoteModalItem.sku} · {quoteModalItem.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuoteModalItem(null)}
                style={{
                  background: '#231E1A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Product Summary Strip */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                background: '#FFFFFF',
                padding: 10,
                borderRadius: 12,
                border: '1px solid #DEC99A',
                marginBottom: 12
              }}
            >
              <img
                src={quoteModalItem.imageUrl}
                alt={quoteModalItem.name}
                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#F8F5EE' }}
              />
              <div style={{ fontSize: 12, color: '#4A3F33', lineHeight: 1.4 }}>
                <div>
                  <strong>Weight:</strong>{' '}
                  {quoteModalItem.weightG > 0 ? quoteModalItem.weightSpec.shortLabel : 'Solid Brass'} ·{' '}
                  <strong>Stock:</strong> {quoteModalItem.quantity} Ready
                </div>
                <div>
                  <strong>Size:</strong> {quoteModalItem.dimensionsSpec.combinedSummary}
                </div>
              </div>
            </div>

            {/* Step 1: Enter Unit Price (₹) & Optional Quantity */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 2 }}>
                <label
                  style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#181412', marginBottom: 4 }}
                >
                  UNIT PRICE (₹ / PC) *
                </label>
                <input
                  type="number"
                  autoFocus
                  placeholder="e.g. 450"
                  value={quotePriceInput}
                  onChange={(e) => setQuotePriceInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '2px solid #C59B43',
                    fontSize: 18,
                    fontWeight: 800,
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label
                  style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6E5D47', marginBottom: 4 }}
                >
                  QTY (OPTIONAL)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={quoteQtyInput}
                  onChange={(e) => setQuoteQtyInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #D5C197',
                    fontSize: 16,
                    fontWeight: 700,
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Step 2: 1-Tap Note Presets */}
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6E5D47', marginBottom: 4 }}
              >
                TERMS / MOQ NOTE (TAP TO ADD OR TYPE)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {QUICK_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setQuoteNoteInput((prev) => (prev === preset ? '' : preset))
                    }
                    style={{
                      background: quoteNoteInput === preset ? '#161311' : '#FFFFFF',
                      color: quoteNoteInput === preset ? '#E5C878' : '#2C241E',
                      border: '1px solid #C59B43',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type custom note (e.g. Special Corporate Rate + GST)"
                value={quoteNoteInput}
                onChange={(e) => setQuoteNoteInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #D5C197',
                  fontSize: 13,
                  background: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Primary Share Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                disabled={generatingPricedCard}
                onClick={() =>
                  handleSharePricedSpecCard(
                    quoteModalItem,
                    quotePriceInput,
                    quoteNoteInput,
                    quoteQtyInput
                  )
                }
                style={{
                  width: '100%',
                  background: '#13332D',
                  color: '#FFFFFF',
                  border: '2px solid #C59B43',
                  borderRadius: 12,
                  padding: '13px 16px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {generatingPricedCard
                  ? '⏳ Stamping ₹ Price on Spec Card…'
                  : `📲 Share Priced Photo Card + Quote${
                      Number(quotePriceInput) > 0
                        ? ` (₹${Number(quotePriceInput).toLocaleString('en-IN')}/pc)`
                        : ''
                    }`}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendInstantWhatsAppQuote(
                    quoteModalItem,
                    quotePriceInput,
                    quoteNoteInput,
                    quoteQtyInput
                  )
                }
                style={{
                  width: '100%',
                  background: '#C59B43',
                  color: '#161311',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                💬 Send WhatsApp Text + Priced Customer Link
              </button>

              <button
                type="button"
                onClick={() => {
                  const cleanPrice = Math.round(Number(quotePriceInput) || 0);
                  if (cleanPrice > 0) updateItemCustomPrice(quoteModalItem.sku, cleanPrice);
                  updateItemCustomNote(quoteModalItem.sku, quoteNoteInput);
                  handleCopyText(
                    `quote-${quoteModalItem.sku}`,
                    buildSingleItemQuoteWhatsAppMessage(
                      quoteModalItem,
                      quotePriceInput,
                      quoteNoteInput,
                      quoteQtyInput
                    )
                  );
                }}
                style={{
                  width: '100%',
                  background: '#231E1A',
                  color: '#E5C878',
                  border: '1px solid #C59B43',
                  borderRadius: 10,
                  padding: '10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {copiedId === `quote-${quoteModalItem.sku}`
                  ? '✓ Copied Quote & Priced Link!'
                  : '📋 Copy Quote Message & Priced Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Shortlist Bar */}
      {shortlistedEntries.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#161311',
            borderTop: '2.5px solid #C59B43',
            padding: '10px 14px',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.35)'
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: '#E5C878', fontWeight: 700 }}>
                SHORTLIST READY
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                {shortlistedEntries.length} Designs · {totalShortlistUnits} pcs · {totalShortlistWeightKg} kg
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: '#13332D',
                  color: '#FFFFFF',
                  border: '1.5px solid #E5C878',
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                📲 Review &amp; Send on WhatsApp →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortlist Review & Multi-Item Quote Drawer */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#FAF6EE',
              height: '100%',
              overflowY: 'auto',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '2px solid #C59B43',
                  paddingBottom: 10,
                  marginBottom: 14
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8C651E' }}>
                    DECORBEATS — THE BRASS HOUSE OF INDIA
                  </div>
                  <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, margin: 0 }}>
                    Shortlist ({shortlistedEntries.length} Designs)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    background: '#231E1A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 999,
                    width: 34,
                    height: 34,
                    fontSize: 16,
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Shortlisted Items with Inline ₹ Price Option */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {shortlistedEntries.map(({ item, qty }) => (
                  <div
                    key={item.sku}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      background: '#FFFFFF',
                      padding: 10,
                      borderRadius: 12,
                      border: '1px solid #DEC99A'
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#8C651E' }}>
                        {item.sku} · {item.weightSpec.shortLabel}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#181412' }}>{item.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#6E5D47' }}>₹/pc:</span>
                        <input
                          type="number"
                          placeholder="Quote ₹"
                          value={customPrices[item.sku] || ''}
                          onChange={(e) => updateItemCustomPrice(item.sku, e.target.value)}
                          style={{
                            width: 72,
                            padding: '3px 6px',
                            borderRadius: 6,
                            border: '1px solid #C59B43',
                            fontSize: 12,
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => setItemQty(item.sku, qty - 1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: '1px solid #C59B43',
                          background: '#FAF6EE',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        −
                      </button>
                      <span style={{ fontWeight: 800, minWidth: 24, textAlign: 'center', fontSize: 13 }}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItemQty(item.sku, qty + 1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: '1px solid #13332D',
                          background: '#13332D',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Buyer Details */}
              <div
                style={{
                  background: '#FFFFFF',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #DEC99A',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <input
                  type="text"
                  placeholder="Your Name / Company Name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #D5C197',
                    fontSize: 13
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="City"
                    value={buyerCity}
                    onChange={(e) => setBuyerCity(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #D5C197',
                      fontSize: 13
                    }}
                  />
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #D5C197',
                      fontSize: 12
                    }}
                  >
                    <option value="Retail / Home & Family Gifting">Home &amp; Family</option>
                    <option value="Corporate / Bulk Gifting (with GST)">Corporate / Bulk</option>
                    <option value="Society / Pooja Return Gifts">Return Gifts</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  placeholder="Notes (gift box, delivery date, or custom terms)"
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #D5C197',
                    fontSize: 12
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={handleSendShortlistWhatsApp}
                style={{
                  width: '100%',
                  background: '#13332D',
                  color: '#FFFFFF',
                  border: '2px solid #C59B43',
                  borderRadius: 12,
                  padding: '13px',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                📲 Send Order / Inquiry to Decorbeats
              </button>

              <button
                type="button"
                onClick={handleShareMultiItemQuoteToCustomer}
                style={{
                  width: '100%',
                  background: '#C59B43',
                  color: '#161311',
                  border: 'none',
                  borderRadius: 12,
                  padding: '11px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                💰 Share Priced Quote Link with Customer (Megha)
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleCopyText('shortlist', buildShortlistWhatsAppMessage())}
                  style={{
                    flex: 1,
                    background: '#231E1A',
                    color: '#E5C878',
                    border: '1px solid #C59B43',
                    borderRadius: 10,
                    padding: '9px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {copiedId === 'shortlist' ? '✓ Copied!' : '📋 Copy Text'}
                </button>
                <button
                  type="button"
                  onClick={() => setShortlist({})}
                  style={{
                    background: '#F5E6E6',
                    color: '#7C1D1D',
                    border: '1px solid #E2B4B4',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9:16 Spec Card Lightbox Modal */}
      {specModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setSpecModalItem(null)}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              background: '#161311',
              borderRadius: 20,
              border: '2px solid #C59B43',
              padding: 14,
              maxHeight: '94vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <span style={{ color: '#E5C878', fontWeight: 700, fontSize: 13 }}>
                {specModalItem.sku} · 9:16 Spec Card
              </span>
              <button
                type="button"
                onClick={() => setSpecModalItem(null)}
                style={{
                  background: '#2A2218',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={specModalItem.specCardUrl}
              alt={specModalItem.name}
              style={{ width: '100%', borderRadius: 12, display: 'block' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  const it = specModalItem;
                  setSpecModalItem(null);
                  openQuoteModal(it);
                }}
                style={{
                  flex: 1,
                  background: '#C59B43',
                  color: '#161311',
                  border: 'none',
                  padding: '10px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                💰 Add Price &amp; Share
              </button>
              <a
                href={specModalItem.specCardUrl}
                download={`${specModalItem.sku}-Spec-Card.jpg`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: '#13332D',
                  color: '#FFFFFF',
                  border: '1px solid #E5C878',
                  padding: '10px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: 'none'
                }}
              >
                ⬇ Download JPG
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Video Reel Preview Modal */}
      {activeReelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setActiveReelModal(null)}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              background: '#161311',
              borderRadius: 20,
              border: '2px solid #C59B43',
              padding: 14,
              maxHeight: '94vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10
              }}
            >
              <span style={{ color: '#E5C878', fontWeight: 700, fontSize: 13 }}>
                {activeReelModal.title}
              </span>
              <button
                type="button"
                onClick={() => setActiveReelModal(null)}
                style={{
                  background: '#2A2218',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <video
              src={activeReelModal.videoUrl}
              poster={activeReelModal.posterUrl}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: 12, background: '#000' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
