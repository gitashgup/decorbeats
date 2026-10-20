import { generateCataloguePdf } from './pdf.js';
self.onmessage = async event => {
  try {
    const result = await generateCataloguePdf({ ...event.data, onProgress: progress => self.postMessage({ type: 'progress', ...progress }) });
    self.postMessage({ type: 'complete', result });
  } catch (error) { self.postMessage({ type: 'error', message: error.message || 'The PDF could not be created.' }); }
};
