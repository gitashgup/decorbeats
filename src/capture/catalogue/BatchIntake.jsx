import React, { useEffect, useRef, useState } from 'react';
import { prepareCataloguePhoto } from './photos.js';
import { MAX_BATCH_PHOTOS, appendReadyBatchGroups, batchProducts, chooseBatchCover, createBatchEntries, groupBatchPhotos, processPhotoBatch, removeBatchPhoto, ungroupBatchPhotos } from './batch.js';
import './batch.css';

function BatchPhoto({ photo, name }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!photo?.blob) return;
    const next = URL.createObjectURL(photo.blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [photo?.blob]);
  return url ? <img src={url} alt={name} /> : null;
}

// Keep mounted with hidden=true when closing, so the local review survives.
// onImport returns true when products are accepted into the parent workspace.
export default function BatchIntake({ onImport, onClose, maxProducts = MAX_BATCH_PHOTOS, hidden = false }) {
  const [entries, setEntries] = useState([]), [groups, setGroups] = useState([]), [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false), [importing, setImporting] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const entriesRef = useRef([]), groupsRef = useRef([]), task = useRef(null), importLock = useRef(false), mounted = useRef(true), input = useRef(null);
  const capacity = Math.max(0, Math.min(MAX_BATCH_PHOTOS, Number.isFinite(maxProducts) ? maxProducts : MAX_BATCH_PHOTOS));
  function writeGroups(next) { groupsRef.current = next; setGroups(next); }
  function writeEntries(next) {
    entriesRef.current = next; setEntries(next);
    writeGroups(appendReadyBatchGroups(groupsRef.current, next));
  }
  useEffect(() => {
    mounted.current = true;
    function warn(event) { if (entriesRef.current.length) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => { mounted.current = false; task.current?.abort(); window.removeEventListener('beforeunload', warn); };
  }, []);
  useEffect(() => { if (hidden) task.current?.abort(); }, [hidden]);

  async function run(next, ids) {
    if (task.current || importLock.current) return;
    const controller = new AbortController(); task.current = controller;
    setBusy(true); setError('');
    try {
      await processPhotoBatch(next, { prepare: prepareCataloguePhoto, signal: controller.signal, ids, onUpdate: update => { if (mounted.current) writeEntries(update); } });
    } finally {
      if (task.current === controller) task.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  function pick(files) {
    if (task.current || importLock.current) return;
    const result = createBatchEntries(files, entriesRef.current);
    const notes = [];
    if (result.rejected.length) notes.push(`Batch limit: ${MAX_BATCH_PHOTOS} photos. Not added: ${result.rejected.join(', ')}. Add these in your next batch.`);
    if (result.duplicates.length) notes.push(`Already in this batch: ${result.duplicates.join(', ')}. No extra products created.`);
    setNotice(notes.join(' ')); setError('');
    writeEntries(result.entries);
    // Ready entries are always skipped; failed photos only retry on request.
    const queued = result.entries.filter(entry => entry.status === 'queued').map(entry => entry.id);
    if (queued.length) run(result.entries, queued);
  }
  function close() {
    if (importLock.current) return;
    task.current?.abort();
    if (entriesRef.current.length) setNotice('Your batch is kept in this open tab. Reopen Add photos to continue.');
    onClose?.();
  }
  function toggle(id) { setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  function remove(id) {
    if (task.current || importLock.current) return;
    const next = removeBatchPhoto(entriesRef.current, groupsRef.current, id);
    writeGroups(next.groups); writeEntries(next.entries); setSelected(current => current.filter(value => value !== id));
    setNotice('Photo removed from this batch. You can choose it again if needed.');
  }
  function combine() { writeGroups(groupBatchPhotos(groupsRef.current, selected)); setSelected([]); }
  async function importProducts() {
    if (task.current || importLock.current) return;
    const products = batchProducts(groupsRef.current, entriesRef.current);
    if (!products.length || products.length > capacity) return;
    importLock.current = true; setImporting(true); setError('');
    const imported = new Set(groupsRef.current.flatMap(group => group.photoIds));
    try {
      const accepted = await onImport(products, { unfinishedCount: entriesRef.current.filter(entry => !imported.has(entry.id)).length });
      if (!mounted.current) return;
      if (accepted === true) {
        const remaining = entriesRef.current.filter(entry => !imported.has(entry.id));
        entriesRef.current = remaining; setEntries(remaining); writeGroups([]); setSelected([]);
        setNotice(remaining.length ? 'Products added. Unfinished photos are still here to retry.' : 'Photos added. Your products are ready to edit.');
      } else setError('Your photos are still here. Resolve the save message, then try adding them again.');
    } catch (cause) {
      if (mounted.current) setError(cause?.message || 'Could not add products. Your photos are still here; please retry.');
    } finally {
      importLock.current = false;
      if (mounted.current) setImporting(false);
    }
  }
  const readyCount = entries.filter(entry => entry.status === 'ready').length;
  const unfinished = entries.filter(entry => entry.status !== 'ready');
  const processing = entries.find(entry => entry.status === 'processing');
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const tooMany = groups.length > capacity;
  return <section className="dc-batch" hidden={hidden} aria-label="Add product photos" aria-busy={busy || importing}>
    <header className="dc-batch-heading"><div><span className="dc-batch-eyebrow">ADD YOUR PRODUCTS</span><h2>All your photos. One go.</h2></div><button type="button" className="dc-batch-close" onClick={close} disabled={importing} aria-label="Close photo intake">Close</button></header>
    <p className="dc-batch-intro">Choose up to {MAX_BATCH_PHOTOS} photos together. Each photo starts as one product. Group different views of the same item below.</p>
    <div className="dc-batch-picker">
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" aria-label="Choose product photos" hidden onChange={event => { pick(event.target.files); event.target.value = ''; }} />
      <button type="button" className="dc-batch-primary" onClick={() => input.current?.click()} disabled={busy || importing || entries.length >= MAX_BATCH_PHOTOS || capacity === 0}>{entries.length ? 'Add more photos' : 'Choose photos'}</button>
      <span>{entries.length} / {MAX_BATCH_PHOTOS} photos · {capacity} product {capacity === 1 ? 'space' : 'spaces'} available</span>
    </div>
    <p className="dc-batch-privacy">Prepared on this device. Add names and details next.</p>
    {notice && <p className="dc-batch-notice" role="status">{notice}</p>}
    {error && <p className="dc-batch-error" role="alert">{error}</p>}
    {capacity === 0 && <p className="dc-batch-error" role="alert">This workspace has no product spaces left. Your current drafts are unchanged.</p>}
    {busy && <div className="dc-batch-progress" role="status"><div><strong>Preparing {Math.min(entries.length, entries.findIndex(entry => entry.id === processing?.id) + 1)} of {entries.length}</strong><span>{processing?.name || 'Finishing this photo…'}</span><small>{readyCount} ready to review</small></div><button type="button" onClick={() => { task.current?.abort(); setNotice('Processing paused. Prepared photos are kept below.'); }}>Pause processing</button></div>}
    {groups.length > 0 && <>
      <div className="dc-batch-review-heading"><div><h3>Review your products</h3><p>{readyCount} photos → {groups.length} {groups.length === 1 ? 'product' : 'products'}</p></div><span className="dc-batch-step">GROUP → CHOOSE COVER</span></div>
      <div className="dc-batch-group-tools"><p>Select photos of the same item, then group them.</p><button type="button" onClick={combine} disabled={selected.length < 2 || importing}>Group selected{selected.length ? ` (${selected.length})` : ''}</button>{selected.length > 0 && <button type="button" onClick={() => setSelected([])} disabled={importing}>Clear</button>}</div>
      <div className="dc-batch-groups">{groups.map((group, index) => <article className="dc-batch-group" key={group.id} aria-label={`Product group ${index + 1}`}>
        <header><div><strong>Product {index + 1}</strong><span>{group.photoIds.length === 1 ? '1 photo' : `${group.photoIds.length} views · one product`}</span></div>{group.photoIds.length > 1 && <button type="button" onClick={() => { writeGroups(ungroupBatchPhotos(groupsRef.current, group.id)); setSelected([]); }} disabled={importing} aria-label={`Ungroup product ${index + 1}`}>Ungroup</button>}</header>
        <div className="dc-batch-photos">{group.photoIds.map(id => {
          const entry = byId.get(id); if (!entry) return null;
          const cover = group.coverId === id;
          return <div className={`dc-batch-photo ${selected.includes(id) ? 'is-selected' : ''}`} key={id}>
            <label className="dc-batch-select"><input type="checkbox" checked={selected.includes(id)} disabled={importing} onChange={() => toggle(id)} aria-label={`Select ${entry.name} for grouping`} /><span><BatchPhoto photo={entry.photo} name={entry.name} /></span></label>
            <span className="dc-batch-filename" title={entry.name}>{entry.name}</span>
            <button type="button" className={`dc-batch-cover ${cover ? 'is-cover' : ''}`} aria-pressed={cover} aria-label={`${cover ? 'Cover photo' : 'Use as cover'}: ${entry.name}`} onClick={() => writeGroups(chooseBatchCover(groupsRef.current, group.id, id))} disabled={importing}>{cover ? '✓ Cover' : 'Use as cover'}</button>
            <button type="button" className="dc-batch-remove" onClick={() => remove(id)} disabled={busy || importing} aria-label={`Remove ${entry.name} from batch`}>Remove</button>
            {entry.photo?.warning && <small className="dc-batch-warning">{entry.photo.warning}</small>}
          </div>;
        })}</div>
      </article>)}</div>
    </>}
    {unfinished.length > 0 && <div className="dc-batch-unfinished"><h3>{busy ? 'Preparing photos' : 'Photos to finish'}</h3>{unfinished.map(entry => <div className="dc-batch-file" key={entry.id}><div><strong>{entry.name}</strong><span className={entry.status === 'error' ? 'dc-batch-error-text' : ''}>{entry.error || (entry.status === 'processing' ? 'Preparing…' : entry.status === 'paused' ? 'Paused. Ready to continue.' : 'Waiting to prepare')}</span></div>{entry.status !== 'processing' && <div className="dc-batch-file-actions"><button type="button" disabled={busy || importing} onClick={() => run(entriesRef.current, [entry.id])} aria-label={`Retry ${entry.name}`}>Retry</button><button type="button" disabled={busy || importing} onClick={() => remove(entry.id)} aria-label={`Remove ${entry.name} from batch`}>Remove</button></div>}</div>)}{!busy && unfinished.length > 1 && <button type="button" disabled={importing} onClick={() => run(entriesRef.current, unfinished.map(entry => entry.id))}>Retry unfinished photos</button>}</div>}
    {tooMany && <p className="dc-batch-error" role="alert">You have room for {capacity} more {capacity === 1 ? 'product' : 'products'}. Group photos of the same item or remove extra photos from this batch to continue.</p>}
    {groups.length > 0 && <footer className="dc-batch-footer"><p>{unfinished.length > 0 ? `${unfinished.length} unfinished ${unfinished.length === 1 ? 'photo stays' : 'photos stay'} here to retry.` : 'Cover photos appear in your catalogue.'}</p><button type="button" className="dc-batch-primary" onClick={importProducts} disabled={busy || importing || tooMany}>{importing ? 'Adding products…' : `Edit ${groups.length} ${groups.length === 1 ? 'product' : 'products'}`}</button></footer>}
    <p className="dc-batch-device-note">You can close this panel and return in this tab. Keep the tab open until your products are added.</p>
  </section>;
}
