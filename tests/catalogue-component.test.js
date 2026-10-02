import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
import { build } from 'esbuild';
import React from 'react';
import { loadWorkspace, saveWorkspace } from '../src/capture/catalogue/storage.js';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/admin/capture?catalogue-preview=1'});
globalThis.window=dom.window; globalThis.document=dom.window.document; globalThis.HTMLElement=dom.window.HTMLElement; globalThis.MutationObserver=dom.window.MutationObserver; globalThis.getComputedStyle=dom.window.getComputedStyle;
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.scrollTo=()=>{}; globalThis.IS_REACT_ACT_ENVIRONMENT=true;
await mkdir('.catalogue-test-build',{recursive:true});
await build({entryPoints:['src/capture/catalogue/CatalogueStudio.jsx'],outfile:'.catalogue-test-build/CatalogueStudio.mjs',bundle:true,format:'esm',platform:'node',define:{'import.meta.env.DEV':'true'},packages:'external',loader:{'.css':'empty'}});
const {default:CatalogueStudio}=await import('../.catalogue-test-build/CatalogueStudio.mjs');
const {render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
afterEach(()=>cleanup());
let count=0;
async function open() { globalThis.indexedDB=new IDBFactory(); const ownerId=`test-${++count}`; render(React.createElement(React.StrictMode,null,React.createElement(CatalogueStudio,{ownerId,reviewOnly:true}))); await screen.findByLabelText(/Product name/); return `review:${ownerId}`; }
async function saved() { await waitFor(()=>assert.ok(screen.getByText('Saved on this device',{exact:true}))); }

test('component autosaves every latest field, resumes incomplete draft and blocks export',async()=>{
  const owner=await open(); fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Unfinished product'}}); fireEvent.change(screen.getByLabelText(/Price ₹/),{target:{value:'-1'}}); await saved();
  const state=await loadWorkspace(owner); assert.equal(state.products.length,1); assert.equal(state.products[0].name,'Unfinished product'); assert.equal(state.products[0].price,'-1');
  fireEvent.click(screen.getByRole('button',{name:/Preview catalogue/})); assert.match(screen.getByRole('alert').textContent,/Add a product photo/); assert.equal(screen.queryByRole('button',{name:/Download PDF/}),null);
  cleanup(); render(React.createElement(CatalogueStudio,{ownerId:owner.slice(7),reviewOnly:true})); await waitFor(()=>assert.equal(screen.getByLabelText(/Product name/).value,'Unfinished product')); assert.equal(screen.getByLabelText(/Price ₹/).value,'-1');
});
test('save and repeated clicks create no duplicate product; reuse and reorder are stable',async()=>{
  const owner=await open(); fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'First'}}); await saved(); const add=screen.getByRole('button',{name:/Save & add another/}); fireEvent.click(add);fireEvent.click(add); await waitFor(()=>assert.equal(screen.getByLabelText(/Product name/).value,''));
  fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Second'}}); await saved();fireEvent.click(screen.getByRole('button',{name:'Move Second up'}));await saved();let state=await loadWorkspace(owner);assert.equal(state.products.length,2);assert.equal(state.catalogues[0].productIds[0],state.products[1].id);
  fireEvent.click(screen.getByRole('button',{name:/Your catalogues/}));fireEvent.click(screen.getByRole('button',{name:/Start a new catalogue/}));await waitFor(()=>assert.ok(screen.getByRole('checkbox',{name:'First'})));fireEvent.click(screen.getByRole('checkbox',{name:'First'}));await saved();state=await loadWorkspace(owner);assert.equal(state.products.length,2);assert.equal(state.catalogues.length,2);assert.deepEqual(state.catalogues[1].productIds,[state.products[0].id]);
});
test('another-tab conflict never overwrites persisted products and shows an unsaved warning',async()=>{
  const owner=await open();fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Initial'}});await saved();const other=await loadWorkspace(owner);other.products[0].name='Changed elsewhere';await saveWorkspace(owner,other,other.revision);
  fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Stale tab edit'}});await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/another tab/));assert.equal((await loadWorkspace(owner)).products[0].name,'Changed elsewhere');assert.ok(screen.getByText('Changes not saved'));
});
test('unavailable IndexedDB fails visibly without creating an in-memory success claim',async()=>{
  globalThis.indexedDB={open(){throw new Error('Unavailable')}};render(React.createElement(CatalogueStudio,{ownerId:'no-storage',reviewOnly:true}));await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/Could not save/));assert.equal(screen.queryByLabelText(/Product name/),null);
});
test('invalid file fails visibly and does not add or replace a product',async()=>{
  const owner=await open(); const input=document.querySelector('.dc-editor input[type=file]');fireEvent.change(input,{target:{files:[new File(['no'],'wrong.pdf',{type:'application/pdf'})]}});await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/Choose a JPEG/));await saved();assert.equal((await loadWorkspace(owner)).products.length,0);
});

test('product capacity leaves saved status unchanged instead of hanging on Saving',async()=>{
  globalThis.indexedDB=new IDBFactory();const {newWorkspace,newProduct}=await import('../src/capture/catalogue/model.js');const state=newWorkspace();state.products=Array.from({length:100},()=>newProduct());await saveWorkspace('review:full',state,0);render(React.createElement(CatalogueStudio,{ownerId:'full',reviewOnly:true}));await screen.findByLabelText(/Product name/);fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'One too many'}});assert.match(screen.getByRole('alert').textContent,/100 products/);assert.ok(screen.getByText('Saved on this device',{exact:true}));assert.equal((await loadWorkspace('review:full')).products.length,100);
});

test('a valid photo and name can preview without waiting for a stuck device autosave',async()=>{
  const owner=await open(); await saved();
  const nativeWorker=globalThis.Worker, nativeDb=globalThis.indexedDB;
  globalThis.Worker=class{terminate(){}postMessage(input){assert.equal(input.products[0].name,'Name and photo only');queueMicrotask(()=>this.onmessage({data:{type:'complete',result:{blob:new Blob(['%PDF-test']),filename:'test.pdf',pageCount:1}}}));}};
  const state=await loadWorkspace(owner);const {newProduct}=await import('../src/capture/catalogue/model.js');const product={...newProduct(),name:'Name and photo only',photo:{blob:new Blob(['photo'],{type:'image/jpeg'}),width:1200,height:1200}};state.products.push(product);state.catalogues[0].productIds.push(product.id);state.editingId=product.id;await saveWorkspace(owner,state,state.revision);
  cleanup();render(React.createElement(CatalogueStudio,{ownerId:owner.slice(7),reviewOnly:true}));await waitFor(()=>assert.equal(screen.getByLabelText(/Product name/).value,'Name and photo only'));
  globalThis.indexedDB={open(){return {}}};
  try {
    fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Name and photo only '}});fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Name and photo only'}});
    fireEvent.click(screen.getByRole('button',{name:/Preview catalogue/}));await screen.findByRole('button',{name:/Download PDF/});assert.equal(screen.queryByText('Please wait…'),null);
  }finally{cleanup();globalThis.Worker=nativeWorker;globalThis.indexedDB=nativeDb;}
});
test('PDF preparation can be cancelled and returns to the editable product',async()=>{
  const owner=await open();await saved();const nativeWorker=globalThis.Worker;let terminated=0;globalThis.Worker=class{terminate(){terminated++}postMessage(){}};
  const state=await loadWorkspace(owner);const {newProduct}=await import('../src/capture/catalogue/model.js');const p={...newProduct(),name:'Cancel test',photo:{blob:new Blob(['photo']),width:1200,height:1200}};state.products.push(p);state.catalogues[0].productIds.push(p.id);state.editingId=p.id;await saveWorkspace(owner,state,state.revision);
  cleanup();render(React.createElement(CatalogueStudio,{ownerId:owner.slice(7),reviewOnly:true}));await screen.findByLabelText(/Product name/);
  try{fireEvent.click(screen.getByRole('button',{name:/Preview catalogue/}));await screen.findByRole('button',{name:'Cancel',exact:true});fireEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));await waitFor(()=>assert.equal(screen.getByLabelText(/Product name/).disabled,false));assert.equal(screen.getByLabelText(/Product name/).value,'Cancel test');assert.equal(terminated,1);}finally{globalThis.Worker=nativeWorker;}
});

test('successful autosave does not erase a PDF preparation error',async()=>{
  const owner=await open();await saved();const nativeWorker=globalThis.Worker;globalThis.Worker=class{terminate(){}postMessage(){queueMicrotask(()=>this.onerror({}));}};
  const state=await loadWorkspace(owner);const {newProduct}=await import('../src/capture/catalogue/model.js');const p={...newProduct(),name:'Keep error',photo:{blob:new Blob(['photo']),width:1200,height:1200}};state.products.push(p);state.catalogues[0].productIds.push(p.id);state.editingId=p.id;await saveWorkspace(owner,state,state.revision);
  cleanup();render(React.createElement(CatalogueStudio,{ownerId:owner.slice(7),reviewOnly:true}));await screen.findByLabelText(/Product name/);
  try{fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Keep PDF error'}});fireEvent.click(screen.getByRole('button',{name:/Preview catalogue/}));await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/PDF tools could not load/));await saved();assert.match(screen.getByRole('alert').textContent,/PDF tools could not load/);}finally{globalThis.Worker=nativeWorker;}
});

test('Next, Back and swipe preserve unfinished edits while optional fields remain blank',async()=>{
 globalThis.indexedDB=new IDBFactory();const {newWorkspace,newProduct}=await import('../src/capture/catalogue/model.js');const state=newWorkspace();state.products=[{...newProduct(),name:'First',photo:{assetId:'first',blob:new Blob(['front']),width:100,height:100}},{...newProduct(),name:'Second',photo:{assetId:'second',blob:new Blob(['second']),width:100,height:100}}];state.catalogues[0].productIds=state.products.map(p=>p.id);state.editingId=state.products[0].id;await saveWorkspace('review:navigation',state,0);
 render(React.createElement(CatalogueStudio,{ownerId:'navigation',reviewOnly:true}));await screen.findByLabelText(/Product name/);fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'First edited'}});fireEvent.click(screen.getByRole('button',{name:'Next →',exact:true}));assert.equal(screen.getByLabelText(/Product name/).value,'Second');fireEvent.click(screen.getByRole('button',{name:'← Back',exact:true}));assert.equal(screen.getByLabelText(/Product name/).value,'First edited');
 const card=screen.getByRole('region',{name:'Product template'});fireEvent.touchStart(card,{touches:[{clientX:280,clientY:100}]});fireEvent.touchEnd(card,{changedTouches:[{clientX:90,clientY:110}]});assert.equal(screen.getByLabelText(/Product name/).value,'Second');await saved();const restored=await loadWorkspace('review:navigation');assert.equal(restored.products[0].name,'First edited');assert.equal(restored.products[0].price,'');assert.equal(restored.products[0].length,'');
});
test('grouped view cover can be changed without adding a duplicate product',async()=>{
 globalThis.indexedDB=new IDBFactory();const {newWorkspace,newProduct}=await import('../src/capture/catalogue/model.js');const state=newWorkspace(),views=[{assetId:'front',blob:new Blob(['front']),width:100,height:100},{assetId:'side',blob:new Blob(['side']),width:100,height:100}],product={...newProduct(),name:'Grouped product',photo:views[0],photos:views};state.products=[product];state.catalogues[0].productIds=[product.id];state.editingId=product.id;await saveWorkspace('review:covers',state,0);
 render(React.createElement(CatalogueStudio,{ownerId:'covers',reviewOnly:true}));await screen.findByLabelText(/Product name/);fireEvent.click(screen.getByRole('button',{name:'Use view 2 as cover'}));await saved();const restored=await loadWorkspace('review:covers');assert.equal(restored.products.length,1);assert.equal(restored.products[0].photos.length,2);assert.equal(restored.products[0].photo.assetId,'side');
});

test('swipe cannot navigate or restart Saving after a conflicting save blocks editing',async()=>{
 globalThis.indexedDB=new IDBFactory();const {newWorkspace,newProduct}=await import('../src/capture/catalogue/model.js');const state=newWorkspace();state.products=[{...newProduct(),name:'Conflict first'},{...newProduct(),name:'Conflict second'}];state.catalogues[0].productIds=state.products.map(p=>p.id);state.editingId=state.products[0].id;await saveWorkspace('review:swipe-conflict',state,0);
 render(React.createElement(CatalogueStudio,{ownerId:'swipe-conflict',reviewOnly:true}));await screen.findByLabelText(/Product name/);const other=await loadWorkspace('review:swipe-conflict');other.products[0].name='Other tab';await saveWorkspace('review:swipe-conflict',other,other.revision);
 fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Local edit'}});await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/another tab/));const card=screen.getByRole('region',{name:'Product template'});fireEvent.touchStart(card,{touches:[{clientX:280,clientY:100}]});fireEvent.touchEnd(card,{changedTouches:[{clientX:90,clientY:110}]});assert.equal(screen.getByLabelText(/Product name/).value,'Local edit');assert.ok(!!screen.getByText('Changes not saved'));assert.equal(screen.queryByText('Saving on this device…'),null);
});

test('WhatsApp review does not replace existing drafts and never guesses optional fields',async()=>{
  globalThis.indexedDB=new IDBFactory();
  const source={datasetId:'wa-test',assetBase:'/review-source/',products:[{id:'C1',working_name:'Collage diya',name_status:'visual_working_label',category:'collage_candidate',facts:[{field:'catalogue_price_quote',value:1100,currency:null,basis:null}],review_flags:['Needs individual photo'],source_message_ids:['msg-1'],media:[]}]};
  render(React.createElement(CatalogueStudio,{ownerId:'source-test',reviewOnly:true,reviewSource:source}));
  await screen.findByLabelText(/Product name/);fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'My existing draft'}});await saved();
  fireEvent.click(screen.getByRole('button',{name:'Review WhatsApp products'}));fireEvent.click(screen.getByRole('button',{name:/C1.*Collage reference/}));
  fireEvent.click(screen.getByRole('button',{name:'Add draft · photo needed'}));
  await waitFor(()=>assert.equal(screen.getByLabelText(/Product name/).value,'Collage diya'));await saved();
  let state=await loadWorkspace('review:source-test');assert.equal(state.products.length,2);assert.equal(state.products[0].name,'My existing draft');
  const imported=state.products[1];assert.equal(imported.price,'');assert.equal(imported.length,'');assert.equal(imported.photo,null);assert.equal(imported.sourceReview.status,'pending');
  fireEvent.click(screen.getByRole('button',{name:/Preview catalogue/}));assert.match(screen.getByRole('alert').textContent,/Confirm this WhatsApp draft/);
  fireEvent.click(screen.getByRole('button',{name:'Confirm 1100 as the INR selling price'}));assert.equal(screen.getByLabelText(/Price ₹/).value,'1100');await saved();
  fireEvent.click(screen.getByRole('button',{name:'Review WhatsApp products'}));fireEvent.click(screen.getByRole('button',{name:/C1.*Added on this device/}));fireEvent.click(screen.getByRole('button',{name:'Open your existing draft'}));await saved();
  state=await loadWorkspace('review:source-test');assert.equal(state.products.length,2);assert.equal(state.products[1].price,'1100');assert.equal(state.products[1].sourceReview.status,'pending');
});

test('review confirmation is required again after editing an imported product',async()=>{
  globalThis.indexedDB=new IDBFactory();const {newWorkspace,newProduct,exportErrors}=await import('../src/capture/catalogue/model.js');
  const state=newWorkspace();const product={...newProduct(),name:'Reviewed diya',photo:{blob:new Blob(['photo']),width:1200,height:1200},sourceReview:{status:'confirmed',datasetId:'wa-test',candidateId:'E1',workingName:'Diya',nameStatus:'Working label',facts:[],reviewFlags:[],sourceMessageIds:[]}};
  state.products=[product];state.catalogues[0].productIds=[product.id];state.editingId=product.id;await saveWorkspace('review:source-confirm',state,0);
  render(React.createElement(CatalogueStudio,{ownerId:'source-confirm',reviewOnly:true}));await screen.findByLabelText(/Product name/);
  const checkbox=screen.getByRole('checkbox',{name:/I checked the photo/});assert.equal(checkbox.checked,true);
  fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Changed reviewed name'}});assert.equal(checkbox.checked,false);await saved();assert.match(exportErrors(await loadWorkspace('review:source-confirm')).join(' '),/Confirm this WhatsApp draft/);
  fireEvent.click(checkbox);await saved();assert.equal((await loadWorkspace('review:source-confirm')).products[0].sourceReview.status,'confirmed');assert.deepEqual(exportErrors(await loadWorkspace('review:source-confirm')),[]);
});

test('failed source photo and cancellation keep existing products unchanged and permit draft-only fallback',async()=>{
  globalThis.indexedDB=new IDBFactory();const originalFetch=globalThis.fetch;
  const source={datasetId:'wa-failure',assetBase:'/review-source/',products:[{id:'E1',working_name:'Source diya',category:'product_draft',name_status:'working label',facts:[],review_flags:[],source_message_ids:['msg-2'],media:[{asset_path:'assets/diya.jpg',role:'product_photo'}]}]};
  render(React.createElement(CatalogueStudio,{ownerId:'source-failure',reviewOnly:true,reviewSource:source}));await screen.findByLabelText(/Product name/);await saved();
  fireEvent.click(screen.getByRole('button',{name:'Review WhatsApp products'}));fireEvent.click(screen.getByRole('button',{name:/E1.*Review candidate/}));
  try {
    globalThis.fetch=async()=>({ok:false});fireEvent.click(screen.getByRole('button',{name:'Add draft with this photo'}));await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/could not be loaded/));assert.equal((await loadWorkspace('review:source-failure')).products.length,0);
    globalThis.fetch=()=>new Promise(()=>{});fireEvent.click(screen.getByRole('button',{name:'Add draft with this photo'}));fireEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/Import cancelled/));assert.equal((await loadWorkspace('review:source-failure')).products.length,0);
    fireEvent.click(screen.getByRole('button',{name:'Add without photo'}));await waitFor(()=>assert.equal(screen.getByLabelText(/Product name/).value,'Source diya'));await saved();const state=await loadWorkspace('review:source-failure');assert.equal(state.products.length,1);assert.equal(state.products[0].photo,null);assert.equal(state.products[0].sourceReview.status,'pending');
  } finally {globalThis.fetch=originalFetch;}
});

test('device review pack imports and resumes locally while preserving product drafts',async()=>{
  globalThis.indexedDB=new IDBFactory();const originalWorker=globalThis.Worker,originalFetch=globalThis.fetch;
  const source={datasetId:'wa-local',title:'Review pack',products:[{id:'C1',working_name:'Local collage candidate',name_status:'working label',category:'collage_candidate',facts:[],review_flags:['Needs individual photo'],source_message_ids:['test-message'],media:[{asset_path:'assets/local.jpg',role:'collage_reference'}]}],assets:{'assets/local.jpg':new Blob(['local photo'],{type:'image/jpeg'})}};
  globalThis.Worker=class{terminate(){}postMessage(){queueMicrotask(()=>this.onmessage({data:{type:'complete',result:source}}));}};
  globalThis.fetch=()=>{throw Error('Local pack must not fetch data');};
  try {
    render(React.createElement(CatalogueStudio,{ownerId:'pack-local',reviewOnly:true}));await screen.findByLabelText(/Product name/);fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Keep my draft'}});await saved();
    await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Import review ZIP'}).disabled,false));
    fireEvent.change(document.querySelector('.dc-pack-import input[type=file]'),{target:{files:[new File([new Uint8Array(32)],'review.zip',{type:'application/zip'})]}});
    await screen.findByText('1 review candidates · saved on this device');fireEvent.click(screen.getByRole('button',{name:'Review WhatsApp products'}));
    await waitFor(()=>assert.match(document.querySelector('.dc-source-card img').getAttribute('src'),/^blob:/));
    assert.equal((await loadWorkspace('review:pack-local')).products[0].name,'Keep my draft');
    cleanup();render(React.createElement(CatalogueStudio,{ownerId:'pack-local',reviewOnly:true}));await screen.findByText('1 review candidates · saved on this device');assert.equal(screen.getByLabelText(/Product name/).value,'Keep my draft');assert.ok(screen.getByRole('button',{name:'Review WhatsApp products'}));
  } finally {cleanup();globalThis.Worker=originalWorker;globalThis.fetch=originalFetch;}
});

test('review ZIP validation error keeps the existing workspace and allows retry',async()=>{
  globalThis.indexedDB=new IDBFactory();const originalWorker=globalThis.Worker;
  globalThis.Worker=class{terminate(){}postMessage(){queueMicrotask(()=>this.onmessage({data:{type:'error',message:'This review pack has an invalid photo hash.'}}));}};
  try {
    render(React.createElement(CatalogueStudio,{ownerId:'pack-invalid',reviewOnly:true}));await screen.findByLabelText(/Product name/);fireEvent.change(screen.getByLabelText(/Product name/),{target:{value:'Do not lose'}});await saved();await screen.findByRole('button',{name:'Import review ZIP'});
    fireEvent.change(document.querySelector('.dc-pack-import input[type=file]'),{target:{files:[new File([new Uint8Array(32)],'review.zip',{type:'application/zip'})]}});
    await waitFor(()=>assert.match(screen.getByRole('alert').textContent,/invalid photo hash/));assert.equal(screen.getByRole('button',{name:'Import review ZIP'}).disabled,false);assert.equal((await loadWorkspace('review:pack-invalid')).products[0].name,'Do not lose');
  } finally {cleanup();globalThis.Worker=originalWorker;}
});

test('leaving during review-pack import terminates parsing and cannot save a late result',async()=>{
  globalThis.indexedDB=new IDBFactory();const originalWorker=globalThis.Worker;let worker,terminated=0;
  globalThis.Worker=class{constructor(){worker=this;}terminate(){terminated++;}postMessage(){}};
  try {
    render(React.createElement(CatalogueStudio,{ownerId:'pack-unmount',reviewOnly:true}));await screen.findByLabelText(/Product name/);await saved();await screen.findByRole('button',{name:'Import review ZIP'});
    fireEvent.change(document.querySelector('.dc-pack-import input[type=file]'),{target:{files:[new File([new Uint8Array(32)],'review.zip',{type:'application/zip'})]}});
    await waitFor(()=>assert.ok(worker));cleanup();assert.equal(terminated,1);
    worker.onmessage({data:{type:'complete',result:{datasetId:'late',title:'Late pack',products:[],assets:{}}}});
    await new Promise(resolve=>setTimeout(resolve,20));const {loadReviewPack}=await import('../src/capture/catalogue/reviewPackStorage.js');assert.equal(await loadReviewPack('review:pack-unmount'),null);
  } finally {cleanup();globalThis.Worker=originalWorker;}
});
