import React,{useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';

export default function ProductPicker({hint='',onSelect}) {
 const [query,setQuery]=useState(hint),[rows,setRows]=useState([]),[error,setError]=useState(''),[scanning,setScanning]=useState(false);
 const video=useRef(null);
 useEffect(()=>{let active=true;const timer=setTimeout(async()=>{
  if(query.trim().length<2){setRows([]);return;}
  const {data,error}=await supabase.rpc('find_inventory_matches_v1',{p_query:query.trim()});
  if(active){setError(error?error.message:'');setRows(data||[]);}
 },250);return()=>{active=false;clearTimeout(timer);};},[query]);
 useEffect(()=>{if(!scanning)return;let active=true,stream,timer;
  (async()=>{try{if(!('BarcodeDetector' in window))throw new Error('Camera scanning is unavailable here. Type the SKU or product name.');
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});if(!active){stream.getTracks().forEach(t=>t.stop());return;}
   video.current.srcObject=stream;await video.current.play();const detector=new window.BarcodeDetector();
   async function scan(){if(!active)return;try{const codes=await detector.detect(video.current);if(codes[0]){setQuery(codes[0].rawValue);setScanning(false);return;}}catch{}timer=setTimeout(scan,400);}scan();
  }catch(e){setError(e.message);setScanning(false);}})();return()=>{active=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());};},[scanning]);
 return <div><div className="cs-row-actions"><input aria-label="Find inventory product" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Scan / type SKU or product name"/><button type="button" onClick={()=>{setError('');setScanning(!scanning);}}>{scanning?'Stop camera':'Scan code'}</button></div>{scanning&&<video ref={video} playsInline muted style={{width:'100%',maxHeight:280}}/>}{error&&<p role="alert">{error}</p>}<div className="cs-match-list">{rows.map(p=><button type="button" key={p.id} onClick={()=>onSelect(p)}><img loading="lazy" src={p.image_url||'/assets/images/product-fallback.svg'} alt=""/><span>{p.name}<small>{p.sku} · {p.material} · {p.size||'Size not recorded'} · {p.quantity??0} in stock</small></span></button>)}</div>{query.length>=2&&!rows.length&&!error&&<p>No matches yet. Try a short name or exact SKU.</p>}</div>;
}
