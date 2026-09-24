import React,{useRef,useState,useMemo} from 'react';
import ReviewGallery from './ReviewGallery';
import ProductPicker from './ProductPicker';
import {downloadListing,listingText} from './listingExport';
import {productVideoEntries} from './reviewVideos';
import {findSimilarProducts} from './productMatching';

export default function ProductReview({draft,change,onInspect,onPhotos,onUploadEdited,onUploadVideos,onGenerate,onAutoEnrich,onStageLifestyle,onEnhancePhoto,onAddDimensionsPhoto,onDeletePhoto,enrichState={active:false,percent:0,step:0,message:''},busy,issues,onMatch,products,allProducts,search,setSearch,onCompare,dirty,onOpenAmazonModal}){
 const editedInput=useRef(null);
 const videoInput=useRef(null);
 const d=draft.data;const [exporting,setExporting]=useState(false),[notice,setNotice]=useState('');
 const [dimModalOpen, setDimModalOpen]=useState(false);
 const [dimForm, setDimForm]=useState({
  height: d.height || '',
  width: d.width || '',
  length: d.length || '',
  weight_g: d.weight_g || ''
 });
 const catalogToScan = allProducts || products || [];
 const similarMatches = useMemo(()=>findSimilarProducts(draft, catalogToScan), [draft?.data?.name, draft?.data?.category, draft?.data?.material, catalogToScan]);
 const field=(key,label,type='text')=><label className="cs-field" key={key}><span>{label}</span><input type={type} inputMode={type==='number'?'decimal':undefined} min={type==='number'?'0':undefined} step={type==='number'?'any':undefined} value={d[key]??''} onChange={e=>change(key,e.target.value)}/></label>;
 async function download(){setExporting(true);try{await downloadListing(d,setNotice);}catch(e){setNotice(e.message);}finally{setExporting(false);}}
 const hasPhotos=Object.values(d.photos||{}).some(p=>p?.url);
 const benchmark=d.marketBenchmark||{};

 return <div className="cs-simple-review">
  <section className="cs-panel cs-auto-enrich-panel">
   <div className="cs-auto-enrich-header">
    <div className="cs-auto-enrich-text">
     <div className="cs-ai-badge">✨ AI Catalog Studio</div>
     <h2>Automated Product Enrichment</h2>
     <p>Vision AI inspects all camera angles, identifies deity & craft details, benchmarks Indian marketplace pricing, and writes SEO listing copy.</p>
    </div>
    <div className="cs-auto-enrich-actions">
     <button type="button" className="cs-btn-amazon-import" disabled={busy||draft.status==='published'} onClick={onOpenAmazonModal} style={{marginRight:8}}>
      🛒 Import from Amazon
     </button>
     <button type="button" className="cs-primary cs-btn-auto-enrich" disabled={busy||draft.status==='published'||!hasPhotos||enrichState.active} onClick={onAutoEnrich}>
      {enrichState.active?'Enriching…':busy?'Saving…':'✨ Auto-Enrich from Photos'}
     </button>
    </div>
   </div>

   {enrichState.active&&(
    <div className="cs-enrich-progress-card">
     <div className="cs-progress-header">
      <strong>Processing Multi-Angle Photos…</strong>
      <span>{enrichState.percent}%</span>
     </div>
     <div className="cs-progress-bar-track">
      <div className="cs-progress-bar-fill" style={{width:`${enrichState.percent}%`}}/>
     </div>
     <div className="cs-progress-steps-row">
      <span className={enrichState.step>=1?'done':''}>📸 1. Angles</span>
      <span className={enrichState.step>=2?'done':''}>🏷️ 2. Iconography</span>
      <span className={enrichState.step>=3?'done':''}>🔍 3. Market Pricing</span>
      <span className={enrichState.step>=4?'done':''}>✍️ 4. Story & SEO</span>
     </div>
     <p className="cs-progress-caption">{enrichState.message}</p>
     <small className="cs-progress-hint">💡 You can leave this page or switch tabs anytime — your draft is preserved and you can come back to verify.</small>
    </div>
   )}

   {d.enrichmentStatus==='queued'&&!enrichState.active&&(
    <div className="cs-queued-banner">
     <span className="cs-status-indicator pulse">●</span>
     <div>
      <strong>Queued for Antigravity AI Enrichment</strong>
      <p>Your photos and specs are queued. Antigravity will enrich this product with your Ultra plan. You can leave this page and come back anytime to verify!</p>
     </div>
    </div>
   )}

   {d.aiEnriched&&(
    <div className="cs-verification-banner">
     <div className="cs-verification-status">
      <span className="cs-status-indicator success">●</span>
      <div>
       <strong>✨ AI Enriched Listing — Ready for Verification</strong>
       <p>Vision AI & market benchmarks have filled the listing below. Verify details and pricing before publishing.</p>
      </div>
     </div>
     <div className="cs-verification-actions">
      {d.enrichmentVerified?(
       <span className="cs-verified-badge">✓ Verified & Approved</span>
      ):(
       <button type="button" className="cs-btn-verify-approve" disabled={busy||draft.status==='published'} onClick={()=>{change('enrichmentVerified',true);change('pricingApproved',true);change('imageQualityApproved',true);}}>
        ✓ Approve & Mark Verified
       </button>
      )}
     </div>
    </div>
   )}

   {(benchmark.marketPriceRange||benchmark.suggestedSellingPrice||d.aiEnriched)&&(
    <div className="cs-benchmark-grid">
     <div className="cs-benchmark-card">
      <small>Identified Craft & Subject</small>
      <strong>{d.name||'Handcrafted Brass'}</strong>
      <span>{d.material||'Solid Brass'} · {d.category||'Idols & Sculptures'}</span>
     </div>
     {benchmark.marketPriceRange&&(
      <div className="cs-benchmark-card">
       <small>Market Benchmark (Amazon / Handicrafts)</small>
       <strong>{benchmark.marketPriceRange}</strong>
       <span>Based on {d.weight_g?`${d.weight_g}g weight`:'dimensions & weight'}</span>
      </div>
     )}
     {benchmark.suggestedSellingPrice&&(
      <div className="cs-benchmark-card cs-benchmark-suggested">
       <small>Suggested Selling Price</small>
       <div className="cs-price-row">
        <strong>₹{benchmark.suggestedSellingPrice}</strong>
        {d.mrp!==String(benchmark.suggestedSellingPrice)&&(
         <button type="button" className="cs-btn-apply-price" disabled={busy||draft.status==='published'} onClick={()=>change('mrp',String(benchmark.suggestedSellingPrice))}>
          Apply to Price →
         </button>
        )}
       </div>
       <span>Estimated Cost: ₹{benchmark.estimatedCostPrice||Math.round(benchmark.suggestedSellingPrice*0.45)}</span>
      </div>
     )}
    </div>
   )}
  </section>

  <section className="cs-panel"><div className="cs-section-heading"><h2>Product videos</h2><button type="button" disabled={busy||draft.status==='published'} onClick={()=>videoInput.current?.click()}>{busy?'Saving…':'Upload product videos ↑'}</button></div><input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple hidden onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';onUploadVideos(files);}}/><p>Up to 6 extra clips · 45 MB / 60 seconds each. MP4 (H.264) recommended. Saved for review; added to the website when you publish.</p><div className="cs-review-video-grid">{productVideoEntries(d.productVideos).map(([key,video])=><figure key={key}><video src={video.url} controls playsInline preload="none"/><figcaption>{video.filename||'Product video'}</figcaption></figure>)}</div></section>
  <section className="cs-panel"><div className="cs-section-heading"><h2>Edited website photos</h2><button type="button" disabled={busy||draft.status==='published'} onClick={()=>editedInput.current?.click()}>{busy?'Saving…':'Upload edited photos ↑'}</button></div><input ref={editedInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';onUploadEdited(files);}}/><p>Choose multiple JPG, PNG or WebP images. Originals stay; new photos are added to the gallery below and go live when you publish.</p></section>
  <section className="cs-panel cs-inventory-matching-panel">
   <div className="cs-section-heading">
    <div>
     <h2>{draft.product_id ? '✓ Matched to Existing Inventory' : 'Find or Match Product in Inventory'}</h2>
     <p>{draft.product_id ? `Linked to ${d.name} (${d.sku}). Updates existing product and stock upon publishing.` : 'AI recommendations based on your photos, deity motif, and craft details.'}</p>
    </div>
    {draft.product_id && (
     <div style={{display:'flex',gap:8}}>
      <button type="button" className="cs-btn-amazon-import" disabled={busy} onClick={onOpenAmazonModal} style={{fontSize:13,minHeight:36,padding:'6px 14px'}}>
       🛒 Sync Amazon Details
      </button>
      <button type="button" className="cs-btn-unlink" disabled={busy} onClick={()=>{change('product_id',null);change('destination','new');}}>
       Unlink / Change Match
      </button>
     </div>
    )}
   </div>

   {draft.product_id ? (
    <div className="cs-matched-summary">
     <strong>{d.name}</strong>
     <span>SKU: {d.sku} · Category: {d.category} · Material: {d.material}</span>
    </div>
   ) : (
    <div className="cs-similarity-block">
     {similarMatches.length > 0 ? (
      <>
       <div className="cs-similar-heading">
        <strong>🔍 Similar Looking Products in Inventory ({similarMatches.length} suggested)</strong>
        <small>Click to link this draft to an existing product if it matches:</small>
       </div>
       <div className="cs-similar-grid">
        {similarMatches.slice(0, 4).map(({ product: p, score, reason }) => (
         <div key={p.id} className="cs-similar-card">
          <div className="cs-similar-img-box">
           <img src={p.image_url || '/assets/images/product-fallback.svg'} alt={p.name} loading="lazy" />
           <span className={`cs-match-badge ${score >= 70 ? 'high' : 'medium'}`}>{score}% match</span>
          </div>
          <div className="cs-similar-body">
           <strong>{p.name}</strong>
           <small>{p.sku} · {p.category || 'Decor'} · {p.material || 'Brass'}</small>
           <span className="cs-match-reason">{reason}</span>
           <span className="cs-match-stock">{p.quantity ?? 0} in stock · ₹{p.mrp || '—'}</span>
          </div>
          <button type="button" className="cs-btn-link-match" disabled={busy} onClick={()=>onMatch(p)}>
           This is it (Link) →
          </button>
         </div>
        ))}
       </div>
      </>
     ) : (
      <div className="cs-similar-empty-banner">
       <span className="cs-empty-icon">💡</span>
       <div>
        <strong>No similar products found in existing inventory.</strong>
        <p>This appears to be a brand-new idol or design that Decorbeats has never listed before.</p>
       </div>
      </div>
     )}

     {/* Clear Option to Create New Product */}
     <div className="cs-create-new-prompt">
      <button
       type="button"
       className={`cs-btn-select-new ${d.destination === 'new' ? 'selected' : ''}`}
       disabled={busy}
       onClick={()=>change('destination', 'new')}
      >
       {d.destination === 'new' ? '✓ New Product Selected (Will create new listing & SKU)' : '✨ None of these — This is a Brand New Product'}
      </button>
      <span>If this physical piece has never been listed on Decorbeats before, select this to create a new live listing.</span>
     </div>

     {/* Expandable Manual Search / Barcode Scanner */}
     <details className="cs-manual-search-details">
      <summary>🔍 Or search entire inventory by keyword / barcode</summary>
      <div className="cs-manual-search-wrap">
       <ProductPicker visual busy={busy} onSelect={onMatch} />
      </div>
     </details>
    </div>
   )}
  </section>
  <section className="cs-panel cs-export-bar"><div><h2>Product review</h2><p>Check the photos and facts. Save, export or publish.</p></div><div className="cs-row-actions"><button type="button" disabled={exporting} onClick={download}>{exporting?'Preparing…':'Download photos + details ↓'}</button><a className="cs-external-link" href="https://sellercentral.amazon.in/product-search" target="_blank" rel="noopener noreferrer">Open Seller Central ↗</a></div>{notice&&<p role="status">{notice}</p>}</section>
  <div className="cs-review-columns"><section className="cs-panel"><div className="cs-section-heading"><h2>1. Photos</h2><button type="button" onClick={onPhotos}>Replace / add</button></div><ReviewGallery key={draft.id} photos={d.photos} onInspect={onInspect} onDelete={onDeletePhoto}/><div className="cs-lifestyle-staging"><div className="cs-lifestyle-heading"><h3>✨ Studio Photo Retouching & AI Staging</h3><p>Clean raw studio captures to pure white e-commerce standards, boost brass exposure, or stage authentic Indian lifestyle scenes.</p></div><div className="cs-row-actions cs-lifestyle-buttons"><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onEnhancePhoto?.('hero',{cleanBackground:true,brighten:true,shadow:true})}>🪄 Pure White Background</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onEnhancePhoto?.('hero',{brightenOnly:true})}>☀️ Brighten & Boost Warmth</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>{setDimForm({height:d.height||'',width:d.width||'',length:d.length||'',weight_g:d.weight_g||''});setDimModalOpen(true);}}>📏 Add Dimension Ruler</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onStageLifestyle('pooja_mandir')}>🪔 Pooja Mandir</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onStageLifestyle('living_room')}>🛋️ Living Room</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onStageLifestyle('festive_diwali')}>✨ Festive Diwali</button></div></div><p className="cs-caption">Check: sharp detail · enough light · full product · clean background.</p>{Object.entries(d.photos||{}).filter(([,p])=>p.warning).map(([key,p])=><p key={key} className="cs-warning">{key}: {p.warning}</p>)}<label className="cs-check"><input type="checkbox" checked={!!d.imageQualityApproved} onChange={e=>change('imageQualityApproved',e.target.checked)}/>Photos checked</label>{d.video?.url&&<details><summary>360° video</summary><video src={d.video.url} controls playsInline preload="none" style={{width:'100%'}}/></details>}<label className="cs-check"><input type="checkbox" checked={!!d.keepExistingPhotos} onChange={e=>change('keepExistingPhotos',e.target.checked)}/>Keep existing website photos too</label></section>
  <section className="cs-panel"><h2>2. Name & description</h2>{field('name','Product name')}<div className="cs-fields">{field('category','Category')}{field('material','Material')}{field('unit','What is included?')}</div><label className="cs-field"><span>Description</span><textarea rows="5" value={d.notes||''} onChange={e=>change('notes',e.target.value)} placeholder="Describe this exact product. You can paste reviewed Amazon or Canva copy here."/></label><label className="cs-field"><span>Highlights · one per line</span><textarea rows="3" value={(d.marketing?.highlights||[]).join('\n')} onChange={e=>change('marketing',{...d.marketing,highlights:e.target.value.split('\n')})}/></label><details><summary>Writing help & Amazon reference</summary><div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}><button type="button" className="cs-btn-amazon-import" onClick={onOpenAmazonModal}>🛒 Import from Amazon listing</button><button type="button" disabled={busy||!Object.keys(d.photos||{}).length} onClick={onGenerate}>Draft description with AI</button><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(listingText(d));setNotice('Product details copied.');}catch{setNotice('Copy unavailable. Use Download photos + details.');}}}>Copy details for Amazon AI</button></div><p>Review AI text before saving. ZIP includes JPG photos, originals and details; unzip before uploading.</p>{field('asin','Existing Amazon ASIN')}{field('sellerSku','Amazon seller SKU')}</details></section></div>
  <section className="cs-panel"><h2>3. Measurements</h2><div className="cs-measure-grid">{[['Product',''],['With packaging','packed_']].map(([label,prefix])=><div key={label}><h3>{label}</h3><div className="cs-fields">{[['length','Length · cm'],['width','Width · cm'],['height','Height · cm'],['weight_g','Weight · g']].map(([key,label])=>field(prefix+key,label,'number'))}</div></div>)}</div></section>
  <section className="cs-panel"><h2>4. Stock & price</h2>{(d.locations||[]).map((loc,i)=><div className="cs-fields" key={i}>{[['name','Location'],['sellable','Sellable quantity'],['damaged','Damaged quantity']].map(([key,label])=><label className="cs-field" key={key}><span>{label}</span><input type={key==='name'?'text':'number'} min="0" step="1" value={loc[key]??''} onChange={e=>change('locations',d.locations.map((x,j)=>j===i?{...x,[key]:e.target.value}:x))}/></label>)}</div>)}<div className="cs-fields">{field('cost_price','Cost ₹ · private','number')}{field('mrp','Selling price ₹','number')}</div><label className="cs-check"><input type="checkbox" checked={!!d.pricingApproved} onChange={e=>change('pricingApproved',e.target.checked)}/>Prices checked</label><label className="cs-check"><input type="checkbox" checked={!!d.allLocations} onChange={e=>change('allLocations',e.target.checked)}/>All locations counted</label><label className="cs-check"><input type="checkbox" checked={!!d.stockConfirmed} onChange={e=>change('stockConfirmed',e.target.checked)}/>Stock is with Decorbeats and ready to fulfil</label>{d.locationPhoto?.url&&<details><summary>Storage photo</summary><img className="cs-reference" src={d.locationPhoto.url} alt="Storage location"/></details>}</section>
  <section className="cs-panel"><h2>Ready to publish?</h2><p>{draft.product_id?'Updates the matched product.':d.destination==='new'?'Creates a new product.':'Choose a matching product above, or select new product.'}</p>{draft.product_id&&<button type="button" disabled={dirty||busy} onClick={onCompare}>Compare current inventory</button>}{issues.length>0&&<details><summary>{issues.length} items to finish</summary><ul>{issues.map(x=><li key={x}>{x}</li>)}</ul></details>}</section>
  {dimModalOpen && (
   <div className="cs-modal-backdrop" onClick={()=>setDimModalOpen(false)}>
    <section role="dialog" aria-modal="true" aria-labelledby="cs-dim-modal-title" className="cs-modal cs-dim-modal" onClick={e=>e.stopPropagation()}>
     <div className="cs-dim-modal-header">
      <h2 id="cs-dim-modal-title">📐 Product Dimensions & Ruler Guide</h2>
      <button type="button" className="cs-btn-close-modal" onClick={()=>setDimModalOpen(false)}>✕</button>
     </div>
     <p className="cs-dim-modal-desc">Creates an Amazon/marketplace-ready scale photo with an <strong>architectural measurement ruler above the product</strong>, height caliper markings on the side, and dual metric (cm) + imperial (inches) specifications.</p>
     <div className="cs-dim-modal-grid">
      <label className="cs-field">
       <span>Height (cm) *</span>
       <input type="number" min="0" step="any" value={dimForm.height} placeholder="e.g. 18" onChange={e=>setDimForm(prev=>({...prev,height:e.target.value}))} autoFocus/>
       {dimForm.height>0&&<small className="cs-dim-inch-hint">≈ {(Number(dimForm.height)/2.54).toFixed(1)} inches</small>}
      </label>
      <label className="cs-field">
       <span>Width (cm)</span>
       <input type="number" min="0" step="any" value={dimForm.width} placeholder="Auto-calculated if blank" onChange={e=>setDimForm(prev=>({...prev,width:e.target.value}))}/>
       {dimForm.width>0&&<small className="cs-dim-inch-hint">≈ {(Number(dimForm.width)/2.54).toFixed(1)} inches</small>}
      </label>
      <label className="cs-field">
       <span>Depth / Base (cm, optional)</span>
       <input type="number" min="0" step="any" value={dimForm.length} placeholder="e.g. 9" onChange={e=>setDimForm(prev=>({...prev,length:e.target.value}))}/>
       {dimForm.length>0&&<small className="cs-dim-inch-hint">≈ {(Number(dimForm.length)/2.54).toFixed(1)} inches</small>}
      </label>
      <label className="cs-field">
       <span>Net Weight (g, optional)</span>
       <input type="number" min="0" step="1" value={dimForm.weight_g} placeholder="e.g. 1450" onChange={e=>setDimForm(prev=>({...prev,weight_g:e.target.value}))}/>
       {dimForm.weight_g>=1000&&<small className="cs-dim-inch-hint">≈ {(Number(dimForm.weight_g)/1000).toFixed(2)} kg</small>}
      </label>
     </div>
     <div className="cs-dim-feature-list">
      <div>✓ <strong>Ruler Above Product</strong>: Millimeter & centimeter tick marks spanning product width</div>
      <div>✓ <strong>Height Caliper</strong>: Precision vertical dimension line with arrowheads</div>
      <div>✓ <strong>Dual Units</strong>: Displays both centimeters and inches for Indian & global NRI buyers</div>
      <div>✓ <strong>Pure Studio White</strong>: Clean background with grounding contact shadow</div>
     </div>
     <div className="cs-dim-modal-actions">
      <button type="button" disabled={busy} onClick={()=>setDimModalOpen(false)}>Cancel</button>
      <button type="button" className="cs-primary" disabled={busy||(!dimForm.height&&!dimForm.width&&!d.height&&!d.width)} onClick={async()=>{setDimModalOpen(false);await onAddDimensionsPhoto?.(dimForm);}}>
       {busy?'Rendering Ruler Guide…':'✨ Generate Ruler Guide Photo'}
      </button>
     </div>
    </section>
   </div>
  )}
 </div>;
}
