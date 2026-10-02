import React, { useEffect, useRef, useState } from 'react';
import { buildReviewDraft, formatReviewFact, getReviewAssets, isCollageCandidate, reviewDraftId } from './sourceReview.js';
import { prepareCataloguePhoto } from './photos';
import { waitForTask } from './tasks';
import { numericError } from './model';
import './sourceReview.css';

function assetUrl(base, path) {
  // Hosted review assets must stay on this Site, behind its existing audience gate.
  if (!/^\/[a-zA-Z0-9/_-]+\/$/.test(base || '')) throw new Error('Invalid review asset location');
  return `${base}${path}`;
}
export function SourceFacts({ facts = [] }) {
  return facts.length ? <ul className="dc-source-facts">{facts.map((fact, i) => <li key={i}>{formatReviewFact(fact)}</li>)}</ul> : <p>No product specifications were confirmed in the reviewed messages.</p>;
}
export function SourceReviewCheck({ product, disabled, onChange, onQuote }) {
  const source = product.sourceReview;
  if (!source) return null;
  const quote = source.facts.find(f => f.field === 'catalogue_price_quote' && !numericError(f.value, { zero: true, decimals: 2 }) && String(f.value).trim());
  const ready = !!product.photo?.blob && !!product.name.trim();
  return <section className="dc-source-check" aria-label="WhatsApp source review">
    <div className="dc-section-heading"><h3>Check before sharing</h3><span>{source.status === 'confirmed' ? 'Confirmed by you' : 'Review required'}</span></div>
    <p>This started as WhatsApp candidate {source.candidateId}. Names may be working labels. Only fields you confirm belong in the customer catalogue.</p>
    <details><summary>View source details and questions</summary><p><strong>Source name:</strong> {source.workingName} · {source.nameStatus}</p><SourceFacts facts={source.facts}/><ul>{source.reviewFlags.map((flag, i) => <li key={i}>{flag}</li>)}</ul><small>Source references: {source.sourceMessageIds.join(', ')}</small></details>
    {quote && <div className="dc-quote-confirm"><p>Source quote: <strong>{quote.value}</strong> · {quote.currency || 'currency to confirm'} · {quote.basis || 'price basis to confirm'}</p><button type="button" disabled={disabled} onClick={() => onQuote(String(quote.value))}>Confirm {quote.value} as the INR selling price</button><small>Tap only if this is the final INR price for exactly the product or set shown. Check tax and delivery treatment first. Otherwise enter a different price below or leave it blank.</small></div>}
    {!ready && <p>Add an individual product photo and check the name before confirming. A collage reference is not used as an individual product photo.</p>}
    <label className="dc-source-confirm"><input type="checkbox" disabled={disabled || !ready} checked={source.status === 'confirmed'} onChange={e => onChange(e.target.checked)}/><span>I checked the photo, name and every filled field for this product or set. It is ready for a customer catalogue.</span></label>
    <small>Editing a field or replacing the photo asks you to confirm again. Blank optional fields are omitted.</small>
  </section>;
}

export default function SourceReviewInbox({ source, products, disabled, onImport, onClose }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [limit, setLimit] = useState(20), [selectedId, setSelectedId] = useState(null), [photoIndex, setPhotoIndex] = useState(0);
  const [working, setWorking] = useState(false), [error, setError] = useState('');
  const task = useRef(null), mounted = useRef(true);
  const [localUrls, setLocalUrls] = useState({ assets: null, urls: {} });
  useEffect(() => {
    const assets = source.assets;
    if (!assets) { setLocalUrls({ assets: null, urls: {} }); return; }
    const urls = {};
    for (const [path, blob] of Object.entries(assets)) urls[path] = URL.createObjectURL(blob);
    setLocalUrls({ assets, urls });
    return () => { for (const url of Object.values(urls)) URL.revokeObjectURL(url); };
  }, [source.assets]);
  const urlFor = path => source.assets ? (localUrls.assets === source.assets ? localUrls.urls[path] || '' : '') : assetUrl(source.assetBase, path);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; task.current?.abort(); }; }, []);
  const rows = Array.isArray(source?.products) ? source.products : [];
  const imported = new Set(products.filter(p => p.sourceReview?.datasetId === source.datasetId).map(p => p.sourceReview.candidateId));
  const visible = rows.filter(row => (!query.trim() || `${row.id} ${row.working_name}`.toLowerCase().includes(query.trim().toLowerCase())) && (filter === 'all' || (filter === 'new' ? !imported.has(row.id) : filter === 'imported' ? imported.has(row.id) : isCollageCandidate(row))));
  const selected = rows.find(row => row.id === selectedId), assets = selected ? getReviewAssets(selected) : [], asset = assets[photoIndex] || assets[0];
  const collage = selected && isCollageCandidate(selected);
  const existing = selected && products.find(p => p.id === reviewDraftId(selected, source.datasetId));
  async function add(withPhoto) {
    if (disabled || task.current || !selected) return;
    const controller = new AbortController(); task.current = controller; setWorking(true); setError('');
    try {
      let photo = null;
      if (!existing && withPhoto && asset && !collage) {
        let blob = source.assets?.[asset.asset_path];
        if (!source.assets) {
          const response = await waitForTask(fetch(assetUrl(source.assetBase, asset.asset_path), { signal: controller.signal, credentials: 'same-origin' }), { signal: controller.signal, timeoutMs: 15000, message: 'The source photo took too long to load. Retry or add a draft without the photo.' });
          if (!response.ok) throw new Error('The source photo could not be loaded. Retry or add a draft without the photo.');
          blob = await waitForTask(response.blob(), { signal: controller.signal, timeoutMs: 15000 });
        }
        if (!blob) throw new Error('This review photo is missing. Reimport the prepared review ZIP or add a draft without the photo.');
        photo = await prepareCataloguePhoto(new File([blob], asset.asset_path.split('/').at(-1), { type: blob.type }), { signal: controller.signal });
      }
      controller.signal.throwIfAborted();
      await onImport(existing || buildReviewDraft(selected, { datasetId: source.datasetId, photo }));
    } catch (e) { if (mounted.current) setError(e.name === 'AbortError' ? 'Import cancelled. Existing drafts are unchanged.' : e.message || 'Could not prepare this draft. Retry.'); }
    finally { controller.abort(); if (task.current === controller) task.current = null; if (mounted.current) setWorking(false); }
  }
  function select(row) { if (working) return; setSelectedId(row.id); setPhotoIndex(0); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  return <section className="dc-source-inbox" aria-label="WhatsApp product review">
    <div className="dc-heading"><div><p className="dc-kicker">FROM YOUR WHATSAPP EXPORTS</p><h1>Review your products</h1><p>{rows.length} candidates · 13 September–2 October 2026</p></div><button disabled={working} onClick={onClose}>← Back to catalogue</button></div>
    <p className="dc-source-intro">Start with the photos, then check the name and details. These are review candidates, not current stock or final offers. Nothing is added to your catalogue until you choose it. Your reviews save only on this device.</p>
    <p className="dc-muted">Marketing history ends on 29 September in the supplied export. Quotes with no currency or selling basis remain unconfirmed. Costs, orders and raw chat are excluded.</p>
    <div className="dc-source-tools"><label className="dc-field"><span>Find a product</span><input value={query} onChange={e => { setQuery(e.target.value); setLimit(20); }} placeholder="Search name or reference"/></label><label className="dc-field"><span>Show</span><select value={filter} onChange={e => { setFilter(e.target.value); setLimit(20); }}><option value="all">All candidates</option><option value="new">Not added on this device</option><option value="imported">Added on this device</option><option value="collage">Collage references</option></select></label></div>
    {selected && <article className="dc-source-detail"><div className="dc-section-heading"><h2>{selected.working_name}</h2><button disabled={working} onClick={() => setSelectedId(null)}>Close details</button></div><p>{selected.id} · {selected.name_status}</p>
      {asset ? <><img className="dc-source-large" src={urlFor(asset.asset_path)} alt={collage ? 'Full source collage, reference only' : selected.working_name}/><p className="dc-muted">{collage ? `Full collage reference. Candidate position: row ${asset.tile_position?.row || '?'}, column ${asset.tile_position?.column || '?'}. An individual product photo is needed.` : `${(asset.role || 'Source photo').replaceAll('_', ' ')}${asset.date ? ` · ${asset.date.slice(0, 10)}` : ''}`}</p></> : <p>No individual product photo was supplied for this candidate.</p>}
      {assets.length > 1 && <div className="dc-source-thumbs">{assets.map((media, i) => <button key={media.asset_path} disabled={working} aria-pressed={i === photoIndex} onClick={() => setPhotoIndex(i)}><img src={urlFor(media.asset_path)} alt={`Source view ${i + 1}`}/><span>View {i + 1}</span></button>)}</div>}
      <SourceFacts facts={selected.facts}/><details><summary>Questions to check ({selected.review_flags?.length || 0})</summary><ul>{selected.review_flags?.map((flag, i) => <li key={i}>{flag}</li>)}</ul><small>Source references: {selected.source_message_ids?.join(', ')}</small></details>
      <p className="dc-muted">Add this as a draft, then confirm its photo, name and any optional details in the editor. Source quotes and dimensions are not guessed into fields.</p>
      {error && <p className="dc-alert" role="alert">{error}</p>}
      <div className="dc-source-actions"><button className="dc-primary" disabled={disabled || working} onClick={() => add(!!asset && !collage)}>{working ? 'Preparing review draft…' : existing ? 'Open your existing draft' : collage || !asset ? 'Add draft · photo needed' : 'Add draft with this photo'}</button>{!existing && asset && !collage && <button disabled={disabled || working} onClick={() => add(false)}>Add without photo</button>}{working && <button onClick={() => task.current?.abort()}>Cancel</button>}</div>
    </article>}
    <p className="dc-muted">{visible.length} candidates · {imported.size} added on this device</p>
    <div className="dc-source-grid">{visible.slice(0, limit).map(row => { const media = getReviewAssets(row)[0]; return <button className="dc-source-card" key={row.id} disabled={working} onClick={() => select(row)}>{media ? <img loading="lazy" src={urlFor(media.asset_path)} alt=""/> : <span className="dc-source-no-photo">PHOTO NEEDED</span>}<span><small>{row.id} · {imported.has(row.id) ? 'Added on this device' : isCollageCandidate(row) ? 'Collage reference' : 'Review candidate'}</small><strong>{row.working_name}</strong><span>View details →</span></span></button>; })}</div>
    {visible.length > limit && <button className="dc-secondary" onClick={() => setLimit(n => n + 20)}>Show 20 more</button>}
  </section>;
}
