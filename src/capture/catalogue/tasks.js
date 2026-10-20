export const abortError = () => new DOMException('Operation cancelled', 'AbortError');

export function waitForTask(promise, { signal, timeoutMs = 15000, message = 'This is taking too long. Please retry.' } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', cancel); fn(value); };
    const cancel = () => finish(reject, abortError());
    const timer = setTimeout(() => finish(reject, new Error(message)), timeoutMs);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });
    Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
  });
}
