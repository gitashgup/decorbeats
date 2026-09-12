import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SHOTS, STEPS, captureStepOrder, nextCaptureStep, countTotal, newDraft, readiness, snapshot } from './model';
import { uploadPhoto, uploadVideo } from './media';
import './capture.css';
import ReviewGallery from './ReviewGallery';
import ReviewTable from './ReviewTable';
import ProductReview from './ProductReview';
import CameraCapture from './CameraCapture';
import PhoneCapture from './PhoneCapture';
import { mergeCaptureDraft, sameValue, updateSharedDraft } from './sharedDraft';

const categories = ['Bell','Bowl','Box','Decor','Diya','Idol','Jars','Misc','Planter','Plate','Tree','Urli','Wall Decor'];
const materials = ['Brass','Metal','Ceramic','Wood','Glass','Clay','Mixed','Other'];
const money = value => value === '' || value == null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`;
function Field({ label, value, onChange, type='text', ...props }) {
  return <label className="cs-field"><span>{label}</span><input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} {...props}/></label>;
}
function Select({ label, value, values, onChange }) {
  return <label className="cs-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{values.map(v=><option key={v} value={v}>{v || 'Choose…'}</option>)}</select></label>;
}

export default function CaptureApp() {
  const [session,setSession] = useState(null), [authReady,setAuthReady] = useState(false);
  const [allowed,setAllowed] = useState(false), [email,setEmail] = useState(''), [password,setPassword] = useState('');
  const [products,setProducts] = useState([]), [drafts,setDrafts] = useState([]), [draft,setDraft] = useState(null);
  const [search,setSearch] = useState(''), [queue,setQueue] = useState(()=>['pricing','review','drafts','published'].includes(new URLSearchParams(window.location.search).get('view'))?new URLSearchParams(window.location.search).get('view'):window.location.pathname.replace(/\/+$/, '')==='/admin'?'review':'capture'), [location,setLocation] = useState('');
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [error,setError] = useState('');
  const [dirty,setDirty] = useState(false), [step,setStep] = useState(0), [shot,setShot] = useState('hero');
  const [pair,setPair] = useState(false), [guide,setGuide] = useState(false), [confirm,setConfirm] = useState(false);
  const [assetPreview,setAssetPreview] = useState(null);
  const [liveComparison,setLiveComparison] = useState(null);
  const [cameraOpen,setCameraOpen] = useState(false);
  const [syncStatus,setSyncStatus] = useState('');
  const phoneMode = new URLSearchParams(window.location.search).get('phone')==='1';
  const savedBase=useRef(null), currentDraft=useRef(null);
  currentDraft.current=draft;
  const fileRef=useRef(null), cameraRef=useRef(null), videoRef=useRef(null), cleanedRef=useRef(null), mounted=useRef(true), inFlight=useRef(false);
  const phoneCamera = /iPhone|iPad|Android/i.test(navigator.userAgent);

  useEffect(()=>{
    document.title='Capture Studio | Decorbeats';
    mounted.current=true;
    if (!supabase) { setError('Capture is not connected to the inventory. Please contact the administrator.'); setAuthReady(true); return; }
    supabase.auth.getSession().then(({data})=>{if(mounted.current){setSession(data.session);setAuthReady(true);}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setAuthReady(true);});
    return ()=>{mounted.current=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(!session){setAllowed(false);setProducts([]);setDrafts([]);setDraft(null);return;}
    let active=true;
    supabase.rpc('is_decorbeats_admin').then(async ({data,error})=>{
      if(!active)return;
      if(error||!data){setError('This account does not have Decorbeats admin access.');return;}
      setAllowed(true);await refresh();
    });
    return ()=>{active=false;};
  },[session?.user?.id]);

  useEffect(()=>{
    const warn=e=>{if(dirty||inFlight.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  useEffect(()=>{setConfirm(false);},[draft?.revision,dirty]);
  useEffect(()=>{
    if(!allowed||phoneMode||!draft?.revision||draft.status!=='draft')return;
    let active=true, reading=false;
    async function sync(){
      if(reading||inFlight.current||document.hidden)return;
      reading=true;
      try{
        const {data:remote,error}=await supabase.from('capture_drafts').select('*').eq('id',draft.id).single();
        if(error)throw error;
        if(!active||inFlight.current||currentDraft.current?.id!==remote.id)return;
        if(remote.revision!==savedBase.current?.revision){
          const merged=mergeCaptureDraft(currentDraft.current,savedBase.current,remote);
          savedBase.current=remote;setDraft(merged);setDirty(!sameValue(merged.data,remote.data));
          setDrafts(old=>[remote,...old.filter(x=>x.id!==remote.id)]);
        }
        const recent=Date.now()-Date.parse(remote.data.phoneLastSeenAt||'')<45000;
        setSyncStatus(recent?'Phone connected · photos update automatically':'Watching this draft · connect your iPhone');
      }catch(e){if(active)setSyncStatus(`Sync paused: ${e.message}`);}
      finally{reading=false;}
    }
    sync();const timer=setInterval(sync,3000);
    return()=>{active=false;clearInterval(timer);};
  },[allowed,phoneMode,draft?.id,!!draft?.revision,draft?.status]);
  const pairUrl = `${window.location.origin}/admin/capture${draft?.revision ? `?draft=${draft.id}&phone=1` : ''}`;

  async function refresh(openFromUrl=true){
    const [p,d]=await Promise.all([
      supabase.from('products').select('*').is('archived_at',null).order('name'),
      supabase.from('capture_drafts').select('*').order('updated_at',{ascending:false}).limit(500)
    ]);
    if(p.error||d.error){setError(d.error ? 'The capture workspace is not ready yet. Your existing inventory has not changed.' : p.error.message);return;}
    setProducts(p.data);setDrafts(d.data);
    if(openFromUrl){const id=new URLSearchParams(window.location.search).get('draft'); const found=d.data.find(x=>x.id===id);if(found)open(found);}
  }
  async function run(fn){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError('');
    try{return await fn();}catch(e){setError(e.message||'Could not save. Please retry.');return null;}
    finally{inFlight.current=false;setBusy(false);}
  }
  function open(item){savedBase.current=item;setDraft(item);setStep(item.status==='published'?3:Number(item.data.step??1));setShot('hero');setDirty(false);setMessage('');setConfirm(false);history.replaceState(null,'',`/admin/capture?draft=${item.id}${phoneMode?'&phone=1':''}`);}
  function change(key,value){setDraft(x=>({...x,data:{...x.data,[key]:value,...(key==='locations'?{allLocations:false,stockConfirmed:false}:{}),...(['mrp','cost_price','b2b_price'].includes(key)?{pricingApproved:false}:{})}}));setDirty(true);setMessage('');}
  function start(product){
    const existing=drafts.find(d=>d.status==='draft'&&d.product_id===product?.id&&product);
    if(existing){open(existing);return;}
    const fresh=newDraft(product,location);savedBase.current=fresh;setDraft(fresh);setStep(1);setShot('hero');setDirty(true);setMessage('');history.replaceState(null,'','/admin/capture');
  }
  async function startOnPhone(product){
    const existing=drafts.find(d=>d.status==='draft'&&d.product_id===product?.id&&product);
    if(existing){open(existing);return;}
    await run(async()=>{
      const fresh=newDraft(product,location);
      savedBase.current=fresh;
      setDraft(fresh);setStep(1);setShot('hero');setDirty(true);setMessage('');
      await persist(fresh,1);
    });
  }
  async function persist(candidate=draft,nextStep=step){
    let data;
    if(candidate.revision){
      const base=savedBase.current, local={...candidate,data:{...candidate.data,step:nextStep}};
      data=await updateSharedDraft(supabase,candidate.id,remote=>mergeCaptureDraft(local,base,remote));
    }else{
      const result=await supabase.rpc('save_capture_draft_v1',{p_id:candidate.id,p_revision:0,p_product_id:candidate.product_id,p_data:{...candidate.data,step:nextStep}});
      if(result.error)throw new Error(result.error.code==='23505'?'A saved draft already exists for this product. Go back and refresh the list.':result.error.message);
      data=result.data;
    }
    savedBase.current=data;
    setDraft(data);setDirty(false);setDrafts(old=>[data,...old.filter(x=>x.id!==data.id)]);if(data.data.locations?.[0]?.name)setLocation(data.data.locations[0].name);
    history.replaceState(null,'',`/admin/capture?draft=${data.id}${phoneMode?'&phone=1':''}`);setMessage('Saved to Decorbeats');return data;
  }
  async function save(next=false){await run(async()=>{await persist();if(next)exit();});}
  async function deleteWork(item){
    if(!window.confirm(`Delete capture work for ${item.data.name||'this product'}? Website stock and listing will stay unchanged. This cannot be undone.`))return;
    await run(async()=>{
      if(item.revision){const {error}=await supabase.rpc('delete_capture_draft_v1',{p_id:item.id,p_revision:item.revision});if(error)throw error;}
      setDrafts(old=>old.filter(x=>x.id!==item.id));if(draft?.id===item.id)exit();setMessage('Capture work deleted. Website inventory unchanged.');
    });
  }
  function exit(){setDraft(null);setDirty(false);setStep(0);setConfirm(false);history.replaceState(null,'','/admin/capture');}
  async function capture(file,video=false){
    if(!file)return;
    return await run(async()=>{
      let saved=draft;
      if(dirty||!draft.revision)saved=await persist();
      const asset=video?await uploadVideo(saved.id,file,setMessage):await uploadPhoto(saved.id,shot,file,setMessage);
      const next={...saved,data:{...saved.data,...(video?{video:asset}:{photos:{...saved.data.photos,[shot]:asset}})}};
      setDraft(next);setDirty(true);
      await persist(next);
      if(!video){const remaining=SHOTS.find(s=>!next.data.photos[s.id]);if(remaining)setShot(remaining.id);}
      setMessage(video?'360° video saved':'Photo saved · original preserved');
      return true;
    });
  }
  async function addCleanedPreview(file) {
    if (!file || !draft.data.photos?.[shot]) return;
    await run(async () => {
      const saved = dirty ? await persist() : draft;
      const sample = await uploadPhoto(saved.id, `${shot}-sample`, file, setMessage);
      await persist({...saved, data: {...saved.data, photos: {...saved.data.photos,
        [shot]: {...saved.data.photos[shot], cleanedPreview: sample}}}});
      setMessage('Cleaned sample saved for comparison only. Original website selection unchanged.');
    });
  }
  async function generateListing(){
    await run(async()=>{
      const current=dirty?await persist():draft;
      setMessage('AI is studying the product and preparing the listing…');
      const {data:{session:activeSession}}=await supabase.auth.getSession();
      const response=await fetch('/api/generate-product-listing',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${activeSession?.access_token||''}`},body:JSON.stringify({facts:{name:current.data.name,category:current.data.category,material:current.data.material,unit:current.data.unit,sizeCm:{length:current.data.length,width:current.data.width,height:current.data.height},weightG:current.data.weight_g,price:current.data.mrp},imageUrls:Object.values(current.data.photos||{}).map(x=>x?.url).filter(Boolean)})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Could not create listing');
      const next={...current,data:{...current.data,name:payload.listing.title||current.data.name,notes:payload.listing.description||current.data.notes,marketing:payload.listing,aiGeneratedAt:new Date().toISOString()}};
      setDraft(next);setDirty(true);await persist(next,3);setMessage('Smart listing created. Review every claim before publishing.');
    });
  }
  async function enhancePhoto(photoKey){
    await run(async()=>{
      const current=dirty?await persist():draft, source=current.data.photos?.[photoKey];
      if(!source?.url)throw new Error('Choose a captured photo first');
      setMessage(`AI is cleaning the ${photoKey} photo while preserving the exact product…`);
      const {data:{session:activeSession}}=await supabase.auth.getSession();
      const response=await fetch('/api/enhance-product-image',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${activeSession?.access_token||''}`},body:JSON.stringify({imageUrl:source.url,productName:current.data.name})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Could not enhance image');
      const bytes=Uint8Array.from(atob(payload.image),c=>c.charCodeAt(0));
      const file=new File([bytes],`${photoKey}-ai.png`,{type:payload.mime||'image/png'});
      const enhanced=await uploadPhoto(current.id,`${photoKey}-ai`,file,setMessage);
      const next={...current,data:{...current.data,photos:{...current.data.photos,[photoKey]:{...enhanced,originalCapture:source,aiEnhanced:true}}}};
      setDraft(next);setDirty(true);await persist(next,3);setMessage('Enhanced image saved. The original capture is preserved for comparison.');
    });
  }
  useEffect(()=>{
    const handle=e=>enhancePhoto(e.detail);
    window.addEventListener('decorbeats-enhance-photo',handle);
    return()=>window.removeEventListener('decorbeats-enhance-photo',handle);
  },[draft?.id,draft?.revision,dirty]);
  const visibleProducts=useMemo(()=>products.filter(p=>[p.name,p.sku,p.category].some(x=>String(x||'').toLowerCase().includes(search.toLowerCase()))),[products,search]);
  const pending=drafts.filter(d=>d.status==='draft');
  const readyForReview=pending.filter(x=>x.data.reviewStatus==='submitted');
  const workingDrafts=pending.filter(x=>x.data.reviewStatus!=='submitted');
  const completed=drafts.filter(d=>d.status==='published');
  const awaitingPricing=pending.filter(x=>!x.data.pricingApproved);
  const withPhotos=pending.filter(x=>Object.keys(x.data.photos||{}).length>0);
  const withCounts=pending.filter(x=>countTotal(x.data)>0);
  const withVideo=pending.filter(x=>Boolean(x.data.video));
  const sectionNames=[...new Set(drafts.flatMap(x=>(x.data.locations||[]).map(l=>String(l.name||'').trim())).filter(Boolean))];
  const lastSessionDate=drafts[0]?.updated_at ? new Date(drafts[0].updated_at).toLocaleDateString('en-IN') : '';
  const lastSession=drafts.filter(x=>lastSessionDate&&new Date(x.updated_at).toLocaleDateString('en-IN')===lastSessionDate);
  const lastSessionUnits=lastSession.reduce((total,x)=>total+countTotal(x.data),0);
  const lastSessionPhotos=lastSession.reduce((total,x)=>total+Object.keys(x.data.photos||{}).length,0);
  const d=draft?.data, issues=draft?readiness(draft):[];
  const published=draft?.status==='published';
  const selectedShot=SHOTS.find(s=>s.id===shot);
  async function publish(){await run(async()=>{
    const current=dirty?await persist():draft;
    const {data,error}=await supabase.rpc('publish_capture_draft_v1',{p_id:current.id,p_revision:current.revision});
    if(error)throw error;
    setDraft(data);setDirty(false);setConfirm(false);setMessage('Published. Photos, details and reconciled stock are saved.');await refresh(false);
  });}

  return <div className={`cs ${phoneMode?'cs-phone-mode':''} ${draft&&step===3&&!phoneMode?'cs-review-mode':''}`}>
    <header className="cs-header"><a href="/admin" className="cs-brand"><img src="/assets/brand/decorbeats-logo.svg" alt=""/><span>DECORBEATS<small>Capture studio</small></span></a>
      <div className="cs-header-actions"><button onClick={()=>setGuide(!guide)}>Setup guide</button>{allowed&&!phoneMode&&<button disabled={busy} onClick={()=>run(async()=>{if(draft&&(dirty||!draft.revision))await persist();setCameraOpen(false);setPair(!pair);})}>Connect iPhone ↗</button>}{!!draft?.revision&&!published&&!phoneMode&&<button disabled={dirty||busy} onClick={()=>run(async()=>{const {data,error}=await supabase.from('capture_drafts').select('*').eq('id',draft.id).single();if(error)throw error;open(data);setMessage('Latest saved version loaded');})}>Refresh from phone</button>}<a href="/admin/capture">Inventory ↗</a>{!phoneMode&&<><a href="/admin">Review</a><a href="/admin?view=pricing">Megha · Prices</a><a href="/admin?legacy=1">Sales & older tools</a></>}</div>
    </header>
    <main className="cs-main">
      {error&&<div role="alert" className="cs-alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
      {message&&!phoneMode&&<div role="status" className="cs-notice">{message}</div>}
      {!phoneMode&&draft?.revision>0&&<p role="status" className="cs-sync-status">{syncStatus||'Watching this draft…'}{d?.lastPhonePhotoAt&&<> · Last phone photo {new Date(d.lastPhonePhotoAt).toLocaleTimeString()}</>}</p>}
      {guide&&<section className="cs-guide"><h2>Your photo station</h2><ol><li>Use the white lightbox backdrop. Clean the product and your camera lens.</li><li>Use the rear 1× camera. Turn off flash and filters. Tap the brass to focus; lower exposure if highlights look white.</li><li>For turntable video: 1080p, 30 fps, Most Compatible / H.264. Hold the phone still for one complete turn, ideally 10–20 seconds.</li><li>For cable import: unlock the iPhone, trust this Mac, open Image Capture, select only this product’s files and import to a folder. Choose those files here.</li><li>Or open this capture page on your iPhone and upload directly. Both devices use your Decorbeats login.</li></ol><p>A website cannot read the connected iPhone’s camera roll automatically. You choose the files to import.</p></section>}
      {pair&&<section className="cs-pair"><div><h2>Photograph on your iPhone</h2>{draft?.revision?<><p>Open this same page on your phone, tap Camera, sign in, then shoot. New photos land in this draft as you save.</p><p>Use Camera for each required shot, then return to this screen.</p><a href={pairUrl}>{pairUrl}</a><button onClick={()=>run(async()=>{await navigator.clipboard.writeText(pairUrl);setMessage('Phone camera link copied');})}>Copy phone link</button></>:<p>Choose or start a product first to link the phone to its draft.</p>}<button onClick={()=>setPair(false)}>Close</button></div></section>}
      {!authReady?<p>Opening capture studio…</p>:!allowed?<section className="cs-login"><p className="cs-eyebrow">Your photography station</p><h1>One product.<br/>Everything together.</h1><p>Match the inventory, capture photographs and a full turn, then count, measure and save.</p><div className="cs-login-steps">01 Match <span>→</span> 02 Capture <span>→</span> 03 Measure <span>→</span> 04 Review</div>
        {session?<p>Checking access for {session.user.email}…</p>:<form onSubmit={e=>{e.preventDefault();run(async()=>{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setPassword('');});}}>
          <Field label="Admin email" value={email} onChange={setEmail} type="email" required autoComplete="username"/>
          <Field label="Password" value={password} onChange={setPassword} type="password" required autoComplete="current-password"/>
          <button className="cs-primary" disabled={busy||!supabase}>{busy?'Signing in…':'Open capture studio →'}</button>
        </form>}
      </section>:phoneMode&&draft?<PhoneCapture key={draft.id} initial={draft}/>:phoneMode?<PhoneStart products={products} drafts={drafts} search={search} setSearch={setSearch} busy={busy} onStart={startOnPhone}/>:!draft?<>
        <div className="cs-heading"><div><h1>{queue==='capture'?'Inventory photography':queue==='pricing'?'Megha · Prices':'Capture review'}</h1>{queue==='pricing'&&<p>Enter cost and selling price. Save each row.</p>}</div><button className="cs-primary" onClick={()=>start(null)}>+ New product</button></div>
        {queue==='capture'&&<><section className="cs-dashboard" aria-label="Capture progress">
          <button type="button" onClick={()=>setQueue('capture')}><span>Inventory</span><strong>{products.length}</strong><small>active products</small></button>
          <button type="button" onClick={()=>setQueue('drafts')}><span>In progress</span><strong>{workingDrafts.length}</strong><small>Pranav is working</small></button>
          <button type="button" className="cs-review-tile" onClick={()=>setQueue('review')}><span>Ready to review</span><strong>{readyForReview.length}</strong><small>check and publish</small></button>
          <button type="button" onClick={()=>setQueue('pricing')}><span>For Megha</span><strong>{awaitingPricing.length}</strong><small>need price approval</small></button>
          <button type="button" onClick={()=>setQueue('published')}><span>Completed</span><strong>{completed.length}</strong><small>published to website</small></button>
        </section>
        <section className="cs-next-action">
          <div><strong>Resume without guessing</strong><span>Current section: {location||'choose below before starting'}</span></div>
          <div><span>{sectionNames.length} sections recorded · {withVideo.length} turntable videos</span><button type="button" disabled={!workingDrafts.length} onClick={()=>workingDrafts[0]&&open(workingDrafts[0])}>{workingDrafts.length?'Continue saved work →':'No saved work'}</button></div>
        </section>
        <section className="cs-session-snapshot">
          <div><p className="cs-eyebrow">Last session · {lastSessionDate||'No work yet'}</p><strong>{lastSession.length} products, {lastSessionUnits} units and {lastSessionPhotos} photos were captured.</strong><span>{lastSession.length ? `${lastSession.filter(x=>x.status==='published').length} completed · ${lastSession.filter(x=>x.status==='draft').length} saved for follow-up.` : 'Your first capture will appear here automatically.'}</span></div>
          <div className="cs-section-picker"><span>Start in section</span><div>{[1,2,3,4].map(number=><button key={number} type="button" aria-pressed={location===`Section ${number}`} onClick={()=>setLocation(`Section ${number}`)}>{number}</button>)}</div></div>
        </section>
        <section className="cs-activity-log" aria-label="Recent capture log">
          <div className="cs-section-heading"><h2>Recent work</h2><span>Newest first</span></div>
          <ol>{drafts.slice(0,5).map(x=>{const place=x.data.locations?.find(l=>l.name)?.name;return <li key={x.id}><span><strong>{x.data.name||'Unnamed new product'}</strong><small>{place||'Section not recorded'}</small></span><span>{Object.keys(x.data.photos||{}).length} photos · {countTotal(x.data)} units</span><time dateTime={x.updated_at}>{new Date(x.updated_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</time></li>})}</ol>
        </section>
        </>}
        <section className="cs-toolbar">{queue==='capture'&&<Field label="Working location / section" value={location} onChange={setLocation} placeholder="e.g. Section 1 · Rack A"/>}<Field label="Find product" value={search} onChange={setSearch} placeholder="Name or SKU"/><button disabled={busy} onClick={()=>run(()=>refresh(false))}>↻ Refresh</button></section>
        <div className="cs-tabs" role="tablist" aria-label="Capture queues">{[['capture',`Inventory · ${products.length}`],['drafts',`In progress · ${workingDrafts.length}`],['review',`Review · ${readyForReview.length}`],['pricing',`For Megha · ${awaitingPricing.length}`],['published',`Completed · ${completed.length}`]].map(([key,title])=><button key={key} role="tab" aria-selected={queue===key} className={queue===key?'active':''} onClick={()=>setQueue(key)}>{title}</button>)}</div>
        {queue==='capture'?<div className="cs-product-grid">{visibleProducts.map(p=>{const saved=pending.find(x=>x.product_id===p.id);return <button className="cs-product" key={p.id} onClick={()=>start(p)}><img src={p.image_url||'/assets/images/product-fallback.svg'} alt="" loading="lazy"/><div><small>{p.sku}</small><h3>{p.name}</h3><p>{p.material} · {p.quantity} in system</p><span>{saved?'Continue draft →':'Match & capture →'}</span></div></button>;})}{!visibleProducts.length&&<p>No matching products. Use “New product” if this is a new size, finish or set.</p>}</div>:<ReviewTable rows={drafts.filter(x=>queue==='published'?x.status==='published':queue==='review'?x.status==='draft'&&x.data.reviewStatus==='submitted':queue==='drafts'?x.status==='draft'&&x.data.reviewStatus!=='submitted':x.status==='draft').filter(x=>[x.data.name,x.data.sku].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())))} busy={busy} onSaved={saved=>setDrafts(old=>old.map(x=>x.id===saved.id?saved:x))} onOpen={x=>{open(x);if(queue==='pricing'||queue==='review')setStep(3);}} onDelete={deleteWork}/> }
      </>:<>
        <div className="cs-heading"><div><button className="cs-back" disabled={busy} onClick={()=>dirty?save(true):exit()}>← {dirty?'Save & return to products':'Products'}</button><h1>{d.name||'New product'}</h1><p>{d.sku||'A permanent SKU is assigned when published'} <span className="cs-pill">{published?'Published':dirty?'Unsaved changes':'Saved draft'}</span></p></div><div className="cs-current">System stock<strong>{draft.baseline?.quantity??'New'}</strong></div></div>
        <nav className="cs-stepper" aria-label="Capture steps">{captureStepOrder(draft).map((id,index)=><button key={id} className={step===id?'active':''} aria-current={step===id?'step':undefined} disabled={busy} onClick={()=>setStep(id)}><span>{index+1}</span>{!draft.product_id&&id===0?'Name & details':STEPS[id]}</button>)}</nav>
        <fieldset className="cs-editor" disabled={busy||published}>
        {step===0&&<section className="cs-panel"><h2>Confirm the exact product</h2>{!draft.product_id?<><p>Your photo stays saved while you add details. Photo naming is not automatic yet: ask your assistant for a suggestion, then edit and confirm the name here.</p>{d.photos?.hero&&<img className="cs-reference" src={d.photos.hero.url} alt="Saved main photo for naming"/>}</>:<p>Different size, finish or pieces per set? Return to products and create a separate item.</p>}<div className="cs-fields"><Field label={draft.product_id?'Product name':'Suggested product name · edit and confirm'} value={d.name} onChange={v=>change('name',v)}/><Field label="One sellable unit contains" value={d.unit} onChange={v=>change('unit',v)} placeholder="e.g. Set of 2 diyas"/><Select label="Category" value={d.category} values={categories.includes(d.category)?categories:[d.category,...categories]} onChange={v=>change('category',v)}/><Select label="Material" value={d.material} values={materials.includes(d.material)?materials:[d.material,...materials]} onChange={v=>change('material',v)}/></div>{draft.baseline?.image_url&&<img className="cs-reference" src={draft.baseline.image_url} alt="Existing website reference"/>}</section>}
        {step===1&&<div className={`cs-shoot-layout ${!draft.product_id?'cs-photo-first':''}`}><section className="cs-panel"><div className="cs-section-heading"><h2>Photographs</h2><span>{SHOTS.filter(s=>d.photos?.[s.id]).length} / 5</span></div><div className="cs-shots">{SHOTS.map((s,i)=><button key={s.id} type="button" onClick={()=>setShot(s.id)} className={shot===s.id?'active':''}>{d.photos?.[s.id]?<img src={d.photos[s.id].url} alt=""/>:<span className="cs-shot-number">0{i+1}</span>}<span>{s.name}<small>{d.photos?.[s.id]?'Saved ✓':i===4?'Optional':'Required'}</small></span></button>)}</div></section>
          <section className="cs-panel cs-shoot"><p className="cs-eyebrow">{SHOTS.findIndex(s=>s.id===shot)+1} · {selectedShot.name}</p><h2>{!draft.product_id&&!d.photos?.hero?'Photograph the product first':selectedShot.tip}</h2>{!draft.product_id&&!d.photos?.hero&&<p>No name needed yet. Start with one clear photo; add the details afterwards.</p>}<div className="cs-viewfinder">{d.photos?.[shot]?<img src={d.photos[shot].url} alt={selectedShot.name}/>:<div><span className="cs-camera-icon">◎</span><p>White backdrop · rear 1× camera</p><small>Keep the full product inside the frame</small></div>}</div>{d.photos?.[shot]?.warning&&<p className="cs-warning">{d.photos[shot].warning}</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{capture(e.target.files?.[0]);e.target.value='';}} hidden/>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>{capture(e.target.files?.[0]);e.target.value='';}}/>
          <button className="cs-primary cs-wide" type="button" onClick={()=>setCameraOpen(true)}>Take photo · live camera</button>
          <button className={`${phoneCamera?'':'cs-primary'} cs-wide`} type="button" onClick={()=>fileRef.current?.click()}>{d.photos?.[shot]?'Replace / import photo':'Import photo'} ↑</button>
          <p className="cs-caption">Take photo opens a live browser camera with a shutter. Choose your iPhone if Chrome exposes it. Import is a separate option for saved files.</p>
          <p className="cs-caption">1600 × 1600 website image · full product retained · original saved</p>
          {d.photos?.[shot]&&<><button type="button" onClick={()=>setAssetPreview(d.photos[shot])}>Inspect full photo</button><input ref={cleanedRef} type="file" accept="image/*" hidden onChange={e=>{addCleanedPreview(e.target.files?.[0]);e.target.value='';}}/><button type="button" onClick={()=>cleanedRef.current?.click()}>Add cleaned sample for review</button><p>Samples stay separate from your originals and are not published automatically.</p></>}
          </section>
          <section className="cs-panel cs-video"><div><p className="cs-eyebrow">Turntable · optional</p><h2>Give it one full turn.</h2><p>Hold the camera still. Centre the product. Record one rotation at 1080p / 30 fps, ideally 10–20 seconds.</p><small>Use Most Compatible / H.264 on iPhone. Up to 45 MB.</small></div>{d.video&&<video src={d.video.url} controls playsInline preload="metadata"/>}<input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mov" hidden onChange={e=>{capture(e.target.files?.[0],true);e.target.value='';}}/><button type="button" onClick={()=>videoRef.current?.click()}>{d.video?'Replace 360° video':'Add 360° video'} ↑</button></section>
        </div>}
        {step===2&&<><section className="cs-panel"><div className="cs-section-heading"><div><h2>Count this product</h2><p>Count complete sellable units. Add every place this same product is stored.</p></div><strong className="cs-count-total">{countTotal(d)}<small>sellable total</small></strong></div>
          {d.locations.map((l,i)=><div className="cs-location" key={i}><Field label="Room / rack / shelf" value={l.name} onChange={v=>change('locations',d.locations.map((x,j)=>j===i?{...x,name:v}:x))}/><Field label="Sellable units" type="number" min="0" step="1" inputMode="numeric" value={l.sellable} onChange={v=>change('locations',d.locations.map((x,j)=>j===i?{...x,sellable:v}:x))}/><Field label="Damaged / incomplete" type="number" min="0" step="1" inputMode="numeric" value={l.damaged} onChange={v=>change('locations',d.locations.map((x,j)=>j===i?{...x,damaged:v}:x))}/>{i>0&&<button type="button" aria-label={`Remove location ${i+1}`} onClick={()=>change('locations',d.locations.filter((_,j)=>j!==i))}>×</button>}</div>)}
          <button type="button" onClick={()=>change('locations',[...d.locations,{name:'',sellable:'',damaged:'0'}])}>+ Also stored somewhere else</button>
          {d.locationPhoto?.url&&<div className="cs-location-reference"><img src={d.locationPhoto.url} alt="Storage location reference"/><span>Storage location photo</span></div>}
          <label className="cs-check"><input type="checkbox" checked={d.allLocations} onChange={e=>change('allLocations',e.target.checked)}/>I have counted this product in all its locations.</label><label className="cs-check"><input type="checkbox" checked={d.stockConfirmed} onChange={e=>change('stockConfirmed',e.target.checked)}/>These sellable units are in Decorbeats’ control and ready for us to fulfil.</label>
        </section><section className="cs-panel"><h2>Measure once. Use everywhere.</h2><p>Use centimetres and grams. Measure the complete sellable unit.</p><div className="cs-measure-grid">{[['Product, without packaging',''],['Packed, ready to ship','packed_']].map(([label,prefix])=><div key={prefix}><h3>{label}</h3><div className="cs-fields">{[['length','Length (cm)'],['width','Width (cm)'],['height','Height (cm)'],['weight_g','Weight (g)']].map(([key,title])=><Field key={key} label={title} type="number" min="0.01" step="any" inputMode="decimal" value={d[prefix+key]} onChange={v=>change(prefix+key,v)}/>)}</div></div>)}</div></section></>}
        {step===3&&<ProductReview draft={draft} change={change} onInspect={setAssetPreview} onPhotos={()=>setStep(1)} onGenerate={generateListing} busy={busy} dirty={dirty} issues={issues} products={visibleProducts} search={search} setSearch={setSearch} onMatch={p=>{setDraft(x=>({...x,product_id:p.id,baseline:snapshot(p),data:{...x.data,name:p.name,category:p.category,material:p.material,destination:'existing'}}));setDirty(true);}} onCompare={()=>run(async()=>{const {data,error}=await supabase.from('products').select('*').eq('id',draft.product_id).single();if(error)throw error;setLiveComparison(data);})}/>}
        </fieldset>
        <footer className="cs-footer"><div><span className={`cs-save-dot ${dirty?'pending':''}`}/>{busy?'Saving…':published?'Published to website':dirty?'Changes waiting to save':'Saved to Decorbeats'}{dirty&&!published&&<button disabled={busy} onClick={()=>save(false)}>Save draft</button>}</div><div className="cs-footer-buttons">{published?<button className="cs-primary" onClick={exit}>Next product →</button>:<><button disabled={busy} onClick={()=>save(true)}>Save & next product</button>{step<3?<button className="cs-primary" disabled={busy} onClick={()=>run(async()=>{const next=nextCaptureStep(draft,step);await persist(draft,next);setStep(next);})}>{!draft.product_id&&step===1?'Save & add details →':'Save & continue →'}</button>:<button className="cs-primary" disabled={busy||issues.length>0} onClick={()=>setConfirm(true)}>Review & publish →</button>}</>}</div></footer>
        {confirm&&<div className="cs-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="cs-publish-title" className="cs-modal"><h2 id="cs-publish-title">Publish {d.name}?</h2><p>This sets website stock to <strong>{countTotal(d)} sellable units</strong>, changes the price to <strong>{money(d.mrp)}</strong>, and publishes the reviewed photos and details.</p><button disabled={busy} onClick={()=>setConfirm(false)}>Back to review</button><button disabled={busy} className="cs-primary" onClick={publish}>{busy?'Publishing…':'Confirm inventory & publish'}</button></section></div>}
      </>}
      {cameraOpen&&draft&&<CameraCapture key={draft.id} productName={d.name} shotName={selectedShot.name} guidance={selectedShot.tip} angleHint={selectedShot.angleHint} lightHint={selectedShot.lightHint} onUse={file=>capture(file)} onClose={()=>setCameraOpen(false)}/>}
      {assetPreview&&<div className="cs-modal-backdrop"><section role="dialog" aria-modal="true" aria-label="Inspect photo" className="cs-modal cs-photo-modal"><button onClick={()=>setAssetPreview(null)}>Close ×</button><img src={assetPreview.url} alt="Full processed photograph"/><p>{assetPreview.filename} · original {assetPreview.width} × {assetPreview.height}</p></section></div>}
      {liveComparison&&draft&&<div className="cs-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="cs-compare-title" className="cs-modal"><h2 id="cs-compare-title">Review the latest inventory</h2><p>System stock was {draft.baseline.quantity}; it is now <strong>{liveComparison.quantity}</strong>. Current website price: <strong>{money(liveComparison.mrp)}</strong>.</p><p>Your saved count is {countTotal(draft.data)}. Check the physical stock again if anything was sold or moved. Photos and measurements stay saved.</p><details><summary>See all current product details</summary><dl>{Object.entries(snapshot(liveComparison)).filter(([key])=>!['image_url','image_urls','video_urls'].includes(key)).map(([key,val])=><React.Fragment key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(val??'—')}</dd></React.Fragment>)}</dl></details><button onClick={()=>setLiveComparison(null)}>Cancel</button><button className="cs-primary" disabled={busy} onClick={()=>run(async()=>{const {data,error}=await supabase.rpc('refresh_capture_baseline_v1',{p_id:draft.id,p_revision:draft.revision,p_current:snapshot(liveComparison)});if(error)throw error;setDraft(data);setDirty(false);setStep(2);setLiveComparison(null);setMessage('Latest inventory reviewed. Recheck counts and reconfirm pricing.');})}>Reviewed · return to count</button></section></div>}
    </main>
  </div>;
}

function PhoneStart({products,drafts,search,setSearch,busy,onStart}){
  const term=search.trim().toLowerCase();
  const matches=products.filter(p=>!term||`${p.name} ${p.sku||''} ${p.category||''}`.toLowerCase().includes(term)).slice(0,18);
  return <section className="cs-phone-panel cs-phone-start">
    <header><span className="cs-phone-connected"><i/> Decorbeats</span><span>Pranav · हिंदी v3</span></header>
    <div className="cs-mobile-entry">
      <span>📦 शुरू करें</span>
      <h1>सामान चुनें</h1>
      <p>नाम लिखें या फोटो देखकर चुनें।</p>
      <label><b>नाम या कोड से खोजें</b><div><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Elephant, diya, SKU…"/></div></label>
      <button className="cs-primary cs-mobile-action" disabled={busy} onClick={()=>onStart(null)}>📷 नया सामान जोड़ें</button>
      <div className="cs-phone-product-list">
        {matches.map(p=>{const saved=drafts.find(d=>d.status==='draft'&&d.product_id===p.id);return <button type="button" key={p.id} disabled={busy} onClick={()=>onStart(p)}><img src={p.image_url||'/assets/images/product-fallback.svg'} alt=""/><span><strong>{p.name}</strong><small>{p.quantity||0} स्टॉक में{saved?' · सेव किया काम खोलें':''}</small></span><b>›</b></button>;})}
        {!matches.length&&<p className="cs-empty">सामान नहीं मिला। “नया सामान जोड़ें” दबाएँ।</p>}
      </div>
    </div>
  </section>;
}

function ListingPreview({data}){
  const m=data.marketing||{}, hero=data.photos?.hero?.url||Object.values(data.photos||{})[0]?.url;
  const askEnhance=key=>window.dispatchEvent(new CustomEvent('decorbeats-enhance-photo',{detail:key}));
  return <article className="cs-listing-preview"><div className="cs-listing-gallery"><span>WEBSITE PREVIEW</span>{hero&&<img src={hero} alt={m.imageAltText||data.name}/>}<div>{Object.entries(data.photos||{}).slice(0,4).map(([key,photo])=><span key={key}><img src={photo.url} alt=""/><button type="button" onClick={()=>askEnhance(key)}>{photo.aiEnhanced?'Enhanced ✓':'Enhance ✦'}</button></span>)}</div></div><div className="cs-listing-copy"><p className="cs-eyebrow">{data.material} · {data.category}</p><h1>{m.title||data.name}</h1><p className="cs-listing-short">{m.shortDescription}</p><strong className="cs-listing-price">{money(data.mrp)}</strong><button type="button" className="cs-primary">Add to cart</button><div className="cs-listing-trust"><span>Authentic craft</span><span>Secure checkout</span><span>Pan-India delivery</span></div><p>{m.description}</p><h3>Why you’ll love it</h3><ul>{(m.highlights||[]).map(x=><li key={x}>{x}</li>)}</ul><h3>Perfect for</h3><p>{(m.idealFor||[]).join(' · ')}</p><details open><summary>Care</summary><p>{m.careInstructions}</p></details><details><summary>Search preview</summary><strong>{m.seoTitle}</strong><p>{m.seoDescription}</p></details></div></article>;
}
