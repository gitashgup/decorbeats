import React, { useEffect, useRef, useState } from 'react';
import { activeCatalogue, exportErrors, formatDetails, formatPrice, MAX_PRODUCTS, MAX_CATALOGUE_PRODUCTS, moveProduct, newCatalogue, newProduct, newWorkspace, productErrors, selectedProducts, toggleProduct } from './model';
import { loadWorkspace, saveWorkspace, storageMessage } from './storage';
import { prepareCataloguePhoto } from './photos';
import { downloadCatalogue, shareCatalogue } from './share';
import { createPdfTask } from './pdfTask';
import { waitForTask } from './tasks';
import './catalogue.css';
import './navigation.css';
import BatchIntake from './BatchIntake';
import SourceReviewInbox, { SourceReviewCheck } from './SourceReview';
import ReviewPackImport from './ReviewPackImport';

function Photo({ photo, alt = '', ...props }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!photo?.blob) { setUrl(''); return; }
    const next = URL.createObjectURL(photo.blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo?.blob]);
  return url ? <img src={url} alt={alt} {...props} /> : null;
}
function NumberField({ label, value, onChange, error, id, disabled = false }) {
  return <label className="dc-field"><span>{label}</span><input disabled={disabled} id={id} type="text" inputMode="decimal" autoComplete="off" value={value || ''} onChange={e => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />{error && <small id={`${id}-error`} className="dc-field-error">{error}</small>}</label>;
}

export default function CatalogueStudio({ ownerId, reviewOnly = false, reviewSource = null }) {
  const localReview = import.meta.env.DEV && reviewOnly;
  const [deviceReviewSource, setDeviceReviewSource] = useState(null), [reviewPackBusy, setReviewPackBusy] = useState(false);
  const effectiveReviewSource = deviceReviewSource || reviewSource;
  const [state, setState] = useState(null), [status, setStatus] = useState('loading'), [error, setError] = useState(''), [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState(''), [working, setWorking] = useState(false), [photoBusy, setPhotoBusy] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false), [sourceOpen, setSourceOpen] = useState(false);
  const touchStart = useRef(null);
  const [showLibrary, setShowLibrary] = useState(false), [showCatalogues, setShowCatalogues] = useState(false);
  const [taskMessage, setTaskMessage] = useState('');
  const task = useRef(null), photoTask = useRef(null);
  const [preview, setPreview] = useState(null), [previewIndex, setPreviewIndex] = useState(0);
  const latest = useRef(null), revision = useRef(0), version = useRef(0), savedVersion = useRef(-1), chain = useRef(Promise.resolve(true)), blocked = useRef(false), mounted = useRef(true), actionLock = useRef(false), uploadToken = useRef(0), photoPending = useRef(false);
  const input = useRef(null), camera = useRef(null), nameInput = useRef(null);
  const owner = `${localReview ? 'review' : 'admin'}:${ownerId}`;

  useEffect(() => {
    mounted.current = true; let cancelled = false;
    loadWorkspace(owner).then(saved => {
      if (cancelled) return;
      if (saved && saved.schema !== 1) throw new Error('Unsupported saved workspace');
      const initial = saved || newWorkspace();
      revision.current = initial.revision; version.current = 0; savedVersion.current = saved ? 0 : -1;
      latest.current = initial; setState(initial); setStatus(saved ? 'saved' : 'ready');
    }).catch(e => { if (!cancelled) { blocked.current = true; setError(storageMessage(e)); setStatus('error'); } });
    return () => { cancelled = true; mounted.current = false; uploadToken.current++; task.current?.abort(); photoTask.current?.abort(); };
  }, [owner]);

  function update(change) {
    if (blocked.current) return;
    const next = typeof change === 'function' ? change(latest.current) : change;
    if (next === latest.current) return;
    latest.current = next; version.current++; setState(next); setStatus('saving'); setNotice('');
  }
  function commit() {
    const snapshot = latest.current, requestedVersion = version.current;
    if (!snapshot || blocked.current) return Promise.resolve(false);
    const task = chain.current.catch(() => false).then(async () => {
      if (savedVersion.current >= requestedVersion) return true;
      try {
        const saved = await saveWorkspace(owner, snapshot, revision.current);
        revision.current = saved.revision; savedVersion.current = requestedVersion;
        if (mounted.current && version.current === requestedVersion) { setStatus('saved'); setSaveError(''); }
        return true;
      } catch (e) {
        if (e.name === 'SaveConflictError') blocked.current = true;
        if (mounted.current) { setStatus(e.name === 'StorageTimeoutError' ? 'unconfirmed' : 'error'); setSaveError(storageMessage(e)); }
        return false;
      }
    });
    chain.current = task; return task;
  }
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(commit, 250);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => {
    function warn(e) { if (version.current > savedVersion.current || photoPending.current) { e.preventDefault(); e.returnValue = ''; } }
    function flush() { if (document.visibilityState === 'hidden') commit(); }
    window.addEventListener('beforeunload', warn); document.addEventListener('visibilitychange', flush);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('visibilitychange', flush); };
  }, [owner]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);

  function editField(key, value) {
    if (blocked.current) return;
    update(current => {
      let product = current.products.find(p => p.id === current.editingId);
      if (!product) {
        if (current.products.length >= MAX_PRODUCTS) { setError(`This device workspace holds up to ${MAX_PRODUCTS} products.`); return current; }
        product = newProduct();
        const catalogue = activeCatalogue(current);
        current = { ...current, editingId: product.id, products: [...current.products, product], catalogues: current.catalogues.map(c => c.id !== catalogue.id ? c : { ...c, productIds: c.productIds.length < MAX_CATALOGUE_PRODUCTS ? [...c.productIds, product.id] : c.productIds }) };
      }
      return { ...current, products: current.products.map(p => p.id === product.id ? { ...p, [key]: value, ...(p.sourceReview && key !== 'sourceReview' ? { sourceReview: { ...p.sourceReview, status: 'pending' } } : {}), ...(key === 'photo' && value ? { photos: p.photos?.length ? p.photos.map(photo => photo.assetId === p.photo?.assetId ? value : photo) : [value] } : {}) } : p) };
    });
  }
  function goToProduct(direction) {
    if (actionLock.current || photoBusy || blocked.current) return;
    const products = selectedProducts(latest.current), index = products.findIndex(p => p.id === latest.current.editingId), next = products[index + direction];
    if (!next) return;
    commit(); update(s => ({ ...s, editingId: next.id }));
  }
  function startSwipe(event) {
    if (event.target.closest('input,select,textarea,button,label,a')) { touchStart.current = null; return; }
    const point = event.touches[0]; touchStart.current = point ? { x: point.clientX, y: point.clientY } : null;
  }
  function finishSwipe(event) {
    const start = touchStart.current, point = event.changedTouches[0]; touchStart.current = null;
    if (!start || !point) return;
    const dx = point.clientX - start.x, dy = point.clientY - start.y;
    if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy) * 1.6) goToProduct(dx < 0 ? 1 : -1);
  }
  function chooseCover(photo) {
    update(s => ({ ...s, products: s.products.map(p => p.id === s.editingId ? { ...p, photo, ...(p.sourceReview ? { sourceReview: { ...p.sourceReview, status: 'pending' } } : {}) } : p) }));
  }
  async function importBatch(products, { unfinishedCount = 0 } = {}) {
    if (blocked.current) { setError('Reload the latest saved workspace before adding photos.'); return false; }
    const current = latest.current, existing = new Set(current.products.map(p => p.id));
    const added = products.filter(p => !existing.has(p.id));
    if (current.products.length + added.length > MAX_PRODUCTS || selectedProducts(current).length + added.length > MAX_CATALOGUE_PRODUCTS) { setError('There is not enough room in this catalogue. Use a smaller batch or start a new catalogue.'); return false; }
    update(s => ({ ...s, products: [...s.products, ...added], editingId: products[0]?.id || s.editingId, catalogues: s.catalogues.map(c => c.id !== s.activeCatalogueId ? c : { ...c, productIds: [...new Set([...c.productIds, ...products.map(p => p.id)])] }) }));
    commit(); setBatchOpen(false); setNotice(`${added.length} products added. Swipe or use Next to fill in each card. Saving on this device…${unfinishedCount ? ` ${unfinishedCount} unfinished photos remain in Add photos together to retry.` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' }); return true;
  }
  async function importSourceDraft(product) {
    if (blocked.current || actionLock.current || photoBusy) throw new Error('Finish the current action or reload the saved workspace before importing.');
    const current = latest.current, existing = current.products.find(p => p.id === product.id);
    const catalogue = activeCatalogue(current), alreadySelected = catalogue.productIds.includes(product.id);
    if ((!existing && current.products.length >= MAX_PRODUCTS) || (!alreadySelected && catalogue.productIds.length >= MAX_CATALOGUE_PRODUCTS)) throw new Error('This catalogue or device library is full. Start another catalogue or choose fewer products.');
    update(s => ({ ...s, products: existing ? s.products : [...s.products, product], editingId: product.id, catalogues: s.catalogues.map(c => c.id !== s.activeCatalogueId ? c : { ...c, productIds: [...new Set([...c.productIds, product.id])] }) }));
    commit(); setSourceOpen(false); setNotice(existing ? 'Opened your existing draft. Your edits are unchanged.' : 'Review draft added. Check its photo, name and details, then confirm it before exporting.');
    window.scrollTo({ top: 0, behavior: 'smooth' }); return true;
  }
  function confirmSourceReview(confirmed) {
    const product = latest.current.products.find(p => p.id === latest.current.editingId);
    if (!product?.sourceReview) return;
    if (confirmed && (!product.photo?.blob || !product.name.trim() || Object.keys(productErrors(product)).length)) { setError('Check the photo, name and any entered numbers before confirming this product.'); return; }
    editField('sourceReview', { ...product.sourceReview, status: confirmed ? 'confirmed' : 'pending' });
  }
  function beginTask(message) {
    const controller = new AbortController(); task.current = controller;
    actionLock.current = true; setWorking(true); setTaskMessage(message); setError('');
    return controller;
  }
  function finishTask(controller) {
    if (task.current !== controller) return;
    task.current = null; actionLock.current = false;
    if (mounted.current) { setWorking(false); setTaskMessage(''); }
  }
  function cancelPending() { task.current?.abort(); photoTask.current?.abort(); }
  async function addPhoto(file) {
    if (!file || photoBusy || actionLock.current || blocked.current) return;
    const controller = new AbortController(); photoTask.current = controller;
    photoPending.current = true; uploadToken.current++; const token = uploadToken.current; setPhotoBusy(true); setError('');
    try {
      const photo = await prepareCataloguePhoto(file, { signal: controller.signal });
      if (mounted.current && token === uploadToken.current && !controller.signal.aborted) editField('photo', photo);
    } catch (e) { if (mounted.current) { if (e.name === 'AbortError') setNotice('Photo selection cancelled. Your previous photo is unchanged.'); else setError(e.message); } }
    finally { if (photoTask.current === controller) { photoTask.current = null; photoPending.current = false; uploadToken.current++; if (mounted.current) setPhotoBusy(false); } }
  }
  async function saveAndAnother() {
    if (actionLock.current || photoBusy || !latest.current.editingId) return;
    const controller = beginTask('Saving your product on this device…');
    try {
      if (!await waitForTask(commit(), { signal: controller.signal, timeoutMs: 25000, message: 'Saving took too long. Your product is still here. Retry saving, or preview and download the PDF.' })) return;
      controller.signal.throwIfAborted();
      const ordered = selectedProducts(latest.current), index = ordered.findIndex(p => p.id === latest.current.editingId), nextId = ordered[index + 1]?.id || null;
      update(current => ({ ...current, editingId: nextId }));
      if (await waitForTask(commit(), { signal: controller.signal, timeoutMs: 25000 })) { setNotice(nextId ? 'Product saved. The next product is ready to edit.' : 'Product saved. Add another whenever you’re ready.'); nameInput.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    } catch (e) { if (e.name === 'AbortError') setNotice('Cancelled. Your products are still here.'); else setError(e.message); }
    finally { finishTask(controller); }
  }
  async function openPreview() {
    if (actionLock.current || photoBusy) return;
    const problems = exportErrors(latest.current);
    if (problems.length) { setError(`Before exporting: ${problems.slice(0, 4).join('. ')}${problems.length > 4 ? `. Plus ${problems.length - 4} more fields to check.` : '.'}`); setShowLibrary(true); return; }
    const snapshot = latest.current, catalogue = activeCatalogue(snapshot), products = selectedProducts(snapshot);
    const controller = beginTask('Loading the PDF tools…');
    // Export the visible snapshot even if the device save is slow or unavailable.
    // Autosave continues independently; its status/error stays visible.
    commit();
    try {
      const result = await createPdfTask({ title: catalogue.title || 'The Decorbeats edit', products }, {
        signal: controller.signal,
        onProgress: ({ completed, total }) => { if (task.current === controller && mounted.current) setTaskMessage(completed ? `Preparing PDF · ${completed} of ${total} pages` : 'Laying out your catalogue…'); }
      });
      if (!mounted.current || controller.signal.aborted) return;
      setPreview({ ...result, url: URL.createObjectURL(result.blob), products, title: catalogue.title || 'The Decorbeats edit', file: new File([result.blob], result.filename, { type: 'application/pdf' }) });
      setPreviewIndex(0); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { if (e.name === 'AbortError') setNotice('PDF preparation cancelled. Your products are still here.'); else setError(`Could not prepare the PDF. ${e.message || 'Please retry.'}`); }
    finally { finishTask(controller); }
  }
  async function nativeShare() {
    // File is ready before this tap, preserving Safari's user activation.
    const result = await shareCatalogue(preview.file);
    setNotice(result === 'shared' ? 'Shared using your device.' : result === 'cancelled' ? 'Sharing cancelled. Your PDF is still ready.' : 'File sharing isn’t available here. Tap Download PDF, then share the saved file from Files or your downloads.');
  }
  async function createCatalogue() {
    if (actionLock.current || photoBusy) return;
    const controller = beginTask('Saving your current catalogue…');
    try {
      if (!await waitForTask(commit(), { signal: controller.signal, timeoutMs: 25000 })) return;
      if (latest.current.catalogues.length >= 50) { setError('This device workspace holds up to 50 catalogue drafts.'); return; }
      const catalogue = newCatalogue();
      update(current => ({ ...current, catalogues: [...current.catalogues, catalogue], activeCatalogueId: catalogue.id, editingId: null }));
      setShowCatalogues(false); setShowLibrary(true); setNotice('New catalogue. Add a product or choose from saved products below.');
    } catch (e) { if (e.name === 'AbortError') setNotice('Cancelled. Your products are still here.'); else setError(e.message); } finally { finishTask(controller); }
  }

  if (!state) return <section className="dc"><p role={error ? 'alert' : 'status'}>{error || 'Opening your saved catalogues…'}</p>{error && <button onClick={() => window.location.reload()}>Retry opening workspace</button>}</section>;
  const catalogue = activeCatalogue(state), product = state.products.find(p => p.id === state.editingId), selected = selectedProducts(state), issues = product ? productErrors(product) : {};
  const busy = working || photoBusy || blocked.current;
  const editingIndex = selected.findIndex(p => p.id === product?.id);
  const views = product?.photos?.length ? product.photos : product?.photo ? [product.photo] : [];
  const statusText = status === 'saved' ? 'Saved on this device' : status === 'saving' ? 'Saving on this device…' : status === 'error' ? 'Changes not saved' : status === 'unconfirmed' ? 'Save not confirmed' : 'Ready to start';
  const previewProduct = preview?.products[previewIndex];
  return <section className="dc" aria-label="Create catalogue">
    <div className="dc-topline"><span className="dc-kicker">CAPTURE STUDIO / CATALOGUES</span><span className={`dc-save ${status}`} role="status"><i />{statusText}</span></div>
    {localReview && <p className="dc-review-banner">LOCAL REVIEW · This version saves only in this browser on this device</p>}
    {(error || saveError) && <div className="dc-alert" role="alert"><span>{[error, saveError].filter(Boolean).join(' ')}</span>{saveError && !blocked.current && <button onClick={commit}>Retry saving</button>}{blocked.current && <button onClick={() => window.location.reload()}>Reload saved version</button>}<button aria-label="Dismiss error" onClick={() => { setError(''); setSaveError(''); }}>×</button></div>}
    {notice && <p className="dc-notice" role="status">{notice}</p>}
    {(working || photoBusy) && <div className="dc-progress" role="status"><span>{photoBusy ? 'Preparing your photo…' : taskMessage}<small>You can cancel without losing your products.</small></span><button type="button" onClick={cancelPending}>Cancel</button></div>}
    <BatchIntake hidden={!batchOpen} onClose={() => setBatchOpen(false)} onImport={importBatch} maxProducts={Math.min(MAX_PRODUCTS - state.products.length, MAX_CATALOGUE_PRODUCTS - selected.length)} />
    <ReviewPackImport owner={owner} onSource={setDeviceReviewSource} onBusy={setReviewPackBusy} hidden={batchOpen || sourceOpen || !!preview} disabled={busy}/>
    {sourceOpen && effectiveReviewSource && <SourceReviewInbox source={effectiveReviewSource} products={state.products} disabled={busy} onImport={importSourceDraft} onClose={() => setSourceOpen(false)}/>}
    {!batchOpen && !sourceOpen && (preview ? <>
      <div className="dc-heading"><div><p className="dc-kicker">READY TO SHARE</p><h1>Your catalogue is ready</h1><p>{preview.products.length} products · {preview.pageCount} pages</p></div><button className="dc-text-button" onClick={() => { setPreview(null); setNotice(''); }}>← Back to editing</button></div>
      <div className="dc-preview-actions"><button className="dc-primary" onClick={() => { downloadCatalogue(preview.blob, preview.filename); setNotice('PDF download started. On iPhone, look in Safari downloads or choose Save to Files.'); }}>↓ Download PDF</button><button className="dc-secondary" onClick={nativeShare}>Share PDF ↗</button></div>
      <p className="dc-muted dc-center">The PDF contains only the photos and details you entered. <a href={preview.url} target="_blank" rel="noreferrer">Open full PDF ↗</a></p>
      <article className="dc-preview-sheet"><div className="dc-sheet-brand"><div><img src="/assets/brand/decorbeats-logo.svg" alt=""/><strong>Decorbeats</strong></div><span>{preview.title}</span></div><Photo photo={previewProduct.photo} alt={previewProduct.name}/><div className="dc-preview-copy"><p className="dc-kicker">{String(previewIndex + 1).padStart(2, '0')} / THE COLLECTION</p><h2>{previewProduct.name}</h2>{formatDetails(previewProduct).map(line => <p key={line}>{line}</p>)}{formatPrice(previewProduct.price) && <strong>{formatPrice(previewProduct.price)}</strong>}</div><footer>DECORBEATS <span>{previewIndex + 1} / {preview.products.length}</span></footer></article>
      <div className="dc-page-controls"><button disabled={previewIndex === 0} onClick={() => setPreviewIndex(i => i - 1)}>← Previous</button><span>Product {previewIndex + 1} of {preview.products.length}</span><button disabled={previewIndex === preview.products.length - 1} onClick={() => setPreviewIndex(i => i + 1)}>Next →</button></div>
    </> : <>
      <div className="dc-heading"><div><h1>Create your catalogue</h1><p>Add a photo and product name. Everything else is optional.</p></div><button className="dc-text-button" onClick={() => setShowCatalogues(v => !v)} aria-expanded={showCatalogues}>Your catalogues ({state.catalogues.length}) ↗</button></div>
      {showCatalogues && <section className="dc-drafts"><h2>Saved catalogue drafts</h2>{state.catalogues.map((c, index) => <button key={c.id} disabled={busy} aria-current={c.id === catalogue.id ? 'true' : undefined} onClick={() => { update(s => ({ ...s, activeCatalogueId: c.id, editingId: null })); setShowCatalogues(false); setShowLibrary(true); }}>{c.title || `Untitled catalogue ${index + 1}`}<span>{c.productIds.length} products {c.id === catalogue.id ? '· Open' : '→'}</span></button>)}<button className="dc-secondary" disabled={busy} onClick={createCatalogue}>+ Start a new catalogue</button></section>}
      {effectiveReviewSource && <section className="dc-source-entry"><div><strong>Products from your WhatsApp groups</strong><p>{effectiveReviewSource.products.length} review candidates, with source photos and details to check.</p></div><button className="dc-primary" disabled={busy || reviewPackBusy} onClick={() => { setSourceOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Review WhatsApp products</button></section>}
      <section className="dc-batch-entry"><div><strong>Have a batch of products?</strong><p>Add up to 20 photos together, group extra views, then fill in one card at a time.</p></div><button disabled={busy || selected.length >= MAX_CATALOGUE_PRODUCTS || state.products.length >= MAX_PRODUCTS} onClick={() => { setBatchOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Add photos together</button></section>
      <label className="dc-field dc-title-field"><span>CATALOGUE NAME <small>optional</small></span><input value={catalogue.title} maxLength={100} placeholder="e.g. The festive edit" disabled={busy} onChange={e => update(s => ({ ...s, catalogues: s.catalogues.map(c => c.id === catalogue.id ? { ...c, title: e.target.value } : c) }))} /></label>
      {selected.length >= MAX_CATALOGUE_PRODUCTS && <p className="dc-notice" role="status">This catalogue has 50 products. Any new products will save to your library; start another catalogue to include them.</p>}
      <div className="dc-workspace"><section className="dc-editor dc-swipe-card" aria-label="Product template" onTouchStart={startSwipe} onTouchEnd={finishSwipe}>
        {editingIndex >= 0 && selected.length > 1 && <nav className="dc-card-nav" aria-label="Product cards"><button disabled={busy || editingIndex === 0} onClick={() => goToProduct(-1)}>← Back</button><span>Product {editingIndex + 1} of {selected.length}<br/>Swipe or use Next</span><button disabled={busy || editingIndex === selected.length - 1} onClick={() => goToProduct(1)}>Next →</button></nav>}
        <div className="dc-section-heading"><h2>{product ? 'Your product' : 'Add a product'}</h2><span>{product ? `Product ${state.products.findIndex(p => p.id === product.id) + 1}` : 'New product'}</span></div>
        <div className={`dc-photo ${product?.photo ? 'has-photo' : ''}`}>
          {product?.photo ? <Photo photo={product.photo} alt={product.name || 'Selected product photo'}/> : <div><svg width="38" height="38" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="8" width="24" height="19" rx="4" stroke="currentColor" strokeWidth="1.4"/><path d="m10 8 2-4h8l2 4" stroke="currentColor" strokeWidth="1.4"/><circle cx="16" cy="17" r="5" stroke="currentColor" strokeWidth="1.4"/></svg><h3>Add your product photo</h3><p>One clear photo is all you need</p></div>}
          <div className="dc-photo-actions"><button disabled={busy} onClick={() => input.current?.click()}>{photoBusy ? 'Preparing photo…' : product?.photo ? 'Replace photo' : 'Choose photo'}</button><button disabled={busy} onClick={() => camera.current?.click()}>Camera</button></div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={e => { addPhoto(e.target.files?.[0]); e.target.value = ''; }}/>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e => { addPhoto(e.target.files?.[0]); e.target.value = ''; }}/>
        </div>
        {views.length > 1 && <section className="dc-photo-views" aria-label="Product views"><p>{views.length} views of this product · choose the cover for your PDF</p><div>{views.map((photo, i) => <button key={photo.assetId || i} disabled={busy} aria-label={`Use view ${i + 1} as cover`} aria-pressed={photo.assetId === product.photo?.assetId} onClick={() => chooseCover(photo)}><Photo photo={photo} alt={`Product view ${i + 1}`}/><span>{photo.assetId === product.photo?.assetId ? 'Cover' : `View ${i + 1}`}</span></button>)}</div></section>}
        {product?.photo?.warning && <p className="dc-photo-warning">{product.photo.warning}</p>}
        <label className="dc-field"><span>Product name <small>needed for PDF</small></span><input ref={nameInput} disabled={busy} value={product?.name || ''} maxLength={160} placeholder="e.g. Lotus diya" onChange={e => editField('name', e.target.value)} autoComplete="off" /></label>
        {product?.sourceReview && <SourceReviewCheck product={product} disabled={busy} onChange={confirmSourceReview} onQuote={value => editField('price', value)}/>}
        <p className="dc-dictation-hint">On iPhone, tap the keyboard microphone to dictate into the selected field. Check names and numbers before sharing.</p>
        <div className="dc-optional-heading"><span>Product details</span><small>All optional. Blank fields stay out of the PDF.</small></div>
        <fieldset disabled={busy} className="dc-dimensions"><legend>Dimensions</legend><div><NumberField id="catalogue-length" label="Length" value={product?.length} error={issues.length} onChange={v => editField('length', v)}/><NumberField id="catalogue-width" label="Width" value={product?.width} error={issues.width} onChange={v => editField('width', v)}/><NumberField id="catalogue-height" label="Height" value={product?.height} error={issues.height} onChange={v => editField('height', v)}/><label className="dc-field"><span>Unit</span><select aria-label="Dimension unit" value={product?.dimensionUnit || 'cm'} onChange={e => editField('dimensionUnit', e.target.value)}><option value="cm">cm</option><option value="in">in</option><option value="mm">mm</option></select></label></div></fieldset>
        <div className="dc-bottom-fields"><div className="dc-weight"><NumberField disabled={busy} id="catalogue-weight" label="Weight" value={product?.weight} error={issues.weight} onChange={v => !busy && editField('weight', v)}/><label className="dc-field"><span>Unit</span><select disabled={busy} aria-label="Weight unit" value={product?.weightUnit || 'g'} onChange={e => editField('weightUnit', e.target.value)}><option value="g">g</option><option value="kg">kg</option></select></label></div><NumberField disabled={busy} id="catalogue-price" label="Price ₹ (INR)" value={product?.price} error={issues.price} onChange={v => !busy && editField('price', v)}/></div>
        <div className="dc-main-actions"><button className="dc-primary" disabled={busy || !product} onClick={saveAndAnother}>{working ? taskMessage.startsWith('Saving') ? 'Saving…' : 'Preparing PDF…' : editingIndex >= 0 && editingIndex < selected.length - 1 ? 'Save & next  →' : 'Save & add another  + '}</button><button className="dc-secondary" disabled={busy || !selected.length} onClick={openPreview}>{working ? taskMessage.startsWith('Saving') ? 'Saving…' : 'Preparing PDF…' : `Preview catalogue  →`}</button></div>
        <p className="dc-muted">Incomplete products are saved too. Add a name and photo before exporting.</p>
      </section>
      <aside className="dc-selection"><div className="dc-section-heading"><h2>In this catalogue</h2><span>{selected.length} / {MAX_CATALOGUE_PRODUCTS}</span></div><p className="dc-muted">Choose the products and arrange their order.</p>
        {!selected.length && <div className="dc-empty">Your first product will appear here.<br />Already saved one? Choose it below.</div>}
        <ol className="dc-products">{selected.map((p, i) => <li key={p.id}><div className="dc-list-image"><Photo photo={p.photo} alt=""/>{!p.photo && <span>PHOTO</span>}</div><div className="dc-list-copy"><span className="dc-product-number">{String(i + 1).padStart(2, '0')}</span><button className="dc-product-name" disabled={busy} onClick={() => { update(s => ({ ...s, editingId: p.id })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{p.name || 'Untitled product'}</button><button className="dc-edit-product" disabled={busy} aria-label={`Edit ${p.name || 'untitled product'}`} onClick={() => { update(s => ({ ...s, editingId: p.id })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit product</button><small>{Object.keys(productErrors(p, true)).length ? 'Draft · needs a little more' : formatPrice(p.price) || 'Ready for PDF'}</small></div><div className="dc-order"><button disabled={busy || i === 0} aria-label={`Move ${p.name || 'untitled product'} up`} onClick={() => update(s => ({ ...s, catalogues: s.catalogues.map(c => c.id !== catalogue.id ? c : { ...c, productIds: moveProduct(c.productIds, p.id, -1) }) }))}>↑</button><button disabled={busy || i === selected.length - 1} aria-label={`Move ${p.name || 'untitled product'} down`} onClick={() => update(s => ({ ...s, catalogues: s.catalogues.map(c => c.id !== catalogue.id ? c : { ...c, productIds: moveProduct(c.productIds, p.id, 1) }) }))}>↓</button><button disabled={busy} aria-label={`Remove ${p.name || 'untitled product'} from catalogue`} onClick={() => update(s => toggleProduct(s, p.id))}>×</button></div></li>)}</ol>
        <button className="dc-library-toggle" disabled={busy} aria-expanded={showLibrary} onClick={() => setShowLibrary(v => !v)}>+ Choose saved products ({state.products.length})</button>
        {showLibrary && <section className="dc-library"><h3>Your saved products</h3><p>Saved on this device. Edits update the product wherever it is reused.</p>{!state.products.length && <p>No saved products yet.</p>}{state.products.map(p => <label key={p.id}><input type="checkbox" disabled={busy || (!catalogue.productIds.includes(p.id) && selected.length >= MAX_CATALOGUE_PRODUCTS)} checked={catalogue.productIds.includes(p.id)} onChange={() => update(s => toggleProduct(s, p.id))}/><span>{p.name || 'Untitled product'}</span></label>)}</section>}
        <div className="dc-device-note"><span aria-hidden="true">◉</span><div><strong>Yours, on this device</strong><p>Photos and drafts stay in this browser. They won’t sync to another phone or computer. Clearing browser data can remove them. Download your finished PDF to keep a copy.</p></div></div>
      </aside></div>
    </>)}
  </section>;
}
