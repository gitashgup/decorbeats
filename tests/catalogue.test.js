import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { newWorkspace, newProduct, newCatalogue, activeCatalogue, selectedProducts, exportErrors, numericError, productErrors, moveProduct, toggleProduct, formatPrice, formatDetails } from '../src/capture/catalogue/model.js';
import { loadWorkspace, saveWorkspace, storageMessage } from '../src/capture/catalogue/storage.js';
import { checkPhotoFile } from '../src/capture/catalogue/photos.js';
import { shareCatalogue } from '../src/capture/catalogue/share.js';

function stateWithProduct() {
  const state = newWorkspace(), product = { ...newProduct(), name: 'Lotus diya', photo: { blob: new Blob(['photo'], { type: 'image/jpeg' }), width: 1200, height: 1200 } };
  state.products.push(product); activeCatalogue(state).productIds.push(product.id); state.editingId = product.id;
  return state;
}
test('blank optional fields produce no invented facts; zero INR retained', () => {
  const p = newProduct(); assert.deepEqual(formatDetails(p), []); assert.equal(formatPrice(''), ''); assert.equal(formatPrice('0'), '₹0');
  assert.deepEqual(formatDetails({ ...p, length: '10', weight: '1.2', weightUnit: 'kg' }), ['L 10 cm', '1.2 kg']);
});
test('negative, malformed, infinite, excessive and over-precision numeric values are rejected', () => {
  for (const value of ['-1', 'Infinity', 'NaN', '1e6', '₹5', '1,200', '1.2.3', '99999999999999', '0', '1.1234']) assert.ok(numericError(value), value);
  for (const value of ['', '0.5', '200', '15.125']) assert.equal(numericError(value), '', value);
  assert.ok(productErrors({ ...newProduct(), price: '12.345' }).price);
});
test('incomplete drafts are allowed in storage but require image and name for export', async () => {
  const factory = new IDBFactory(), state = newWorkspace(), product = newProduct(); state.products.push(product); activeCatalogue(state).productIds.push(product.id);
  const saved = await saveWorkspace('a', state, 0, factory); assert.equal(saved.products.length, 1); assert.equal(exportErrors(state).length, 2);
});
test('save/resume round-trips photo blobs and protects account boundaries', async () => {
  const factory = new IDBFactory(), state = stateWithProduct(); const saved = await saveWorkspace('alice', state, 0, factory);
  const resumed = await loadWorkspace('alice', factory); assert.equal(resumed.revision, 1); assert.equal(await resumed.products[0].photo.blob.text(), 'photo'); assert.equal(resumed.editingId, state.editingId);
  assert.equal(await loadWorkspace('bob', factory), null); assert.equal(saved.schema, 1);
});
test('transaction revision prevents stale tab overwrite, leaves latest state recoverable', async () => {
  const factory = new IDBFactory(), initial = stateWithProduct(); await saveWorkspace('alice', initial, 0, factory);
  const a = await loadWorkspace('alice', factory), b = await loadWorkspace('alice', factory); a.products[0].name = 'New name'; await saveWorkspace('alice', a, 1, factory);
  b.products[0].name = 'Stale name'; await assert.rejects(saveWorkspace('alice', b, 1, factory), { name: 'SaveConflictError' });
  assert.equal((await loadWorkspace('alice', factory)).products[0].name, 'New name');
});
test('capacity failure is explicit and does not overwrite saved data', async () => {
  const factory = new IDBFactory(), state = stateWithProduct(); await saveWorkspace('alice', state, 0, factory); state.products[0].photo.blob = { size: 101 * 1024 * 1024 };
  await assert.rejects(saveWorkspace('alice', state, 1, factory), { name: 'CatalogueCapacityError' }); assert.equal((await loadWorkspace('alice', factory)).revision, 1);
  assert.match(storageMessage({ name: 'QuotaExceededError' }), /not saved/);
  assert.match(storageMessage({ name: 'CatalogueCapacityError' }), /100 MB photo limit/);
});
test('selection is unique, reversible and order remains stable', () => {
  const state = stateWithProduct(), a = state.products[0], b = { ...newProduct(), name: 'B' }; state.products.push(b); activeCatalogue(state).productIds.push(b.id, a.id);
  assert.deepEqual(selectedProducts(state).map(p => p.id), [a.id,b.id]); assert.deepEqual(moveProduct([a.id,b.id],b.id,-1), [b.id,a.id]); assert.deepEqual(moveProduct([a.id,b.id],a.id,-1), [a.id,b.id]);
  const removed = toggleProduct(state,a.id); assert.deepEqual(selectedProducts(removed).map(p => p.id), [b.id]); assert.equal(removed.products.length,2);
});
test('products can be reused in a later catalogue without duplication', () => {
  const state = stateWithProduct(), second = newCatalogue(); state.catalogues.push(second); state.activeCatalogueId = second.id;
  const next = toggleProduct(state,state.products[0].id); assert.equal(next.products.length,1); assert.equal(next.catalogues.length,2); assert.equal(selectedProducts(next).length,1);
});
test('export catches bad optional numbers and product limits', () => {
  const state = stateWithProduct(); state.products[0].price = '-3'; assert.match(exportErrors(state)[0],/number/);
  state.products = Array.from({length:51}, (_,i)=>({...newProduct(),name:`P${i}`})); activeCatalogue(state).productIds = state.products.map(p=>p.id); assert.match(exportErrors(state)[0],/50/);
});
test('file guards reject oversized, empty and non-image files', () => {
  for (const file of [{name:'x.jpg',size:0}, {name:'x.jpg',size:21*1024*1024}, {name:'x.pdf',type:'application/pdf',size:20}]) assert.throws(()=>checkPhotoFile(file));
  checkPhotoFile({name:'phone.HEIC',type:'',size:100});
});
test('native share fallback, cancellation and failure never throw or silently download', async () => {
  const file = new Blob(['x']); assert.equal(await shareCatalogue(file,{}),'unsupported');
  assert.equal(await shareCatalogue(file,{canShare:()=>false,share:()=>assert.fail()}),'unsupported');
  assert.equal(await shareCatalogue(file,{canShare:()=>{throw new Error('unsupported')},share:()=>assert.fail()}),'failed');
  assert.equal(await shareCatalogue(file,{canShare:()=>true,share:async()=>{throw new DOMException('Cancelled','AbortError')}}),'cancelled');
  assert.equal(await shareCatalogue(file,{canShare:()=>true,share:async()=>{throw new Error('No')}}),'failed');
  assert.equal(await shareCatalogue(file,{canShare:()=>true,share:async data=>assert.equal(data.files[0],file)}),'shared');
});

test('metadata-only autosaves reuse stored photo and replacement reclaims the old blob', async () => {
  const factory=new IDBFactory(), state=stateWithProduct();state.products[0].photo.assetId='first';await saveWorkspace('alice',state,0,factory);
  const resumed=await loadWorkspace('alice',factory);resumed.products[0].name='Renamed';await saveWorkspace('alice',resumed,1,factory);
  const {openCatalogueDb}=await import('../src/capture/catalogue/storage.js');
  async function storedPhotoCount(){const db=await openCatalogueDb(factory);return new Promise((resolve,reject)=>{const tx=db.transaction('photos'),request=tx.objectStore('photos').count();tx.oncomplete=()=>{db.close();resolve(request.result)};tx.onerror=()=>reject(tx.error);});}
  assert.equal(await storedPhotoCount(),1);
  resumed.products[0].photo={assetId:'replacement',blob:new Blob(['new']),width:100,height:100};await saveWorkspace('alice',resumed,2,factory);assert.equal(await storedPhotoCount(),1);assert.equal(await (await loadWorkspace('alice',factory)).products[0].photo.blob.text(),'new');
});

test('grouped views persist once each and choosing a new cover keeps every view', async () => {
 const factory=new IDBFactory(),state=stateWithProduct();const first={assetId:'view-a',blob:new Blob(['front']),width:100,height:100},second={assetId:'view-b',blob:new Blob(['side']),width:100,height:100};state.products[0].photo=first;state.products[0].photos=[first,second];await saveWorkspace('grouped',state,0,factory);
 let resumed=await loadWorkspace('grouped',factory);assert.equal(resumed.products[0].photos.length,2);assert.equal(await resumed.products[0].photos[1].blob.text(),'side');assert.equal(resumed.products[0].photo.blob,resumed.products[0].photos[0].blob);
 resumed.products[0].photo=resumed.products[0].photos[1];await saveWorkspace('grouped',resumed,1,factory);resumed=await loadWorkspace('grouped',factory);assert.equal(await resumed.products[0].photo.blob.text(),'side');assert.equal(await resumed.products[0].photos[0].blob.text(),'front');
 const {openCatalogueDb}=await import('../src/capture/catalogue/storage.js');const db=await openCatalogueDb(factory);const count=await new Promise(resolve=>{const tx=db.transaction('photos'),r=tx.objectStore('photos').count();tx.oncomplete=()=>resolve(r.result)});db.close();assert.equal(count,2);
});

test('source-review IDs with damaged metadata remain blocked from customer export',()=>{
  const state=newWorkspace(),p={...newProduct(),id:'source-review:dataset:E1',name:'Review item',photo:{blob:new Blob(['photo'])}};
  state.products=[p];state.catalogues[0].productIds=[p.id];
  assert.match(exportErrors(state).join(' '),/Confirm this WhatsApp draft/);
  p.sourceReview=null;assert.match(exportErrors(state).join(' '),/Confirm this WhatsApp draft/);
  p.sourceReview={status:'confirmed'};assert.deepEqual(exportErrors(state),[]);
});

test('large draft and PDF selections are independent, persistent and reversible',async()=>{
  const {exportProducts,setProductIncluded,setPdfSelection,reviewSummary,MAX_PRODUCTS,MAX_CATALOGUE_PRODUCTS,MAX_EXPORT_PRODUCTS}=await import('../src/capture/catalogue/model.js');
  assert.equal(MAX_PRODUCTS,200);assert.equal(MAX_CATALOGUE_PRODUCTS,200);assert.equal(MAX_EXPORT_PRODUCTS,50);
  let state=newWorkspace();state.products=Array.from({length:97},(_,i)=>({...newProduct(),name:`Candidate ${i+1}`,sourceReview:{status:'pending',facts:i===0?[{field:'catalogue_price_quote',value:100,currency:null}]:[]}}));state.catalogues[0].productIds=state.products.map(p=>p.id);
  assert.equal(selectedProducts(state).length,97);assert.equal(exportProducts(state).length,97);const errors=exportErrors(state);assert.match(errors[0],/50/);assert.ok(errors.some(e=>e.includes('Confirm this WhatsApp draft')));assert.ok(errors.some(e=>e.includes('Add a product photo')));
  assert.deepEqual(reviewSummary(selectedProducts(state)),{total:97,incomplete:97,missingPhoto:97,pendingReview:97,unconfirmedPrice:1});
  state=setPdfSelection(state,[state.products[0].id]);assert.equal(exportProducts(state).length,1);assert.equal(selectedProducts(state).length,97);assert.ok(!exportErrors(state)[0].includes('up to 50'));
  const factory=new IDBFactory();await saveWorkspace('large',state,0,factory);state=await loadWorkspace('large',factory);assert.equal(exportProducts(state)[0].id,state.products[0].id);assert.equal(selectedProducts(state).length,97);
  state=setProductIncluded(state,state.products[1].id,true);assert.equal(exportProducts(state).length,2);assert.equal(selectedProducts(state).length,97);
  state=setProductIncluded(state,state.products[0].id,false);assert.deepEqual(exportProducts(state).map(p=>p.id),[state.products[1].id]);assert.equal(state.products.length,97);
});
