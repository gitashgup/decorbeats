import { abortError } from './tasks.js';

const MAX_ZIP_BYTES = 30 * 1024 * 1024;

// The read, worker startup and parsing share one deadline. A cancellation during
// File.arrayBuffer() prevents a late read from starting a new worker afterwards.
export function createReviewPackTask(file, { signal, onProgress, timeoutMs = 60000, createWorker = () => new Worker(new URL('./reviewPack.worker.js', import.meta.url), { type: 'module' }) } = {}) {
  return new Promise((resolve, reject) => {
    let worker, settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      worker?.terminate();
      fn(value);
    };
    const cancel = () => finish(reject, abortError());
    const timer = setTimeout(() => finish(reject, new Error('Review ZIP import timed out. Your saved products are still here. Retry with the sanitized review ZIP.')), timeoutMs);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    if (!file || typeof file.arrayBuffer !== 'function' || !Number.isSafeInteger(file.size) || file.size < 22 || file.size > MAX_ZIP_BYTES) {
      finish(reject, new Error('Choose a review ZIP no larger than 30 MB.'));
      return;
    }
    Promise.resolve().then(() => {
      if (!settled) return file.arrayBuffer();
    }).then(bytes => {
      if (settled) return;
      if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== file.size || bytes.byteLength > MAX_ZIP_BYTES) throw new Error('The review ZIP could not be read completely. Please choose it again.');
      worker = createWorker();
      worker.onmessage = event => {
        if (settled) return;
        const message = event.data;
        try {
          if (message?.type === 'progress') onProgress?.(message);
          else if (message?.type === 'complete') finish(resolve, message.result);
          else if (message?.type === 'error') finish(reject, new Error(message.message || 'The review ZIP could not be read.'));
        } catch (error) { finish(reject, error); }
      };
      worker.onerror = () => finish(reject, new Error('The review import tools could not load. Check your connection and retry. Your saved products are still here.'));
      worker.onmessageerror = () => finish(reject, new Error('The review ZIP data could not be read. Please choose the sanitized ZIP again.'));
      // File.arrayBuffer() is an isolated copy. Transfer ownership, rather than
      // copying the entire archive once more onto the worker message queue.
      worker.postMessage({ bytes }, [bytes]);
    }).catch(error => finish(reject, new Error(error.message || 'This browser could not start the review ZIP import. Please retry in Safari or Chrome.')));
  });
}
