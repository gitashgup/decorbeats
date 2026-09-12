import React, { useEffect, useRef, useState } from 'react';

const cameraError = error => ({
  NotAllowedError: 'Camera permission was not granted. Allow camera access for Decorbeats in Chrome and macOS settings, then retry.',
  NotFoundError: 'No camera is available to this browser. Connect or enable a camera, then retry.',
  NotReadableError: 'The camera is busy or unavailable. Close other apps using it, then retry.',
  OverconstrainedError: 'That camera is no longer available. Refresh the camera list and choose another.',
}[error.name] || 'Could not start the camera. Check its connection and browser permissions, then retry.');

function evaluateExposure(canvas) {
  const ctx = canvas.getContext('2d');
  const sample = Math.min(canvas.width, canvas.height);
  const size = 120;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = size;
  sampleCanvas.height = size;
  const sampleCtx = sampleCanvas.getContext('2d');
  sampleCtx.drawImage(canvas, (sample - size) / 2, (sample - size) / 2, size, size, 0, 0, size, size);
  const { data } = sampleCtx.getImageData(0, 0, size, size);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    total += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  const avg = total / ((size * size) * 255);
  if (avg < 0.28) return 'रोशनी कम है। लाइट बढ़ाएँ या पास जाकर मोबाइल से सीधा शॉट लें।';
  if (avg > 0.85) return 'बहुत तेज़ चमक है। हल्की तरफ़ से शूट करें।';
  return '';
}

export default function CameraCapture({ productName, shotName, guidance='पूरा सामान चौकोर फ्रेम में रखें।', angleHint='', lightHint='', icon='📸', onUse, onClose, autoSave=false }) {
  const dialog = useRef(null), video = useRef(null), stream = useRef(null), generation = useRef(0), previewUrl = useRef(null);
  const [devices,setDevices] = useState([]), [device,setDevice] = useState('');
  const [state,setState] = useState('opening'), [error,setError] = useState('');
  const [size,setSize] = useState(null), [photo,setPhoto] = useState(null), [saving,setSaving] = useState(false);
  const [torchSupported,setTorchSupported] = useState(false), [torchOn,setTorchOn] = useState(false);
  const [notice,setNotice] = useState('');
  const [qualityHint,setQualityHint] = useState('');
  const [zoom,setZoom] = useState(1.5);
  const alive=useRef(true);

  function getTrack() { return stream.current?.getVideoTracks?.()[0]; }

  function stop() { stream.current?.getTracks().forEach(track=>track.stop()); stream.current=null; }
  async function setTorch(enabled) {
    const track = getTrack();
    if (!track?.applyConstraints || !torchSupported) return;
    try { await track.applyConstraints({ advanced: [{ torch: enabled }] }); setTorchOn(enabled); }
    catch { setTorchSupported(false); setTorchOn(false); }
  }

  async function list() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all=await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter(item=>item.kind==='videoinput'));
  }
  async function start(id='') {
    const ticket=++generation.current;
    stop();setError('');setState('opening');setSize(null);setTorchOn(false);setQualityHint('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Live camera needs a supported browser on HTTPS. Open Decorbeats directly in Chrome or Safari.');setState('stopped');return;
    }
    try {
      const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{
        ...(id?{deviceId:{exact:id}}:{facingMode:{ideal:'environment'}}),
        width:{ideal:2160},height:{ideal:2160},aspectRatio:{ideal:1}
      }});
      if (ticket!==generation.current) {media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      const track=media.getVideoTracks()[0];
      setDevice(track.getSettings().deviceId || id);
      const capabilities = track.getCapabilities?.();
      setTorchSupported(Boolean(capabilities && capabilities.torch));
      track.onended=()=>{if(ticket===generation.current){stop();setState('stopped');setError('Camera disconnected or stopped. Reconnect it and retry.');}};
      video.current.srcObject=media;
      await video.current.play();
      if(ticket!==generation.current)return;
      setState('live');await list();
    } catch(e) {
      if(ticket!==generation.current)return;
      stop();setError(cameraError(e));setState('stopped');
      await list().catch(()=>{});
    }
  }
  useEffect(()=>{
    alive.current=true;dialog.current.showModal();start();
    const pause=()=>{++generation.current;stop();setState('stopped');};
    const visibility=()=>{if(document.hidden)pause();};
    const refresh=()=>list().catch(()=>{});
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',pause);
    navigator.mediaDevices?.addEventListener('devicechange',refresh);
    return()=>{alive.current=false;++generation.current;stop();if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);
      document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);
      navigator.mediaDevices?.removeEventListener('devicechange',refresh);};
  },[]);
  async function shutter() {
    const ticket=generation.current;
    const source=video.current;
    if(!source?.videoWidth||!source.videoHeight||source.readyState<2)return;
    setError('');
    const canvas=document.createElement('canvas');
    // The video is displayed in a square with this same centred zoom.
    const crop=Math.floor(Math.min(source.videoWidth,source.videoHeight)/zoom);
    const sx=(source.videoWidth-crop)/2, sy=(source.videoHeight-crop)/2;
    canvas.width=crop;canvas.height=crop;
    canvas.getContext('2d').drawImage(source,sx,sy,crop,crop,0,0,crop,crop);
    setQualityHint(evaluateExposure(canvas));
    setState('capturing');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.96));
    if(ticket!==generation.current)return;
    if(!blob){setState('live');setError('Could not capture this frame. Try again.');return;}
    if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);
    previewUrl.current=URL.createObjectURL(blob);
    setSize({width:canvas.width,height:canvas.height});
    const file=new File([blob],`camera-${Date.now()}.jpg`,{type:'image/jpeg'});
    setPhoto({file,url:previewUrl.current});
    ++generation.current;stop();setState('review');
  }
  async function usePhoto(file=photo.file) {
    setSaving(true);setError('');
    try {
      const saved=await onUse(file);if(!saved)throw new Error('Photo was not saved. Check the connection and retry.');
      if(!alive.current)return;
      if(autoSave){setNotice('फोटो सेव हो गई ✓');setPhoto(null);await start(device);}else onClose();
    }
    catch(e){setError(e.message);}finally{setSaving(false);}
  }
  return <dialog ref={dialog} className="cs-camera-dialog" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}>
    <div className="cs-camera-heading"><div><span>{productName || 'Decorbeats'}</span><h2>{icon} {photo?'फोटो ठीक है?':shotName}</h2></div><button type="button" aria-label="Close camera" disabled={saving} onClick={onClose}>×</button></div>
    <label className="cs-field cs-camera-picker"><span>Camera</span><select value={device} disabled={saving||state==='opening'||!!photo} onChange={e=>{setDevice(e.target.value);start(e.target.value);}}>
      {!devices.some(item=>item.deviceId===device)&&<option value={device}>Default camera</option>}
      {devices.map((item,index)=><option key={item.deviceId||index} value={item.deviceId}>{item.label||`Camera ${index+1} (permission needed for name)`}</option>)}
    </select></label>
    <p className="cs-camera-help">{photo?'सामान पूरा और साफ दिख रहा है?':guidance}</p>
    {!photo&&<ul className="cs-camera-tips"><li>📐 {angleHint || 'फोन को आँख के बराबर रखो'}</li><li>💡 {lightHint || 'नरम, सामने से लाइट रखें'}</li></ul>}
    {notice&&<p role="status">{notice}</p>}
    {error&&<p role="alert" className="cs-warning">{error}</p>}
    {qualityHint && !photo&&<p role="status" className="cs-camera-tip">{qualityHint}</p>}
    <div className={`cs-camera-feed ${photo?'is-review':'is-live'}`}>
      <video ref={video} style={{transform:`scale(${zoom})`}} muted playsInline autoPlay hidden={!!photo} onResize={e=>setSize({width:e.currentTarget.videoWidth,height:e.currentTarget.videoHeight})}/>
      {photo&&<img src={photo.url} alt="Captured photo awaiting approval"/>}
      {!photo&&state==='live'&&<div className="cs-square-guide" aria-hidden="true"><span>सामान इस बॉक्स जितना बड़ा दिखे</span></div>}
      {!photo&&state!=='live'&&<p role="status">{state==='opening'?'कैमरा खोलने के लिए Allow दबाएँ…':'कैमरा बंद है। दोबारा खोलें।'}</p>}
    </div>
    {!photo&&<div className="cs-camera-zoom"><span>छोटा दिख रहा है?</span>{[1,1.5,2].map(z=><button type="button" key={z} aria-pressed={zoom===z} onClick={()=>setZoom(z)}>{z}×</button>)}{torchSupported&&<button type="button" aria-pressed={torchOn} onClick={()=>setTorch(!torchOn)} title="Torch">{torchOn?'💡 Torch • ON':'💡 Torch • OFF'}</button>}</div>}
    <p className="cs-camera-detail">यही चौकोर फोटो सेव होगी।</p>
    {size?.width&&Math.min(size.width,size.height)<1000?<p className="cs-warning">Low-resolution stream. For finer product detail, use a higher-resolution camera or import an original photo.</p>:null}
    <div className="cs-camera-actions">{photo?<><button type="button" disabled={saving} onClick={()=>{setPhoto(null);start(device);}}>↻ दोबारा लें</button><button type="button" className="cs-primary" disabled={saving} onClick={()=>usePhoto()}>{saving?'सेव हो रहा है…':'✓ ठीक है · आगे'}</button></>:<><button className="cs-camera-retry" type="button" onClick={()=>start(device)} disabled={state==='opening'||saving}>कैमरा फिर खोलें</button><button type="button" className="cs-shutter" aria-label="फोटो लें" disabled={saving||state!=='live'||!size?.width} onClick={shutter}><span/></button></>}</div>
  </dialog>;
}
