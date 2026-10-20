import { abortError } from './tasks.js';

// PDF parsing and font/image compression run away from the UI thread. A slow
// browser or a stalled chunk request cannot leave the editor locked indefinitely.
export function createPdfTask(input, { signal, onProgress, timeoutMs = 60000, createWorker = () => new Worker(new URL('./pdf.worker.js', import.meta.url), { type: 'module' }) } = {}) {
  return new Promise((resolve, reject) => {
    let worker, settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel); worker?.terminate(); fn(value); };
    const cancel = () => finish(reject, abortError());
    const timer = setTimeout(() => finish(reject, new Error('PDF preparation timed out. Your products are still here. Try again, or use fewer/smaller photos.')), timeoutMs);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      worker = createWorker();
      worker.onmessage = event => {
        if (settled) return;
        const message = event.data;
        if (message.type === 'progress') onProgress?.(message);
        else if (message.type === 'complete') finish(resolve, message.result);
        else if (message.type === 'error') finish(reject, new Error(message.message));
      };
      worker.onerror = () => finish(reject, new Error('The PDF tools could not load. Check your connection and retry. Your products are still here.'));
      worker.onmessageerror = () => finish(reject, new Error('The photo data could not be read for this PDF. Please replace the photo and retry.'));
      worker.postMessage(input);
    } catch (error) { finish(reject, new Error(`This browser could not start PDF preparation. ${error.message || 'Please try Safari or Chrome.'}`)); }
  });
}
