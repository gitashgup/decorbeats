import React, { useEffect, useMemo, useState } from 'react';
import {
  DECORBEATS_BRAND,
  buildMergedCataloguePool,
  buildProductShareText,
  buildProductWhatsAppUrl,
  describeWeightBadge,
  formatDimensionsSpec,
  generateDiwaliCataloguePdf,
  generateFlowReferenceFrame,
  generateGoogleFlowPrompt,
  generateProductPromoVideoReel,
  generateSingleProductCard,
  renderBackCoverSlideCanvas,
  renderBrandStorySlideCanvas,
  renderCoverSlideCanvas,
  renderProductSlideCanvas
} from './catalogueGenerator';
import { supabase } from '../lib/supabase';
import { updateSharedDraft, mergeCaptureDraft } from './sharedDraft';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function shareOrDownloadFile(blob, filename, title, text) {
  try {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text,
        files: [file]
      });
      return 'Shared via device share sheet!';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'Share cancelled.';
  }
  triggerDownload(blob, filename);
  return `Downloaded ${filename}`;
}

export default function CatalogueStudio({
  products = [],
  drafts = [],
  onStartLightboxCapture,
  onOpenDraft,
  onRefresh
}) {
  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
    []
  );

  const basePool = useMemo(
    () => buildMergedCataloguePool(products, drafts),
    [products, drafts]
  );

  // Local overrides allow instant inline editing of weight, dimensions, qty, or price before PDF export
  const [overrides, setOverrides] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [initializedSelection, setInitializedSelection] = useState(false);

  const [filterMode, setFilterMode] = useState('all_active'); // 'all_active' | 'in_stock' | 'lightbox_drafts' | 'selected'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [config, setConfig] = useState({
    title: 'DEEPAWALI 2026 · AVAILABLE STOCK & GIFTING EDIT',
    subtitle:
      '100% Solid Moradabad Brass · Verified Warehouse Stock, Exact Weight & Dimensions',
    asOfDate: todayFormatted,
    priceMode: 'show_price', // 'show_price' | 'show_bulk' | 'hide_price'
    includeBrandStory: true
  });

  const [busyMessage, setBusyMessage] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [lastPdfResult, setLastPdfResult] = useState(null);

  // Digital Detail Book Preview Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookSlideIndex, setBookSlideIndex] = useState(0);
  const [bookSlideDataUrl, setBookSlideDataUrl] = useState('');
  const [bookSlideLoading, setBookSlideLoading] = useState(false);

  // Google Flow / Promo Video Studio Modal
  const [flowModalItem, setFlowModalItem] = useState(null);
  const [flowSceneStyle, setFlowSceneStyle] = useState('festive_diwali');
  const [reelPreviewUrl, setReelPreviewUrl] = useState('');
  const [reelBlobInfo, setReelBlobInfo] = useState(null);

  // Merge basePool with any inline edits
  const items = useMemo(() => {
    return basePool.map((item) => {
      const ov = overrides[item.id];
      if (!ov) return item;
      const weightG = ov.weightG !== undefined ? Number(ov.weightG) || 0 : item.weightG;
      const length = ov.length !== undefined ? ov.length : item.length;
      const width = ov.width !== undefined ? ov.width : item.width;
      const height = ov.height !== undefined ? ov.height : item.height;
      const quantity = ov.quantity !== undefined ? Number(ov.quantity) || 0 : item.quantity;
      const mrp = ov.mrp !== undefined ? Number(ov.mrp) || 0 : item.mrp;
      const bulkPrice = ov.bulkPrice !== undefined ? Number(ov.bulkPrice) || 0 : item.bulkPrice;
      const name = ov.name !== undefined ? ov.name : item.name;
      const unit = ov.unit !== undefined ? ov.unit : item.unit;

      return {
        ...item,
        name,
        unit,
        weightG,
        weightSpec: describeWeightBadge(weightG),
        length,
        width,
        height,
        dimensionsSpec: formatDimensionsSpec({ length, width, height }),
        quantity,
        mrp,
        bulkPrice,
        hasUnsavedInlineEdit: true
      };
    });
  }, [basePool, overrides]);

  // Initialize default selection: prioritize lightbox drafts + in-stock products with photos
  useEffect(() => {
    if (!initializedSelection && items.length > 0) {
      const defaultSelected = items
        .filter((x) => x.imageUrl && (x.quantity > 0 || x.source !== 'inventory'))
        .map((x) => x.id);
      setSelectedIds(defaultSelected.length ? defaultSelected : items.slice(0, 12).map((x) => x.id));
      setInitializedSelection(true);
    }
  }, [items, initializedSelection]);

  const categories = useMemo(() => {
    const set = new Set(items.map((x) => x.category).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterMode === 'in_stock' && item.quantity <= 0) return false;
      if (filterMode === 'lightbox_drafts' && item.source === 'inventory') return false;
      if (filterMode === 'selected' && !selectedIds.includes(item.id)) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.name} ${item.sku} ${item.category} ${item.material} ${item.weightG}g`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterMode, categoryFilter, search, selectedIds]);

  const selectedItems = useMemo(() => {
    const map = new Map(items.map((x) => [x.id, x]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean);
  }, [items, selectedIds]);

  const totalUnitsSelected = useMemo(
    () => selectedItems.reduce((sum, x) => sum + (Number(x.quantity) || 0), 0),
    [selectedItems]
  );

  const totalWeightKgSelected = useMemo(
    () => (selectedItems.reduce((sum, x) => sum + (Number(x.weightG) || 0), 0) / 1000).toFixed(2),
    [selectedItems]
  );

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveSelected(id, direction) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, removed);
      return copy;
    });
  }

  function updateOverride(id, field, value) {
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  }

  async function saveInlineToDatabase(item) {
    const ov = overrides[item.id];
    if (!ov || !supabase) return;
    setBusyMessage(`Saving ${item.name} specs to Decorbeats database…`);
    setErrorNotice('');
    try {
      if (item.source === 'draft' || item.source === 'published_draft') {
        const rawDraft = drafts.find((d) => d.id === item.rawId);
        if (rawDraft) {
          const nextLocations = rawDraft.data?.locations?.length
            ? rawDraft.data.locations.map((loc, idx) =>
                idx === 0 && ov.quantity !== undefined
                  ? { ...loc, sellable: String(ov.quantity) }
                  : loc
              )
            : [{ name: 'Lightbox Stock', sellable: String(item.quantity), damaged: '0' }];

          const local = {
            ...rawDraft,
            data: {
              ...rawDraft.data,
              name: item.name,
              unit: item.unit,
              weight_g: item.weightG ? String(item.weightG) : '',
              height: item.height ? String(item.height) : '',
              width: item.width ? String(item.width) : '',
              length: item.length ? String(item.length) : '',
              mrp: item.mrp ? String(item.mrp) : '',
              b2b_price: item.bulkPrice ? String(item.bulkPrice) : '',
              locations: nextLocations
            }
          };
          await updateSharedDraft(supabase, rawDraft.id, (remote) =>
            mergeCaptureDraft(local, rawDraft, remote)
          );
        }
      } else if (item.productId) {
        const sizeStr = item.dimensionsSpec.hasDimensions
          ? `${item.length || 0} × ${item.width || 0} × ${item.height || 0} cm`
          : undefined;
        const weightStr = item.weightG ? `${item.weightG} g` : undefined;
        const updates = {
          name: item.name,
          quantity: item.quantity,
          ...(item.mrp ? { mrp: item.mrp, price: item.mrp } : {}),
          ...(sizeStr ? { size: sizeStr } : {}),
          ...(weightStr ? { weight: weightStr } : {})
        };
        const { error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', item.productId);
        if (error) throw error;
      }

      setOverrides((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setStatusNotice(`Saved updated measurements & stock for "${item.name}".`);
      if (onRefresh) await onRefresh(false);
    } catch (err) {
      setErrorNotice(err.message || 'Could not save to database.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleGenerateFullPdf(shareImmediately = false) {
    if (!selectedItems.length) {
      setErrorNotice('Please select at least one product below to build your Diwali catalogue.');
      return;
    }
    setErrorNotice('');
    setStatusNotice('');
    try {
      const result = await generateDiwaliCataloguePdf(
        selectedItems,
        config,
        (msg) => setBusyMessage(msg)
      );
      setLastPdfResult(result);
      if (shareImmediately) {
        const msg = await shareOrDownloadFile(
          result.blob,
          result.filename,
          config.title,
          `Decorbeats — ${config.title} (Available Stock as of ${config.asOfDate})`
        );
        setStatusNotice(`${msg} (${result.pageCount} pages · 9:16 Mobile Lookbook)`);
      } else {
        triggerDownload(result.blob, result.filename);
        setStatusNotice(
          `Downloaded ${result.filename} (${result.pageCount} pages · 9:16 Mobile Lookbook with clickable WhatsApp links!).`
        );
      }
    } catch (err) {
      setErrorNotice(err.message || 'Could not generate PDF.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleSingleProductSpecCard(item, format = 'jpg') {
    setErrorNotice('');
    setBusyMessage(`Rendering 9:16 Spec Card for ${item.name}…`);
    try {
      const card = await generateSingleProductCard(item, config);
      if (format === 'pdf') {
        const msg = await shareOrDownloadFile(
          card.pdfBlob,
          card.pdfFilename,
          item.name,
          card.shareText
        );
        setStatusNotice(msg);
      } else {
        const msg = await shareOrDownloadFile(
          card.imageBlob,
          card.imageFilename,
          item.name,
          card.shareText
        );
        setStatusNotice(msg);
      }
    } catch (err) {
      setErrorNotice(err.message || 'Could not generate product spec card.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleGeneratePromoReel(item) {
    setErrorNotice('');
    setFlowModalItem(item);
    setBusyMessage(`Recording 9:16 animated Promo Video Reel for ${item.name}…`);
    try {
      const reel = await generateProductPromoVideoReel(item, config, (msg) =>
        setBusyMessage(msg)
      );
      if (reelPreviewUrl) URL.revokeObjectURL(reelPreviewUrl);
      const url = URL.createObjectURL(reel.blob);
      setReelPreviewUrl(url);
      setReelBlobInfo(reel);
      setStatusNotice(`9:16 Promo Video Reel ready for "${item.name}"!`);
    } catch (err) {
      setErrorNotice(err.message || 'Could not record promo video.');
    } finally {
      setBusyMessage('');
    }
  }

  async function handleDownloadFlowFrame(item) {
    setErrorNotice('');
    setBusyMessage(`Preparing 1080×1920 (9:16) Google Flow Reference Frame for ${item.name}…`);
    try {
      const frame = await generateFlowReferenceFrame(item);
      triggerDownload(frame.blob, frame.filename);
      setStatusNotice(`Downloaded 9:16 Reference Frame: ${frame.filename}`);
    } catch (err) {
      setErrorNotice(err.message || 'Could not create reference frame.');
    } finally {
      setBusyMessage('');
    }
  }

  // Render interactive Digital Detail Book preview slide when bookModalOpen is true
  const totalBookSlides = selectedItems.length + (config.includeBrandStory ? 3 : 2);
  useEffect(() => {
    if (!bookModalOpen || !selectedItems.length) return;
    let active = true;
    setBookSlideLoading(true);

    async function renderPreviewSlide() {
      try {
        let slideRes;
        const hasStory = config.includeBrandStory !== false;
        if (bookSlideIndex === 0) {
          slideRes = await renderCoverSlideCanvas(selectedItems, config);
        } else if (hasStory && bookSlideIndex === 1) {
          slideRes = await renderBrandStorySlideCanvas(selectedItems, config);
        } else if (bookSlideIndex === totalBookSlides - 1) {
          slideRes = await renderBackCoverSlideCanvas(config);
        } else {
          const prodIdx = bookSlideIndex - (hasStory ? 2 : 1);
          const item = selectedItems[prodIdx] || selectedItems[0];
          slideRes = await renderProductSlideCanvas(
            item,
            prodIdx + 1,
            selectedItems.length,
            config
          );
        }
        if (active && slideRes?.canvas) {
          setBookSlideDataUrl(slideRes.canvas.toDataURL('image/jpeg', 0.9));
        }
      } catch (e) {
        console.warn('Preview slide render error:', e);
      } finally {
        if (active) setBookSlideLoading(false);
      }
    }

    renderPreviewSlide();
    return () => {
      active = false;
    };
  }, [bookModalOpen, bookSlideIndex, selectedItems, config, totalBookSlides]);

  const currentFlowPrompt = useMemo(
    () => (flowModalItem ? generateGoogleFlowPrompt(flowModalItem, flowSceneStyle) : null),
    [flowModalItem, flowSceneStyle]
  );

  return (
    <div className="cs-catalogue-studio">
      {/* Top Hero Banner */}
      <section className="cs-panel cs-cat-hero-panel">
        <div className="cs-cat-hero-top">
          <div>
            <span className="cs-ai-badge">🪔 DEEPAWALI 2026 · DIGITAL DETAIL BOOK & PDF LOOKBOOK STUDIO</span>
            <h2>Diwali Available Stock Catalogue & Video Flow Studio</h2>
            <p>
              Turn your lightbox photos, verified solid brass weights, dimensions (cm & inches), and warehouse stock counts into a luxury 9:16 mobile PDF lookbook, individual WhatsApp product cards, and promotional video reels.
            </p>
          </div>
          <div className="cs-cat-hero-stats">
            <div className="cs-cat-stat-box">
              <small>Selected Designs</small>
              <strong>{selectedItems.length}</strong>
              <span>1 per 9:16 page</span>
            </div>
            <div className="cs-cat-stat-box">
              <small>Ready Stock Units</small>
              <strong>{totalUnitsSelected}</strong>
              <span>as of {config.asOfDate}</span>
            </div>
            <div className="cs-cat-stat-box">
              <small>Combined Brass Weight</small>
              <strong>{totalWeightKgSelected} kg</strong>
              <span>solid Moradabad metal</span>
            </div>
          </div>
        </div>

        {/* Primary Export & Preview Actions */}
        <div className="cs-cat-primary-actions">
          <button
            type="button"
            className="cs-primary cs-btn-cat-pdf"
            disabled={!!busyMessage || !selectedItems.length}
            onClick={() => handleGenerateFullPdf(false)}
          >
            {busyMessage ? busyMessage : `📄 Download 9:16 Stock Catalogue PDF (${selectedItems.length + (config.includeBrandStory ? 3 : 2)} pages)`}
          </button>
          <button
            type="button"
            className="cs-btn-cat-share"
            disabled={!!busyMessage || !selectedItems.length}
            onClick={() => handleGenerateFullPdf(true)}
          >
            📲 Share PDF to WhatsApp / Phone
          </button>
          <button
            type="button"
            className="cs-btn-cat-preview"
            disabled={!!busyMessage || !selectedItems.length}
            onClick={() => {
              setBookSlideIndex(0);
              setBookModalOpen(true);
            }}
          >
            📖 Flip Through Digital Detail Book
          </button>
          <a
            href="/diwali-stock"
            className="cs-btn-cat-preview"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #25D366 0%, #1DA851 100%)',
              color: '#071F10',
              fontWeight: 800,
              border: 'none',
            }}
          >
            🚀 Open Conversion Hub, Reels & Mini-Packs
          </a>
          {onStartLightboxCapture && (
            <button
              type="button"
              className="cs-btn-cat-capture"
              onClick={onStartLightboxCapture}
            >
              📸 + Shoot Another Lightbox Product
            </button>
          )}
        </div>

        {statusNotice && (
          <div className="cs-cat-notice success" role="status">
            <span>✓ {statusNotice}</span>
            {lastPdfResult && (
              <button
                type="button"
                onClick={() => triggerDownload(lastPdfResult.blob, lastPdfResult.filename)}
              >
                Download PDF Again ↓
              </button>
            )}
          </div>
        )}
        {errorNotice && (
          <div className="cs-cat-notice error" role="alert">
            <span>⚠️ {errorNotice}</span>
            <button type="button" onClick={() => setErrorNotice('')}>
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Catalogue Settings Panel */}
      <section className="cs-panel cs-cat-config-panel">
        <div className="cs-section-heading">
          <div>
            <h3>1. Catalogue Cover, Stock Date & Pricing Mode</h3>
            <p>Customize how your brand story, stock date, and prices appear across all pages.</p>
          </div>
        </div>
        <div className="cs-cat-config-grid">
          <label className="cs-field">
            <span>Catalogue Title (Cover Heading)</span>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig((prev) => ({ ...prev, title: e.target.value }))}
            />
          </label>
          <label className="cs-field">
            <span>Available Stock As-Of Date</span>
            <input
              type="text"
              value={config.asOfDate}
              placeholder="e.g. 17 Oct 2026"
              onChange={(e) => setConfig((prev) => ({ ...prev, asOfDate: e.target.value }))}
            />
          </label>
          <label className="cs-field">
            <span>Pricing Display Mode (Configurable per Customer)</span>
            <select
              value={config.priceMode}
              onChange={(e) => setConfig((prev) => ({ ...prev, priceMode: e.target.value }))}
            >
              <option value="show_price">Show Selling Price (MRP ₹)</option>
              <option value="show_bulk">Show Both Retail MRP ₹ + Bulk Price (50+ pcs)</option>
              <option value="hide_price">Hide Prices — Show &quot;Enquire on WhatsApp for Quote&quot;</option>
            </select>
          </label>
          <label className="cs-field">
            <span>Cover Subtitle & Craft Tagline</span>
            <input
              type="text"
              value={config.subtitle}
              onChange={(e) => setConfig((prev) => ({ ...prev, subtitle: e.target.value }))}
            />
          </label>
        </div>
        <div className="cs-cat-config-toggles">
          <label className="cs-check">
            <input
              type="checkbox"
              checked={config.includeBrandStory}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, includeBrandStory: e.target.checked }))
              }
            />
            Include Page 2: &quot;Brass Never Lies — Why Solid Moradabad Weight Matters&quot; Brand Story Page
          </label>
          <span className="cs-cat-brand-summary">
            📍 Includes Bengaluru Experience Center (Kodichikkanahalli) · Moradabad Office · GST (KA, TN, MH) · {DECORBEATS_BRAND.phoneDisplay}
          </span>
        </div>
      </section>

      {/* Product Selector & Inline Lightbox Spec Editor */}
      <section className="cs-panel cs-cat-products-panel">
        <div className="cs-section-heading">
          <div>
            <h3>2. Select Products & Verify Weight, Dimensions & Stock ({selectedItems.length} selected)</h3>
            <p>
              Edit weight (g), dimensions (cm), available stock, or price inline below — changes reflect immediately in the PDF and promo videos!
            </p>
          </div>
          <div className="cs-cat-bulk-select">
            <button
              type="button"
              onClick={() => setSelectedIds(filteredItems.map((x) => x.id))}
            >
              Select All Visible ({filteredItems.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  items.filter((x) => x.quantity > 0 && x.imageUrl).map((x) => x.id)
                )
              }
            >
              Select All In-Stock with Photo
            </button>
            <button type="button" onClick={() => setSelectedIds([])}>
              Clear Selection
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="cs-cat-filter-bar">
          <div className="cs-cat-filter-pills">
            {[
              ['all_active', `All Products (${items.length})`],
              ['in_stock', `In Stock > 0 (${items.filter((x) => x.quantity > 0).length})`],
              [
                'lightbox_drafts',
                `Lightbox Captures (${items.filter((x) => x.source !== 'inventory').length})`
              ],
              ['selected', `Selected for PDF (${selectedIds.length})`]
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={filterMode === key ? 'active' : ''}
                onClick={() => setFilterMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="cs-cat-search-row">
            <input
              type="search"
              placeholder="Search by product name, SKU, weight, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="cs-cat-item-list">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const orderIndex = selectedIds.indexOf(item.id);

            return (
              <article
                key={item.id}
                className={`cs-cat-item-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="cs-cat-item-left">
                  <label className="cs-cat-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                    />
                    <span>
                      {isSelected ? `Page #${orderIndex + 1}` : 'Include'}
                    </span>
                  </label>
                  <div className="cs-cat-thumb-wrap">
                    <img
                      src={item.imageUrl || '/assets/images/product-fallback.svg'}
                      alt={item.name}
                      loading="lazy"
                    />
                    <span className={`cs-cat-source-pill ${item.source}`}>
                      {item.source === 'draft'
                        ? '📸 Lightbox Draft'
                        : item.source === 'published_draft'
                        ? '✓ Published Capture'
                        : '📦 Inventory'}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="cs-cat-order-btns">
                      <button
                        type="button"
                        title="Move earlier in catalogue"
                        disabled={orderIndex <= 0}
                        onClick={() => moveSelected(item.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Move later in catalogue"
                        disabled={orderIndex === selectedIds.length - 1}
                        onClick={() => moveSelected(item.id, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>

                <div className="cs-cat-item-Main">
                  <div className="cs-cat-item-header">
                    <div className="cs-cat-title-inputs">
                      <input
                        type="text"
                        className="cs-cat-name-input"
                        value={item.name}
                        onChange={(e) => updateOverride(item.id, 'name', e.target.value)}
                        placeholder="Product Name"
                      />
                      <small>
                        SKU: <strong>{item.sku}</strong> · {item.category} · {item.material}
                      </small>
                    </div>
                    <div className="cs-cat-live-badges">
                      <span className="cs-cat-weight-pill">
                        ⚖️ {item.weightG > 0 ? item.weightSpec.shortLabel : 'Add Weight (g)'} ·{' '}
                        <em>{item.weightSpec.tier}</em>
                      </span>
                      <span className="cs-cat-dim-pill">
                        📐 {item.dimensionsSpec.combinedSummary}
                      </span>
                    </div>
                  </div>

                  {/* Fast Inline Inputs for Weight, Dimensions, Stock & Price */}
                  <div className="cs-cat-inline-specs">
                    <label>
                      <span>⚖️ Weight (g)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="e.g. 754"
                        value={item.weightG || ''}
                        onChange={(e) => updateOverride(item.id, 'weightG', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>↕️ Height (cm)</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        placeholder="cm"
                        value={item.height || ''}
                        onChange={(e) => updateOverride(item.id, 'height', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>↔️ Width (cm)</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        placeholder="cm"
                        value={item.width || ''}
                        onChange={(e) => updateOverride(item.id, 'width', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>📏 Depth (cm)</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        placeholder="cm"
                        value={item.length || ''}
                        onChange={(e) => updateOverride(item.id, 'length', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>📦 Stock Qty</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="Units"
                        value={item.quantity ?? ''}
                        onChange={(e) => updateOverride(item.id, 'quantity', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>💰 Price (₹)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="MRP ₹"
                        value={item.mrp || ''}
                        onChange={(e) => updateOverride(item.id, 'mrp', e.target.value)}
                      />
                    </label>
                    <label>
                      <span>🎁 Unit / Set</span>
                      <input
                        type="text"
                        placeholder="e.g. Set of 2"
                        value={item.unit || ''}
                        onChange={(e) => updateOverride(item.id, 'unit', e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Per-Product Individual Digital Detail Book & Video Flow Actions */}
                  <div className="cs-cat-item-actions">
                    <button
                      type="button"
                      className="cs-btn-mini-card"
                      onClick={() => handleSingleProductSpecCard(item, 'jpg')}
                    >
                      🃏 9:16 Spec Card (JPG)
                    </button>
                    <button
                      type="button"
                      className="cs-btn-mini-card"
                      onClick={() => handleSingleProductSpecCard(item, 'pdf')}
                    >
                      📄 1-Page Product PDF
                    </button>
                    <button
                      type="button"
                      className="cs-btn-mini-video"
                      onClick={() => {
                        setReelPreviewUrl('');
                        setReelBlobInfo(null);
                        setFlowModalItem(item);
                      }}
                    >
                      🎬 Promo Video & Google Flow Studio
                    </button>
                    <a
                      className="cs-btn-mini-wa"
                      href={buildProductWhatsAppUrl(item, config)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📲 WhatsApp Link
                    </a>
                    {item.hasUnsavedInlineEdit && (
                      <button
                        type="button"
                        className="cs-primary cs-btn-mini-save"
                        onClick={() => saveInlineToDatabase(item)}
                      >
                        💾 Save Specs to DB
                      </button>
                    )}
                    {item.source !== 'inventory' && onOpenDraft && (
                      <button
                        type="button"
                        className="cs-btn-mini-open"
                        onClick={() => {
                          const found = drafts.find((d) => d.id === item.rawId);
                          if (found) onOpenDraft(found);
                        }}
                      >
                        Open Full Capture →
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!filteredItems.length && (
            <p className="cs-empty">
              No products match this filter. Try switching to &quot;All Products&quot; or shoot a new product at the lightbox!
            </p>
          )}
        </div>
      </section>

      {/* Interactive Digital Detail Book Flipbook Modal */}
      {bookModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setBookModalOpen(false)}>
          <section
            className="cs-modal cs-detail-book-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Digital Detail Book Preview"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-dim-modal-header">
              <div>
                <h2>📖 Interactive 9:16 Digital Detail Book</h2>
                <small>
                  Page {bookSlideIndex + 1} of {totalBookSlides} · 1080 × 1920 Mobile Portrait
                </small>
              </div>
              <button
                type="button"
                className="cs-btn-close-modal"
                onClick={() => setBookModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="cs-book-viewer-body">
              <button
                type="button"
                className="cs-book-nav-btn"
                disabled={bookSlideIndex <= 0}
                onClick={() => setBookSlideIndex((i) => Math.max(0, i - 1))}
              >
                ‹ Prev
              </button>
              <div className="cs-book-canvas-frame">
                {bookSlideLoading ? (
                  <div className="cs-book-loading">Rendering 9:16 Page…</div>
                ) : (
                  bookSlideDataUrl && (
                    <img src={bookSlideDataUrl} alt={`Catalogue page ${bookSlideIndex + 1}`} />
                  )
                )}
              </div>
              <button
                type="button"
                className="cs-book-nav-btn"
                disabled={bookSlideIndex >= totalBookSlides - 1}
                onClick={() =>
                  setBookSlideIndex((i) => Math.min(totalBookSlides - 1, i + 1))
                }
              >
                Next ›
              </button>
            </div>

            <div className="cs-book-viewer-footer">
              <button
                type="button"
                className="cs-primary"
                onClick={() => handleGenerateFullPdf(false)}
              >
                📄 Download Full Catalogue PDF ({totalBookSlides} pages)
              </button>
              <button
                type="button"
                onClick={() => handleGenerateFullPdf(true)}
              >
                📲 Share PDF on WhatsApp
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Individual Product Promo Video & Google Flow Studio Modal */}
      {flowModalItem && currentFlowPrompt && (
        <div className="cs-modal-backdrop" onClick={() => setFlowModalItem(null)}>
          <section
            className="cs-modal cs-flow-studio-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Product Video & Google Flow Studio"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-dim-modal-header">
              <div>
                <span className="cs-ai-badge">🎬 9:16 VIDEO & GOOGLE FLOW STUDIO</span>
                <h2>{flowModalItem.name}</h2>
                <small>
                  ⚖️ {flowModalItem.weightSpec.shortLabel} · 📐 {flowModalItem.dimensionsSpec.combinedSummary} · 📦 {flowModalItem.quantity} in stock
                </small>
              </div>
              <button
                type="button"
                className="cs-btn-close-modal"
                onClick={() => setFlowModalItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="cs-flow-modal-columns">
              {/* Column 1: Instant 9:16 Animated Promo Video Reel */}
              <div className="cs-flow-col">
                <h3>1. Instant 9:16 Promo Video Reel (WhatsApp / Status / Reels)</h3>
                <p>
                  Generates a 6-second vertical video with golden festive bokeh, smooth product zoom, animated Solid Brass Weight counter, Dimensions, and Available Stock badge.
                </p>
                {reelPreviewUrl ? (
                  <div className="cs-reel-preview-box">
                    <video
                      src={reelPreviewUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      style={{ width: '100%', maxHeight: 380, borderRadius: 12, background: '#14110F' }}
                    />
                    <div className="cs-row-actions" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="cs-primary"
                        onClick={() =>
                          reelBlobInfo &&
                          shareOrDownloadFile(
                            reelBlobInfo.blob,
                            reelBlobInfo.filename,
                            flowModalItem.name,
                            buildProductShareText(flowModalItem, config)
                          )
                        }
                      >
                        📲 Download / Share Video Reel ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGeneratePromoReel(flowModalItem)}
                      >
                        ↻ Re-record
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="cs-primary cs-wide"
                    disabled={!!busyMessage}
                    onClick={() => handleGeneratePromoReel(flowModalItem)}
                  >
                    {busyMessage ? busyMessage : '🎬 Generate 9:16 Animated Promo Video Reel'}
                  </button>
                )}

                <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e2d8c5' }} />

                <h3>2. Individual Product WhatsApp Pitch & Spec Sheet</h3>
                <div className="cs-row-actions">
                  <button
                    type="button"
                    onClick={() => handleSingleProductSpecCard(flowModalItem, 'jpg')}
                  >
                    🃏 Download 9:16 Spec Card (.jpg)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleProductSpecCard(flowModalItem, 'pdf')}
                  >
                    📄 Download 1-Page Detail PDF
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const txt = buildProductShareText(flowModalItem, config);
                      await navigator.clipboard.writeText(txt);
                      setStatusNotice('Copied formatted WhatsApp product pitch to clipboard!');
                    }}
                  >
                    📋 Copy WhatsApp Caption
                  </button>
                </div>
              </div>

              {/* Column 2: Google Flow (Veo) 10-Second Cinematic Video Pack */}
              <div className="cs-flow-col">
                <h3>3. Google Flow (Veo) 9:16 Cinematic AI Video Pack</h3>
                <p>
                  Download the clean 1080×1920 reference frame of this exact product and paste the tailored 10-second prompt into Google Flow.
                </p>
                <div className="cs-flow-scene-picker">
                  { [
                    ['festive_diwali', '🪔 Festive Diwali Diyas'],
                    ['pooja_mandir', '🙏 Sacred Pooja Mandir'],
                    ['luxury_pedestal', '🏛️ Dark Marble Pedestal']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={flowSceneStyle === key ? 'active' : ''}
                      onClick={() => setFlowSceneStyle(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="cs-field" style={{ marginTop: 10 }}>
                  <span>Google Flow 10s Prompt (9:16 Vertical)</span>
                  <textarea
                    rows="6"
                    readOnly
                    value={currentFlowPrompt.prompt}
                  />
                </label>

                <div className="cs-row-actions" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="cs-primary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(currentFlowPrompt.prompt);
                      setStatusNotice('Copied Google Flow 9:16 prompt to clipboard!');
                    }}
                  >
                    📋 Copy Flow Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFlowFrame(flowModalItem)}
                  >
                    🖼️ Download 9:16 Reference Frame (.jpg)
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
