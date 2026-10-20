import { parseReviewPack } from './reviewPack.js';

self.onmessage = async event => {
  try {
    const result = await parseReviewPack(event.data.bytes, {
      onProgress: progress => self.postMessage({ type: 'progress', ...progress }),
    });
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'The review ZIP could not be read.' });
  }
};
