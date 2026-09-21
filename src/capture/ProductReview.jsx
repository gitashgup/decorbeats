import React,{useRef,useState} from 'react';
import ReviewGallery from './ReviewGallery';
import ProductPicker from './ProductPicker';
import {downloadListing,listingText} from './listingExport';
import {productVideoEntries} from './reviewVideos';

export default function ProductReview({draft,change,onInspect,onPhotos,onUploadEdited,onUploadVideos,onGenerate,onAutoEnrich,onStageLifestyle,busy,issues,onMatch,products,search,setSearch,onCompare,dirty}){
 const editedInput=useRef(null);
 const videoInput=useRef(null);
 const d=draft.data;const [exporting,setExporting]=useState(false),[notice,setNotice]=useState('');
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
     <button type="button" className="cs-primary cs-btn-auto-enrich" disabled={busy||draft.status==='published'||!hasPhotos} onClick={onAutoEnrich}>
      {busy?'Studying photos & market…':'✨ Auto-Enrich from Photos'}
     </button>
    </div>
   </div>
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
  <section className="cs-panel"><h2>{draft.product_id?'✓ Matched to inventory':'Find this product in inventory'}</h2>{draft.product_id?<p>{d.name} · {d.sku}</p>:<><p>Search a keyword. Tap the matching photo.</p><ProductPicker visual busy={busy} onSelect={onMatch}/><button type="button" disabled={busy} aria-pressed={d.destination==='new'} onClick={()=>change('destination','new')}>{d.destination==='new'?'New product selected ✓':'Not in inventory? Create new product'}</button></>}</section>
  <section className="cs-panel cs-export-bar"><div><h2>Product review</h2><p>Check the photos and facts. Save, export or publish.</p></div><div className="cs-row-actions"><button type="button" disabled={exporting} onClick={download}>{exporting?'Preparing…':'Download photos + details ↓'}</button><a className="cs-external-link" href="https://sellercentral.amazon.in/product-search" target="_blank" rel="noopener noreferrer">Open Seller Central ↗</a></div>{notice&&<p role="status">{notice}</p>}</section>
  <div className="cs-review-columns"><section className="cs-panel"><div className="cs-section-heading"><h2>1. Photos</h2><button type="button" onClick={onPhotos}>Replace / add</button></div><ReviewGallery key={draft.id} photos={d.photos} onInspect={onInspect}/><div className="cs-lifestyle-staging"><div className="cs-lifestyle-heading"><h3>✨ In-Situ Lifestyle Staging</h3><p>Generate authentic Indian home and mandir settings featuring this piece.</p></div><div className="cs-row-actions cs-lifestyle-buttons"><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onStageLifestyle('pooja_mandir')}>🪔 Pooja Mandir</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onStageLifestyle('living_room')}>🛋️ Living Room</button><button type="button" disabled={busy||draft.status==='published'||!d.photos?.hero?.url} onClick={()=>onStageLifestyle('festive_diwali')}>✨ Festive Diwali</button></div></div><p className="cs-caption">Check: sharp detail · enough light · full product · clean background.</p>{Object.entries(d.photos||{}).filter(([,p])=>p.warning).map(([key,p])=><p key={key} className="cs-warning">{key}: {p.warning}</p>)}<label className="cs-check"><input type="checkbox" checked={!!d.imageQualityApproved} onChange={e=>change('imageQualityApproved',e.target.checked)}/>Photos checked</label>{d.video?.url&&<details><summary>360° video</summary><video src={d.video.url} controls playsInline preload="none" style={{width:'100%'}}/></details>}<label className="cs-check"><input type="checkbox" checked={!!d.keepExistingPhotos} onChange={e=>change('keepExistingPhotos',e.target.checked)}/>Keep existing website photos too</label></section>
  <section className="cs-panel"><h2>2. Name & description</h2>{field('name','Product name')}<div className="cs-fields">{field('category','Category')}{field('material','Material')}{field('unit','What is included?')}</div><label className="cs-field"><span>Description</span><textarea rows="5" value={d.notes||''} onChange={e=>change('notes',e.target.value)} placeholder="Describe this exact product. You can paste reviewed Amazon or Canva copy here."/></label><label className="cs-field"><span>Highlights · one per line</span><textarea rows="3" value={(d.marketing?.highlights||[]).join('\n')} onChange={e=>change('marketing',{...d.marketing,highlights:e.target.value.split('\n')})}/></label><details><summary>Writing help & Amazon reference</summary><button type="button" disabled={busy||!Object.keys(d.photos||{}).length} onClick={onGenerate}>Draft description with AI</button><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(listingText(d));setNotice('Product details copied.');}catch{setNotice('Copy unavailable. Use Download photos + details.');}}}>Copy details for Amazon AI</button><p>Review AI text before saving. ZIP includes JPG photos, originals and details; unzip before uploading.</p>{field('asin','Existing Amazon ASIN')}{field('sellerSku','Amazon seller SKU')}</details></section></div>
  <section className="cs-panel"><h2>3. Measurements</h2><div className="cs-measure-grid">{[['Product',''],['With packaging','packed_']].map(([label,prefix])=><div key={label}><h3>{label}</h3><div className="cs-fields">{[['length','Length · cm'],['width','Width · cm'],['height','Height · cm'],['weight_g','Weight · g']].map(([key,label])=>field(prefix+key,label,'number'))}</div></div>)}</div></section>
  <section className="cs-panel"><h2>4. Stock & price</h2>{(d.locations||[]).map((loc,i)=><div className="cs-fields" key={i}>{[['name','Location'],['sellable','Sellable quantity'],['damaged','Damaged quantity']].map(([key,label])=><label className="cs-field" key={key}><span>{label}</span><input type={key==='name'?'text':'number'} min="0" step="1" value={loc[key]??''} onChange={e=>change('locations',d.locations.map((x,j)=>j===i?{...x,[key]:e.target.value}:x))}/></label>)}</div>)}<div className="cs-fields">{field('cost_price','Cost ₹ · private','number')}{field('mrp','Selling price ₹','number')}</div><label className="cs-check"><input type="checkbox" checked={!!d.pricingApproved} onChange={e=>change('pricingApproved',e.target.checked)}/>Prices checked</label><label className="cs-check"><input type="checkbox" checked={!!d.allLocations} onChange={e=>change('allLocations',e.target.checked)}/>All locations counted</label><label className="cs-check"><input type="checkbox" checked={!!d.stockConfirmed} onChange={e=>change('stockConfirmed',e.target.checked)}/>Stock is with Decorbeats and ready to fulfil</label>{d.locationPhoto?.url&&<details><summary>Storage photo</summary><img className="cs-reference" src={d.locationPhoto.url} alt="Storage location"/></details>}</section>
  <section className="cs-panel"><h2>Ready to publish?</h2><p>{draft.product_id?'Updates the matched product.':d.destination==='new'?'Creates a new product.':'Choose a matching product above, or select new product.'}</p>{draft.product_id&&<button type="button" disabled={dirty||busy} onClick={onCompare}>Compare current inventory</button>}{issues.length>0&&<details><summary>{issues.length} items to finish</summary><ul>{issues.map(x=><li key={x}>{x}</li>)}</ul></details>}</section>
 </div>;
}
