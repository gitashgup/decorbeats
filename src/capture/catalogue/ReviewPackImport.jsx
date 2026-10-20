import React, { useEffect, useRef, useState } from 'react';
import { createReviewPackTask } from './reviewPackTask';
import { loadReviewPack, saveReviewPack, reviewPackStorageMessage } from './reviewPackStorage';

export default function ReviewPackImport({ owner, onSource, onBusy, hidden, disabled = false }) {
  const [status, setStatus] = useState('loading'), [message, setMessage] = useState('Checking this device for a saved review pack…'), [error, setError] = useState('');
  useEffect(() => { onBusy?.(status === 'loading' || status === 'working'); }, [status, onBusy]);
  const input = useRef(null), task = useRef(null), revision = useRef(0), mounted = useRef(true), generation = useRef(0), unavailable = useRef(false);
  useEffect(() => {
    mounted.current = true; const epoch = ++generation.current; let didLoad = false; const controller = new AbortController(); task.current = controller;
    revision.current = 0; unavailable.current = false; onSource(null); setStatus('loading'); setMessage('Checking this device for a saved review pack…'); setError('');
    loadReviewPack(owner).then(async stored => {
      if (!mounted.current || generation.current !== epoch || controller.signal.aborted) return;
      didLoad = true; revision.current = stored?.revision || 0;
      if (!stored) { setStatus('empty'); setMessage(''); return; }
      setMessage('Opening your saved review pack…');
      const source = await createReviewPackTask(stored.blob, { signal: controller.signal });
      if (!mounted.current || generation.current !== epoch || controller.signal.aborted) return;
      onSource(source); setStatus('saved'); setMessage(`${source.products.length} review candidates · saved on this device`);
    }).catch(e => { if (!mounted.current || generation.current !== epoch || controller.signal.aborted) return; unavailable.current = !didLoad; setStatus('error'); setMessage(''); setError(`Could not open the saved review inbox. ${e.message || 'Reload and try again.'} Your catalogue drafts are unchanged.`); }).finally(() => { if (task.current === controller) task.current = null; });
    return () => { mounted.current = false; controller.abort(); task.current?.abort(); };
  }, [owner, onSource]);
  async function importFile(file) {
    if (!file || task.current || disabled || unavailable.current) return;
    const controller = new AbortController(), epoch = generation.current; task.current = controller; setError(''); setStatus('working'); setMessage('Checking your review pack…');
    let source;
    try {
      source = await createReviewPackTask(file, { signal: controller.signal, onProgress: progress => { if (mounted.current && generation.current === epoch && task.current === controller) setMessage(progress.message || 'Checking photos and details…'); } });
      controller.signal.throwIfAborted();
      if (!mounted.current || generation.current !== epoch || task.current !== controller) return;
      setMessage('Saving the review inbox on this device…');
      // Once this atomic local save starts, let it finish before showing success.
      const saved = await saveReviewPack(owner, file, source, revision.current);
      if (!mounted.current || generation.current !== epoch || task.current !== controller) return;
      revision.current = saved.revision; onSource(source); setStatus('saved'); setMessage(`${source.products.length} review candidates · saved on this device`);
    } catch (e) {
      if (!mounted.current || generation.current !== epoch || task.current !== controller) return;
      setStatus('error'); setMessage(''); setError(e.name === 'AbortError' ? 'Import cancelled. Your existing inbox and catalogue drafts are unchanged.' : source ? reviewPackStorageMessage(e) : e.message || 'This review pack could not be opened. Choose the prepared ZIP and retry.');
      if (['ReviewPackConflictError', 'ReviewPackStorageTimeout'].includes(e.name)) unavailable.current = true;
    } finally { if (task.current === controller) task.current = null; }
  }
  function cancelOpening() { task.current?.abort(); task.current = null; setStatus('error'); setMessage(''); setError('Opening cancelled. The saved pack and your catalogue drafts are unchanged. Choose the prepared ZIP to try again.'); }
  const busy = status === 'loading' || status === 'working';
  return <section className="dc-source-entry dc-pack-import" hidden={hidden} aria-label="Import WhatsApp review pack">
    <div><strong>{status === 'saved' ? 'WhatsApp review inbox on this device' : 'Bring your WhatsApp review pack here'}</strong><p>Choose the prepared review ZIP once on each device. Photos and details stay in this browser; this does not upload them to the website.</p><small>Replacing the review inbox does not replace any product drafts you have already edited.</small>{message && <p role="status">{message}</p>}{error && <p className="dc-alert" role="alert">{error}</p>}</div>
    <div className="dc-pack-actions"><input ref={input} type="file" hidden accept=".zip,application/zip,application/x-zip-compressed" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }}/><button className="dc-secondary" disabled={disabled || busy || unavailable.current} onClick={() => input.current?.click()}>{busy ? 'Opening review pack…' : status === 'saved' ? 'Choose another review ZIP' : 'Import review ZIP'}</button>{status === 'working' && !message.startsWith('Saving') && <button onClick={() => task.current?.abort()}>Cancel import</button>}{status === 'loading' && message.startsWith('Opening') && <button onClick={cancelOpening}>Cancel opening</button>}{unavailable.current && <button onClick={() => window.location.reload()}>Reload review inbox</button>}</div>
  </section>;
}
