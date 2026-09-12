import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SHOTS, countTotal } from './model';
import { uploadPhoto } from './media';
import { updateSharedDraft } from './sharedDraft';
import CameraCapture from './CameraCapture';

const requiredShots=SHOTS.slice(0,4);
const steps=['photos','category','material','name','count','location','locationPhoto','height','width','depth','weight','done'];
const categoryChoices=[
  ['Bell','🔔','घंटी'],['Diya','🪔','दिया'],['Idol','🙏','मूर्ति'],['Bowl','🥣','कटोरी'],
  ['Plate','🍽️','थाली'],['Urli','🌸','उरली'],['Wall Decor','🖼️','दीवार सजावट'],['Decor','🏠','सजावट'],['Tree','🌳','पेड़'],['Box','🎁','डिब्बा'],['Planter','🪴','गमला'],['Other','＋','अन्य']
];
const materialChoices=[['Brass','🟡','पीतल'],['Metal','⚪','धातु'],['Wood','🟤','लकड़ी'],['Ceramic','🏺','सिरेमिक'],['Mixed','◐','मिश्रित'],['Other','＋','अन्य']];
const numericSteps={
  count:{title:'कितने तैयार हैं?',label:'सेट बेचते हैं तो पूरे सेट गिनें।',key:'sellable',suffix:'नग / सेट',icon:'🔢'},
  height:{title:'ऊँचाई कितनी है?',label:'नीचे से ऊपर तक · Height',key:'height',suffix:'cm',icon:'↕️'},
  width:{title:'चौड़ाई कितनी है?',label:'बाएँ से दाएँ तक · Width',key:'width',suffix:'cm',icon:'↔️'},
  depth:{title:'गहराई कितनी है?',label:'आगे से पीछे तक · Depth',key:'length',suffix:'cm',icon:'📏'},
  weight:{title:'वज़न कितना है?',label:'बिना पैकिंग तराज़ू पर रखें · Weight',key:'weight_g',suffix:'g',icon:'⚖️'},
};

function startingStep(data){
  if(requiredShots.some(s=>!data.photos?.[s.id]))return 'photos';
  if(!data.categoryConfirmed)return 'category';
  if(!data.materialConfirmed)return 'material';
  if(!String(data.name||'').trim())return 'name';
  if(data.locations?.[0]?.sellable===''||data.locations?.[0]?.sellable==null)return 'count';
  if(!String(data.locations?.[0]?.name||'').trim())return 'location';
  if(!data.locationPhoto?.url)return 'locationPhoto';
  if(!data.height)return 'height';
  if(!data.width)return 'width';
  if(!data.length)return 'depth';
  if(!data.weight_g)return 'weight';
  return 'done';
}

function nameSuggestions(data){
  const material=data.material==='Other'||data.material==='Mixed'?'':data.material;
  const common={
    Bell:[`${material} Hand Bell`,`${material} Hanging Bell`],
    Diya:[`${material} Diya`,`${material} Pooja Diya`,`${material} Decorative Diya`],
    Idol:[`${material} God Idol`,`${material} Pooja Idol`],
    Bowl:[`${material} Bowl`,`${material} Bowl Set`],Plate:[`${material} Pooja Plate`,`${material} Serving Plate`],
    Urli:[`${material} Decorative Urli`,`${material} Flower Urli`],
    'Wall Decor':[`${material} Wall Hanging`,`${material} Wall Décor`],Decor:[`${material} Elephant Set`,`${material} Home Décor`]
  };
  return (common[data.category]||[`${material} ${data.category}`]).map(x=>x.replace(/^\s+|\s+/g,' ').trim()).filter(Boolean);
}

export default function PhoneCapture({ initial }) {
  const [draft,setDraft]=useState(initial), [stage,setStage]=useState(()=>initial.data.reviewStatus==='submitted'?'submitted':startingStep(initial.data));
  const [shot,setShot]=useState(requiredShots.find(s=>!initial.data.photos?.[s.id])?.id||'hero');
  const [camera,setCamera]=useState(()=>initial.data.reviewStatus!=='submitted'&&startingStep(initial.data)==='photos'?'product':''), [value,setValue]=useState(null);
  const [status,setStatus]=useState('जुड़ रहा है…'), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const active=useRef(true), working=useRef(false), pending=useRef(null), heartbeatJob=useRef(null);
  const stepNumber=Math.max(1,steps.indexOf(stage)+1);
  const progress=Math.round((stepNumber/steps.length)*100);
  const currentShot=requiredShots.find(s=>s.id===shot)||requiredShots[0];

  useEffect(()=>{
    active.current=true;
    async function heartbeat() {
      if(document.hidden||working.current)return;
      working.current=true;
      try {
        const saved=await updateSharedDraft(supabase,initial.id,latest=>({...latest,data:{...latest.data,phoneLastSeenAt:new Date().toISOString()}}));
        if(active.current){setDraft(saved);setStatus('जुड़ा है');setError('');}
      } catch(e){if(active.current)setError(`Connection paused: ${e.message}`);}
      finally{working.current=false;}
    }
    const check=()=>{if(!working.current)heartbeatJob.current=heartbeat();};
    const warn=e=>{if(working.current&&pending.current){e.preventDefault();e.returnValue='';}};
    check();const timer=setInterval(check,15000);window.addEventListener('beforeunload',warn);
    return()=>{active.current=false;clearInterval(timer);window.removeEventListener('beforeunload',warn);};
  },[initial.id]);

  async function updateData(makeData,next,message='सेव हो गया ✓'){
    if(pending.current)return false;
    pending.current={saving:true};setBusy(true);
    await heartbeatJob.current;working.current=true;setError('');
    try{
      const saved=await updateSharedDraft(supabase,initial.id,latest=>({...latest,data:makeData(latest.data)}));
      setDraft(saved);setValue(null);setStatus(message);if(next)setStage(next);return true;
    }catch(e){setError(e.message);return false;}finally{working.current=false;pending.current=null;setBusy(false);}
  }

  async function savePhoto(file) {
    await heartbeatJob.current;working.current=true;setError('');
    try {
      let asset;
      if(pending.current?.file===file)asset=pending.current.asset;
      else {asset=await uploadPhoto(initial.id,shot,file,setStatus);pending.current={file,asset,shot};}
      const job=pending.current;
      const saved=await updateSharedDraft(supabase,initial.id,latest=>({...latest,data:{...latest.data,phoneLastSeenAt:new Date().toISOString(),lastPhonePhotoAt:new Date().toISOString(),photos:{...latest.data.photos,[job.shot]:job.asset}}}));
      setDraft(saved);pending.current=null;setStatus('फोटो सेव हो गई ✓');
      const next=requiredShots.find(s=>!saved.data.photos?.[s.id]);
      if(next)setShot(next.id);else{setCamera('');setStage('category');}
      return true;
    } catch(e){setError(e.message);throw e;}finally{working.current=false;}
  }

  async function saveLocationPhoto(file){
    working.current=true;setError('');
    try{
      const asset=await uploadPhoto(initial.id,'location-reference',file,setStatus);
      const saved=await updateSharedDraft(supabase,initial.id,latest=>({...latest,data:{...latest.data,locationPhoto:asset}}));
      setDraft(saved);setCamera('');setStatus('Location saved ✓');setStage('height');return true;
    }catch(e){setError(e.message);throw e;}finally{working.current=false;}
  }

  const body=useMemo(()=>{
    if(stage==='submitted')return <div className="cs-mobile-done"><span>✓</span><h1>जाँच के लिए भेज दिया</h1><p>अब Ashwarya जाँचकर वेबसाइट पर डालेंगे।</p><dl><dt>सामान</dt><dd>{draft.data.name||'नया सामान'}</dd><dt>फोटो</dt><dd>{Object.keys(draft.data.photos||{}).length}</dd><dt>गिनती</dt><dd>{countTotal(draft.data)}</dd><dt>जगह</dt><dd>{draft.data.locations?.[0]?.name||'—'}</dd></dl><a className="cs-primary cs-mobile-link" href="/admin/capture?phone=1">अगला सामान →</a></div>;
    if(stage==='photos')return <><div className="cs-mobile-shot"><span className="cs-step-icon">{currentShot.icon}</span><h1>{currentShot.hindi}</h1><p>{currentShot.direction}</p>{draft.data.photos?.[shot]&&<img src={draft.data.photos[shot].url} alt={currentShot.name}/>}<button className="cs-primary cs-mobile-action" onClick={()=>setCamera('product')}>📷 {draft.data.photos?.[shot]?'दोबारा फोटो लें':'कैमरा खोलें'}</button></div><div className="cs-mobile-photo-dots">{requiredShots.map(s=><span key={s.id} className={draft.data.photos?.[s.id]?'done':s.id===shot?'active':''}/>)}</div></>;
    if(stage==='category')return <ChoiceStep title="यह क्या है?" choices={categoryChoices} selected={draft.data.categoryConfirmed?draft.data.category:''} onChoose={choice=>updateData(d=>({...d,category:choice,categoryConfirmed:true}),'material')} />;
    if(stage==='material')return <ChoiceStep title="किस चीज़ से बना है?" choices={materialChoices} selected={draft.data.materialConfirmed?draft.data.material:''} onChoose={choice=>updateData(d=>({...d,material:choice,materialConfirmed:true}),'name')} />;
    if(stage==='name')return <NameEntry value={value??draft.data.name} suggestions={nameSuggestions(draft.data)} onChange={setValue} onNext={()=>updateData(d=>({...d,name:(value??d.name).trim()}),'count')} />;
    if(stage==='location')return <SingleEntry title="सामान कहाँ रखा है?" label="सेक्शन या रैक का नंबर" icon="📍" value={value??draft.data.locations?.[0]?.name??''} onChange={setValue} placeholder="जैसे 4 या 4-B" action="आगे →" onNext={()=>updateData(d=>({...d,locations:[{...(d.locations?.[0]||{}),name:(value??d.locations?.[0]?.name??'').trim(),damaged:d.locations?.[0]?.damaged??'0'},...(d.locations||[]).slice(1)]}),'locationPhoto')} />;
    if(stage==='locationPhoto')return <div className="cs-mobile-shot"><span className="cs-step-icon">🗄️</span><h1>रैक की फोटो लें</h1><p>रैक का नंबर और सामान दोनों दिखाएँ।</p>{draft.data.locationPhoto?.url&&<img src={draft.data.locationPhoto.url} alt="Product storage location"/>}<button className="cs-primary cs-mobile-action" onClick={()=>setCamera('location')}>📷 कैमरा खोलें</button><button onClick={()=>setStage('height')}>अभी छोड़ें →</button></div>;
    if(numericSteps[stage]){
      const config=numericSteps[stage];
      const existing=stage==='count'?draft.data.locations?.[0]?.sellable:draft.data[config.key];
      return <SingleEntry numeric integer={stage==='count'} icon={config.icon} title={config.title} label={config.label} suffix={config.suffix} value={value??existing??''} onChange={setValue} action="आगे →" onNext={()=>{const entered=value??existing;if(entered==null||String(entered).trim()===''||!Number.isFinite(Number(entered))||(stage==='count'?(!Number.isInteger(Number(entered))||Number(entered)<0):Number(entered)<=0))return setError('सही नंबर भरें।');const next=steps[steps.indexOf(stage)+1];return updateData(d=>stage==='count'?({...d,locations:[{...(d.locations?.[0]||{}),sellable:String(entered),damaged:d.locations?.[0]?.damaged??'0'},...(d.locations||[]).slice(1)]}):({...d,[config.key]:String(entered)}),next);}}/>;
    }
    return <div className="cs-mobile-done"><span>✓</span><h1>तैयार है?</h1><p>बस 3 चीज़ें देख लो, फिर भेज दो।</p><div className="cs-mobile-review-strip"><dl><dt>सामान</dt><dd>{draft.data.name||'यह सामान'}</dd><dt>गिनती</dt><dd>{countTotal(draft.data)} पीस</dd><dt>जगह</dt><dd>{draft.data.locations?.[0]?.name||'—'}</dd><dt>नाप</dt><dd>{draft.data.length} × {draft.data.width} × {draft.data.height} cm</dd></dl></div><details className="cs-mobile-review-extra"><summary>पूरा सारांश देखें</summary><dl><dt>श्रेणी</dt><dd>{categoryChoices.find(c=>c[0]===draft.data.category)?.[2]||draft.data.category}</dd><dt>मटेरियल</dt><dd>{materialChoices.find(c=>c[0]===draft.data.material)?.[2]||draft.data.material}</dd><dt>वज़न</dt><dd>{draft.data.weight_g} g</dd></dl></details><button className="cs-primary cs-mobile-action" onClick={()=>updateData(d=>({...d,reviewStatus:'submitted',submittedAt:new Date().toISOString()}),'submitted')}>✓ जाँच के लिए भेजें</button><button onClick={()=>{setValue(null);setStage('category');}}>कुछ बदलना है</button></div>;
  },[stage,shot,value,draft,currentShot,initial.id]);

  return <section className="cs-phone-panel">
    <header><span className="cs-phone-connected"><i/> {busy?'सेव हो रहा है…':status}</span><span>{stage==='photos'?`फोटो ${requiredShots.findIndex(s=>s.id===shot)+1} / 4`:stage==='submitted'?'पूरा हुआ':`${stepNumber} / ${steps.length}`}</span></header>
    <div className="cs-phone-progress"><span style={{width:`${progress}%`}}/></div>
    {error&&<p role="alert" className="cs-phone-error">{error}</p>}
    <fieldset className="cs-phone-body" disabled={busy}>{body}</fieldset>
    {stage!=='submitted'&&<button className="cs-phone-back" disabled={busy} onClick={()=>{setValue(null);setError('');if(stage==='photos'){const index=requiredShots.findIndex(s=>s.id===shot);if(index>0)setShot(requiredShots[index-1].id);else window.location.href='/admin/capture?phone=1';}else setStage(steps[Math.max(0,steps.indexOf(stage)-1)]);}}>← पीछे</button>}
    {camera==='product'&&<CameraCapture key={`${initial.id}-${shot}`} autoSave productName={draft.data.name} shotName={currentShot.hindi} guidance={currentShot.direction} angleHint={currentShot.angleHint} lightHint={currentShot.lightHint} icon={currentShot.icon} onUse={savePhoto} onClose={()=>setCamera('')}/>}
    {camera==='location'&&<CameraCapture key={`${initial.id}-location`} autoSave productName={draft.data.name} shotName="रैक की फोटो" angleHint="कैमरा स्थिर रखें" lightHint="रैक नंबर साफ दिखे" guidance="रैक का नंबर और सामान दोनों दिखाएँ।" icon="🗄️" onUse={saveLocationPhoto} onClose={()=>setCamera('')}/>} 
  </section>;
}

function SingleEntry({title,label,value,onChange,onNext,action,placeholder='',suffix='',numeric=false,integer=false,icon}){
  return <form className="cs-mobile-entry" onSubmit={e=>{e.preventDefault();onNext();}}><span className="cs-step-icon">{icon}</span><h1>{title}</h1><label><b>{label}</b><div><input type={numeric?'number':'text'} min={numeric?'0':undefined} step={numeric?(integer?'1':'any'):undefined} inputMode={numeric?(integer?'numeric':'decimal'):undefined} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>{suffix&&<em>{suffix}</em>}</div></label><button className="cs-primary cs-mobile-action" disabled={!String(value??'').trim()}>{action}</button></form>;
}

function ChoiceStep({title,choices,selected,onChoose}){
  return <section className="cs-mobile-entry cs-choice-step"><span>एक चुनें 👇</span><h1>{title}</h1><div className="cs-choice-grid">{choices.map(([value,icon,hindi])=><button type="button" key={value} aria-pressed={selected===value} onClick={()=>onChoose(value)}><b aria-hidden="true">{icon}</b><strong>{hindi}</strong><small>{value}</small></button>)}</div></section>;
}

function NameEntry({value,suggestions,onChange,onNext}){
  const hindi=name=>Object.entries({'Elephant Set':'हाथियों का सेट','Hand Bell':'हाथ की घंटी','Hanging Bell':'लटकने वाली घंटी','Home Décor':'सजावट','God Idol':'मूर्ति','Pooja Idol':'पूजा की मूर्ति','Bowl Set':'कटोरी का सेट','Pooja Plate':'पूजा की थाली','Serving Plate':'परोसने की थाली','Wall Hanging':'दीवार की सजावट','Wall Décor':'दीवार की सजावट','Decorative Urli':'सजावटी उरली','Flower Urli':'फूलों की उरली','Pooja Diya':'पूजा का दिया','Decorative Diya':'सजावटी दिया','Diya':'दिया','Bowl':'कटोरी','Brass':'पीतल','Metal':'धातु','Wood':'लकड़ी','Ceramic':'सिरेमिक','Tree':'पेड़','Box':'डिब्बा','Planter':'गमला','Other':'अन्य'}).reduce((text,[from,to])=>text.replace(from,to),name);
  return <form className="cs-mobile-entry" onSubmit={e=>{e.preventDefault();onNext();}}><span>🏷️ नाम</span><h1>नाम चुनें या लिखें</h1><div className="cs-name-suggestions">{suggestions.map(name=><button type="button" key={name} aria-pressed={value===name} onClick={()=>onChange(name)}><strong>{hindi(name)}</strong><small>{name}</small></button>)}</div><label><b>हिंदी में भी लिख सकते हैं</b><div><input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder="जैसे हाथी का सेट"/></div></label><button className="cs-primary cs-mobile-action" disabled={!String(value||'').trim()}>यह नाम रखें →</button></form>;
}
