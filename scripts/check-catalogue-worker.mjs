// Integration smoke for the emitted browser-worker bundle, using a Node bridge
// for worker message transport. This does not replace actual Safari UI testing.
import { Worker } from 'node:worker_threads';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const file=(await readdir('dist/assets')).find(name=>/^pdf\.worker-.*\.js$/.test(name));
assert.ok(file,'Build first: PDF worker bundle missing');
const workerUrl=pathToFileURL(path.resolve('dist/assets',file)).href;
const harness=`const {parentPort}=require('node:worker_threads');global.self=globalThis;self.postMessage=value=>parentPort.postMessage(value);import(${JSON.stringify(workerUrl)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`;
const worker=new Worker(harness,{eval:true});
const timeout=setTimeout(()=>{worker.terminate();throw new Error('Compiled PDF worker timed out')},15000);
try {
 const bytes=await readFile('public/assets/images/products/brass-panch-batti-diya/2.jpg');
 const result=await new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('message',message=>{if(message.type==='error')reject(new Error(message.message));else if(message.type==='complete')resolve(message.result);});worker.postMessage({title:'Worker verification',products:[{id:'test',name:'Photo and name only',photo:{blob:new Blob([bytes],{type:'image/jpeg'})}}]});});
 assert.equal(result.pageCount,1);assert.equal(result.blob.type,'application/pdf');const pdf=Buffer.from(await result.blob.arrayBuffer());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 if(process.env.CATALOGUE_WORKER_PROOF)await writeFile(process.env.CATALOGUE_WORKER_PROOF,pdf);
 console.log(`Compiled PDF worker passed: photo + name only, ${pdf.length} byte PDF`);
}finally{clearTimeout(timeout);await worker.terminate();}
