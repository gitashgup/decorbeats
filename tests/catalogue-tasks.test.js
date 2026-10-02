import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForTask } from '../src/capture/catalogue/tasks.js';
import { createPdfTask } from '../src/capture/catalogue/pdfTask.js';
import { openCatalogueDb, saveWorkspace } from '../src/capture/catalogue/storage.js';
import { prepareCataloguePhoto } from '../src/capture/catalogue/photos.js';
import { newWorkspace } from '../src/capture/catalogue/model.js';

const never = () => new Promise(() => {});
test('an indefinitely pending operation times out and can be cancelled immediately',async()=>{
 await assert.rejects(waitForTask(never(),{timeoutMs:5,message:'Timed out'}),/Timed out/);
 const controller=new AbortController();const promise=waitForTask(never(),{signal:controller.signal});controller.abort();await assert.rejects(promise,{name:'AbortError'});
});
test('a stalled IndexedDB open times out and closes its late connection',async()=>{
 const request={},factory={open:()=>request};let closed=0;
 await assert.rejects(openCatalogueDb(factory,5),{name:'StorageTimeoutError'});
 request.result={close(){closed++}};request.onsuccess();assert.equal(closed,1);
});
test('a stalled transaction aborts before reporting timeout, rather than remaining queued forever',async()=>{
 let aborted=0,closed=0;const tx={objectStore(){return{get(){return{};}}},abort(){aborted++}};
 const db={transaction(){return tx;},close(){closed++}};const factory={open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess();});return request;}};
 await assert.rejects(saveWorkspace('test',newWorkspace(),0,factory,5),{name:'StorageTimeoutError'});assert.equal(aborted,1);assert.equal(closed,1);
 tx.oncomplete();assert.equal(closed,1);
});
function workerHarness(behavior){let terminated=0;const worker={terminate(){terminated++},postMessage(data){behavior(worker,data)}};return {worker,createWorker:()=>worker,terminated:()=>terminated};}
test('PDF worker reports progress and returns a result, then terminates',async()=>{
 const result={blob:new Blob(['%PDF']),filename:'test.pdf',pageCount:1},progress=[];
 const h=workerHarness(worker=>queueMicrotask(()=>{worker.onmessage({data:{type:'progress',completed:1,total:1}});worker.onmessage({data:{type:'complete',result}});}));
 assert.equal(await createPdfTask({products:[]},{createWorker:h.createWorker,onProgress:p=>progress.push(p)}),result);assert.equal(h.terminated(),1);assert.equal(progress.length,1);
});
test('stalled PDF worker is terminated on timeout, and cancelled jobs cannot complete later',async()=>{
 const h=workerHarness(()=>{});await assert.rejects(createPdfTask({},{createWorker:h.createWorker,timeoutMs:5}),/timed out/);assert.equal(h.terminated(),1);
 const c=new AbortController(),h2=workerHarness(()=>{});const p=createPdfTask({},{createWorker:h2.createWorker,signal:c.signal});c.abort();await assert.rejects(p,{name:'AbortError'});h2.worker.onmessage({data:{type:'complete',result:{}}});assert.equal(h2.terminated(),1);
});
test('worker loading failure becomes a retryable error instead of an endless Preparing state',async()=>{
 const h=workerHarness(worker=>queueMicrotask(()=>worker.onerror({})));await assert.rejects(createPdfTask({},{createWorker:h.createWorker}),/could not load/);assert.equal(h.terminated(),1);
});
test('photo JPEG encoding has a deadline even when canvas.toBlob never calls back',async()=>{
 const originalImage=globalThis.Image,originalDocument=globalThis.document;
 globalThis.Image=class{naturalWidth=1200;naturalHeight=1200;decode(){return Promise.resolve()}};
 globalThis.document={createElement(){return{getContext(){return{fillRect(){},drawImage(){}}},toBlob(){}}}};
 try {await assert.rejects(prepareCataloguePhoto(new File(['photo'],'test.jpg',{type:'image/jpeg'}),{timeoutMs:5}),/processing timed out/);}finally{globalThis.Image=originalImage;globalThis.document=originalDocument;}
});
