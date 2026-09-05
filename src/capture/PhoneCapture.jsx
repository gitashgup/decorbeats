import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SHOTS } from './model';
import { uploadPhoto } from './media';
import { updateSharedDraft } from './sharedDraft';
import CameraCapture from './CameraCapture';

export default function PhoneCapture({ initial }) {
  const [draft,setDraft]=useState(initial), [shot,setShot]=useState(SHOTS.find(s=>!initial.data.photos?.[s.id])?.id||'hero');
  const [camera,setCamera]=useState(false), [status,setStatus]=useState('Connecting to this draft…'), [error,setError]=useState('');
  const active=useRef(true), working=useRef(false), pending=useRef(null), heartbeatJob=useRef(null);
  useEffect(()=>{
    active.current=true;
    async function heartbeat() {
      if(document.hidden||working.current)return;
      working.current=true;
      try {
        const saved=await updateSharedDraft(supabase,initial.id,latest=>({...latest,data:{...latest.data,phoneLastSeenAt:new Date().toISOString()}}));
        if(active.current){setDraft(saved);setStatus('Connected · photos go to this draft');setError('');}
      } catch(e){if(active.current)setError(`Connection paused: ${e.message}`);}
      finally{working.current=false;}
    }
    const check=()=>{if(!working.current)heartbeatJob.current=heartbeat();};
    const warn=e=>{if(working.current&&pending.current){e.preventDefault();e.returnValue='';}};
    check();const timer=setInterval(check,15000);window.addEventListener('beforeunload',warn);
    return()=>{active.current=false;clearInterval(timer);window.removeEventListener('beforeunload',warn);};
  },[initial.id]);
  async function savePhoto(file) {
    await heartbeatJob.current;
    working.current=true;setError('');
    try {
      let asset;
      if(pending.current?.file===file)asset=pending.current.asset;
      else {
        asset=await uploadPhoto(initial.id,shot,file,setStatus);
        pending.current={file,asset,shot,previous:draft.data.photos?.[shot]?.url};
      }
      const job=pending.current;
      const saved=await updateSharedDraft(supabase,initial.id,latest=>{
        const current=latest.data.photos?.[job.shot]?.url;
        if(current!==job.previous && current!==job.asset.url)throw new Error('That photo was replaced on another device. Keep this image and review the draft before retrying.');
        return {...latest,data:{...latest.data,phoneLastSeenAt:new Date().toISOString(),lastPhonePhotoAt:new Date().toISOString(),photos:{...latest.data.photos,[job.shot]:job.asset}}};
      });
      setDraft(saved);pending.current=null;setStatus('Uploaded ✓ · saved to the same draft on your Mac');
      const next=SHOTS.find(s=>!saved.data.photos?.[s.id]);
      if(next)setShot(next.id);else setCamera(false);
      return true;
    } catch(e){setError(e.message);throw e;}
    finally{working.current=false;}
  }
  return <section className="cs-phone-panel cs-panel">
    <p className="cs-eyebrow">Phone camera · Shelf {draft.data.locations?.[0]?.name||'not set'}</p>
    <h1>{draft.data.name||'New product'}</h1><p>Draft {initial.id.slice(0,8)} · keep this same link open on the Mac.</p>
    <p role="status">{status}</p>{error&&<p role="alert" className="cs-warning">{error}</p>}
    <p>Frame and photograph here on your iPhone. Each shutter tap uploads automatically. The Mac updates within a few seconds.</p>
    <div className="cs-shots">{SHOTS.map(s=><button key={s.id} type="button" aria-pressed={shot===s.id} onClick={()=>setShot(s.id)}>{draft.data.photos?.[s.id]&&<img src={draft.data.photos[s.id].url} alt=""/>}{s.name}<small>{draft.data.photos?.[s.id]?'Uploaded ✓':'Not taken'}</small></button>)}</div>
    <button type="button" className="cs-primary cs-wide" onClick={()=>setCamera(true)}>{draft.data.photos?.[shot]?'Retake selected photo':'Open phone camera'}</button>
    <p className="cs-caption">This is the Decorbeats browser camera—not Apple’s separate Camera app. Keep the page open while uploading. Camera access requires permission.</p>
    <a href={`/admin/capture?draft=${initial.id}`}>Open full draft details</a>
    {camera&&<CameraCapture key={initial.id} autoSave productName={draft.data.name} shotName={SHOTS.find(s=>s.id===shot).name} onUse={savePhoto} onClose={()=>setCamera(false)}/>}
  </section>;
}
