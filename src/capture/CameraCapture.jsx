import React, { useEffect, useRef, useState } from 'react';

const cameraError = error => ({
  NotAllowedError: 'Camera permission was not granted. Allow camera access for Decorbeats in Chrome and macOS settings, then retry.',
  NotFoundError: 'No camera is available to this browser. Connect or enable a camera, then retry.',
  NotReadableError: 'The camera is busy or unavailable. Close other apps using it, then retry.',
  OverconstrainedError: 'That camera is no longer available. Refresh the camera list and choose another.',
}[error.name] || 'Could not start the camera. Check its connection and browser permissions, then retry.');

export default function CameraCapture({ productName, shotName, onUse, onClose }) {
  const dialog = useRef(null), video = useRef(null), stream = useRef(null), generation = useRef(0), previewUrl = useRef(null);
  const [devices,setDevices] = useState([]), [device,setDevice] = useState('');
  const [state,setState] = useState('opening'), [error,setError] = useState('');
  const [size,setSize] = useState(null), [photo,setPhoto] = useState(null), [saving,setSaving] = useState(false);
  function stop() { stream.current?.getTracks().forEach(track=>track.stop()); stream.current=null; }
  async function list() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all=await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter(item=>item.kind==='videoinput'));
  }
  async function start(id='') {
    const ticket=++generation.current;
    stop();setError('');setState('opening');setSize(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Live camera needs a supported browser on HTTPS. Open Decorbeats directly in Chrome or Safari.');setState('stopped');return;
    }
    try {
      const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{
        ...(id?{deviceId:{exact:id}}:{facingMode:{ideal:'environment'}}),
        width:{ideal:3840},height:{ideal:2160}
      }});
      if (ticket!==generation.current) {media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      const track=media.getVideoTracks()[0];
      setDevice(track.getSettings().deviceId || id);
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
    dialog.current.showModal();start();
    const pause=()=>{++generation.current;stop();setState('stopped');};
    const visibility=()=>{if(document.hidden)pause();};
    const refresh=()=>list().catch(()=>{});
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',pause);
    navigator.mediaDevices?.addEventListener('devicechange',refresh);
    return()=>{++generation.current;stop();if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);
      document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);
      navigator.mediaDevices?.removeEventListener('devicechange',refresh);};
  },[]);
  async function shutter() {
    const ticket=generation.current;
    const source=video.current;
    if(!source?.videoWidth||!source.videoHeight||source.readyState<2)return;
    setError('');
    const canvas=document.createElement('canvas');
    canvas.width=source.videoWidth;canvas.height=source.videoHeight;
    canvas.getContext('2d').drawImage(source,0,0);
    setState('capturing');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.96));
    if(ticket!==generation.current)return;
    if(!blob){setState('live');setError('Could not capture this frame. Try again.');return;}
    if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);
    previewUrl.current=URL.createObjectURL(blob);
    setSize({width:canvas.width,height:canvas.height});
    setPhoto({file:new File([blob],`camera-${Date.now()}.jpg`,{type:'image/jpeg'}),url:previewUrl.current});
    ++generation.current;stop();setState('review');
  }
  async function usePhoto() {
    setSaving(true);setError('');
    try {const saved=await onUse(photo.file);if(!saved)throw new Error('Photo was not saved. Check the connection and retry.');onClose();}
    catch(e){setError(e.message);}finally{setSaving(false);}
  }
  return <dialog ref={dialog} className="cs-camera-dialog" onCancel={e=>{e.preventDefault();if(!saving)onClose();}}>
    <div className="cs-camera-heading"><div><h2>Take photo</h2><p>{productName || 'New product'} · {shotName}</p></div><button type="button" disabled={saving} onClick={onClose}>Close camera</button></div>
    <label className="cs-field"><span>Camera available to this browser</span><select value={device} disabled={saving||state==='opening'||!!photo} onChange={e=>{setDevice(e.target.value);start(e.target.value);}}>
      {!devices.some(item=>item.deviceId===device)&&<option value={device}>Default camera</option>}
      {devices.map((item,index)=><option key={item.deviceId||index} value={item.deviceId}>{item.label||`Camera ${index+1} (permission needed for name)`}</option>)}
    </select></label>
    <p className="cs-camera-help">Choose your iPhone if it appears here. USB alone does not expose it: enable Continuity Camera on your iPhone and make it available to this Mac. Close other camera apps if it is busy.</p>
    {error&&<p role="alert" className="cs-warning">{error}</p>}
    <div className="cs-camera-feed">
      <video ref={video} muted playsInline autoPlay hidden={!!photo} onResize={e=>setSize({width:e.currentTarget.videoWidth,height:e.currentTarget.videoHeight})}/>
      {photo&&<img src={photo.url} alt="Captured photo awaiting approval"/>}
      {!photo&&state!=='live'&&<p role="status">{state==='opening'?'Waiting for camera permission or connection…':'Camera stopped. No live preview.'}</p>}
    </div>
    <p>{size?.width?`${size.width} × ${size.height} pixels · `:''}Captured from the browser video stream, not a native full-resolution iPhone still. Rotate the phone before capturing; check the preview.</p>
    {size?.width&&Math.min(size.width,size.height)<1000?<p className="cs-warning">Low-resolution stream. For finer product detail, use a higher-resolution camera or import an original photo.</p>:null}
    <div className="cs-camera-actions">{photo?<><button type="button" disabled={saving} onClick={()=>{setPhoto(null);start(device);}}>Retake</button><button type="button" className="cs-primary" disabled={saving} onClick={usePhoto}>{saving?'Saving to this draft…':'Use photo · save to draft'}</button></>:<><button type="button" onClick={()=>start(device)} disabled={state==='opening'}>Retry / refresh cameras</button><button type="button" className="cs-primary" disabled={state!=='live'||!size?.width} onClick={shutter}>Capture photo</button></>}</div>
    <p>Camera only—no microphone. Nothing uploads until you choose Use photo.</p>
  </dialog>;
}
