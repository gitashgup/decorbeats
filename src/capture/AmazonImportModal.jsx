import React, { useState, useEffect } from 'react';
import { fetchAmazonListing, fetchImageAsFile } from './amazonImporter';

export default function AmazonImportModal({
  isOpen,
  onClose,
  initialUrlOrAsin = '',
  draft = null,
  onApplyToDraft,
  onUpdateCatalog,
  uploadPhoto,
  busy = false,
  setMessage
}) {
  const [urlOrAsin, setUrlOrAsin] = useState(initialUrlOrAsin || 'https://www.amazon.in/dp/B09HXVLC76');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amazonData, setAmazonData] = useState(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (isOpen && initialUrlOrAsin) {
      setUrlOrAsin(initialUrlOrAsin);
    }
  }, [isOpen, initialUrlOrAsin]);

  if (!isOpen) return null;

  async function handleFetch() {
    if (!urlOrAsin.trim()) {
      setError('Enter an Amazon product URL or ASIN.');
      return;
    }
    setLoading(true);
    setError('');
    setAmazonData(null);
    setSelectedImgIndex(0);
    try {
      const res = await fetchAmazonListing(urlOrAsin.trim());
      setAmazonData(res);
      setMessage?.(`Fetched "${res.product?.title || 'product'}" from Amazon!`);
    } catch (err) {
      setError(err.message || 'Failed to fetch from Amazon.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyToDraft() {
    if (!amazonData?.product || !onApplyToDraft) return;
    setUploading(true);
    setUploadProgress('Preparing to import images into Supabase storage…');
    setError('');

    try {
      const p = amazonData.product;
      const uploadedPhotos = {};

      if (uploadPhoto && p.images?.length && draft?.id) {
        const requiredSlots = ['hero', 'front', 'back', 'detail'];
        const maxPhotos = 12;
        const list = p.images.slice(0, maxPhotos);

        for (let i = 0; i < list.length; i++) {
          const imgUrl = list[i];
          const isRequired = i < requiredSlots.length;
          const slot = isRequired ? requiredSlots[i] : `edited_${crypto.randomUUID()}`;
          setUploadProgress(`Downloading & uploading photo ${i + 1} of ${list.length}…`);

          try {
            const file = await fetchImageAsFile(imgUrl, `amazon-${slot}.jpg`);
            const uploaded = await uploadPhoto(draft.id, slot, file, msg => setUploadProgress(`[Photo ${i + 1}/${list.length}] ${msg}`));
            uploadedPhotos[slot] = {
              ...uploaded,
              filename: isRequired ? `${slot.toUpperCase()} View` : `Amazon Product Image ${i + 1}`
            };
          } catch (imgErr) {
            console.warn(`Could not upload photo ${i + 1}:`, imgErr);
          }
        }
      }

      await onApplyToDraft(amazonData, uploadedPhotos);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply Amazon details to draft.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }

  async function handleUpdateCatalog() {
    if (!amazonData?.product || !onUpdateCatalog) return;
    setUploading(true);
    setError('');
    try {
      await onUpdateCatalog(amazonData.matchingProduct, amazonData.product);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update live catalog listing.');
    } finally {
      setUploading(false);
    }
  }

  const p = amazonData?.product;
  const match = amazonData?.matchingProduct;
  const currentImg = p?.images?.[selectedImgIndex] || p?.images?.[0];

  return (
    <div className="cs-modal-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cs-amazon-title"
        className="cs-modal cs-amazon-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="cs-amazon-modal-header">
          <div>
            <h2 id="cs-amazon-title">🛒 Import from Amazon & Sync Catalog</h2>
            <p>Fetch complete details, measurements, bullets, and high-resolution images from Amazon.in.</p>
          </div>
          <button type="button" className="cs-btn-close-modal" onClick={onClose} disabled={uploading}>
            ✕
          </button>
        </div>

        <div className="cs-amazon-input-row">
          <input
            type="text"
            placeholder="Paste Amazon link or ASIN (e.g. https://www.amazon.in/dp/B09HXVLC76)"
            value={urlOrAsin}
            onChange={e => setUrlOrAsin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            disabled={loading || uploading}
          />
          <button
            type="button"
            className="cs-primary"
            onClick={handleFetch}
            disabled={loading || uploading || !urlOrAsin.trim()}
          >
            {loading ? 'Fetching…' : 'Fetch from Amazon →'}
          </button>
        </div>

        {error && <div className="cs-alert" role="alert">{error}</div>}

        {uploadProgress && (
          <div className="cs-notice" role="status">
            ⏳ {uploadProgress}
          </div>
        )}

        {p && (
          <div className="cs-amazon-preview-card">
            <div className="cs-amazon-preview-grid">
              <div className="cs-amazon-gallery-preview">
                {currentImg ? (
                  <img src={currentImg} alt={p.title} className="cs-amazon-main-thumb" />
                ) : (
                  <div className="cs-amazon-main-thumb">No photo</div>
                )}
                {p.images?.length > 1 && (
                  <div className="cs-amazon-thumb-strip">
                    {p.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className={selectedImgIndex === i ? 'active' : ''}
                        onClick={() => setSelectedImgIndex(i)}
                      />
                    ))}
                  </div>
                )}
                <small style={{ color: '#64748b' }}>{p.images?.length || 0} high-res images found</small>
              </div>

              <div className="cs-amazon-info-col">
                <h3>{p.title}</h3>
                <div className="cs-amazon-price-pill-row">
                  {p.price && <span className="cs-amazon-price">₹{Number(p.price).toLocaleString('en-IN')}</span>}
                  {p.mrp && <span className="cs-amazon-mrp">MRP ₹{Number(p.mrp).toLocaleString('en-IN')}</span>}
                  {p.cost_price && <span className="cs-amazon-cost">Cost: ₹{Number(p.cost_price).toLocaleString('en-IN')}</span>}
                </div>

                <div className="cs-amazon-specs-tags">
                  {p.dimensions?.length && (
                    <span>📐 {p.dimensions.length} × {p.dimensions.width} × {p.dimensions.height} cm</span>
                  )}
                  {p.weight_g && <span>⚖️ {p.weight_g} g ({Number(p.weight_g) / 1000} kg)</span>}
                  {p.material && <span>✨ {p.material}</span>}
                  {p.category && <span>🏷️ {p.category}</span>}
                  {p.asin && <span>ASIN: {p.asin}</span>}
                </div>

                {p.bullets?.length > 0 && (
                  <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: 13, color: '#334155' }}>
                    {p.bullets.slice(0, 3).map((b, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {match && (
              <div className="cs-amazon-matched-banner">
                <div>
                  <strong>✓ Matched to Existing Catalog Product: {match.sku} ({match.name})</strong>
                  <span>Current Stock: {match.quantity ?? 0} sellable units · Current MRP: ₹{match.mrp || '—'}</span>
                </div>
                <span className="cs-verified-badge">Catalog Linked</span>
              </div>
            )}
          </div>
        )}

        {p && (
          <div className="cs-amazon-actions">
            <button type="button" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            {match && onUpdateCatalog && (
              <button
                type="button"
                className="cs-btn-amazon-import"
                onClick={handleUpdateCatalog}
                disabled={uploading || busy}
                title="Directly updates the live product in Supabase catalog with title, measurements, weight, and images"
              >
                {uploading ? 'Updating…' : `⚡ Update Live Website Listing (${match.sku})`}
              </button>
            )}
            {onApplyToDraft && (
              <button
                type="button"
                className="cs-primary"
                onClick={handleApplyToDraft}
                disabled={uploading || busy}
              >
                {uploading ? 'Importing Photos & Details…' : draft ? '📥 Apply to This Draft & Upload Photos' : '📥 Start New Draft with Amazon Details'}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
