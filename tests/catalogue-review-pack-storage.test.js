import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { loadReviewPack, saveReviewPack, reviewPackStorageMessage } from '../src/capture/catalogue/reviewPackStorage.js';
import { loadWorkspace, saveWorkspace } from '../src/capture/catalogue/storage.js';
import { newWorkspace, newProduct } from '../src/capture/catalogue/model.js';
const source = { datasetId: 'review-v1', title: 'Product review', products: [{id:'P1'}] };
const file = () => new Blob(['review zip'], { type: 'application/zip' });

test('review pack persists bytes and metadata across reload without altering catalogue drafts', async () => {
  const db = new IDBFactory(), workspace = newWorkspace(); workspace.products.push({...newProduct(),name:'Existing draft'});
  await saveWorkspace('owner',workspace,0,db); const before=await loadWorkspace('owner',db);
  const saved=await saveReviewPack('owner',file(),source,0,db);assert.equal(saved.revision,1);
  const restored=await loadReviewPack('owner',db);assert.equal(await restored.blob.text(),'review zip');assert.equal(restored.datasetId,source.datasetId);assert.equal(restored.count,1);
  assert.deepEqual(await loadWorkspace('owner',db),before);assert.equal(await loadReviewPack('other-owner',db),null);
});
test('review pack save uses revision checks and atomically keeps the newer inbox',async()=>{
  const db=new IDBFactory();await saveReviewPack('owner',file(),source,0,db);
  await assert.rejects(saveReviewPack('owner',new Blob(['stale']),source,0,db),{name:'ReviewPackConflictError'});
  assert.equal(await (await loadReviewPack('owner',db)).blob.text(),'review zip');
  await saveReviewPack('owner',new Blob(['new pack']),source,1,db);assert.equal((await loadReviewPack('owner',db)).revision,2);
});
test('invalid and oversized pack storage inputs fail before opening IndexedDB',async()=>{
  const db={open(){throw Error('must not open')}};
  for(const input of [null,new Blob([]),{size:31*1024*1024,arrayBuffer(){}}])await assert.rejects(saveReviewPack('owner',input,source,0,db),/30 MB/);
});
test('blocked device review storage has a bounded failure and unconfirmed-save wording',async()=>{
  await assert.rejects(loadReviewPack('owner',{open(){return {}}},10),{name:'ReviewPackStorageTimeout'});
  assert.match(reviewPackStorageMessage({name:'ReviewPackStorageTimeout'}),/could not be confirmed/);
  assert.match(reviewPackStorageMessage({name:'QuotaExceededError'}),/not enough device storage/);
});
