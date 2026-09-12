import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeCaptureDraft, sameValue, updateSharedDraft} from '../src/capture/sharedDraft.js';
const base=()=>({id:'draft-1',product_id:null,status:'draft',revision:1,data:{name:'',cost_price:'',step:1,photos:{},locations:[{name:'1',sellable:''}]}});
test('phone photo merges without replacing unsaved dictated details',()=>{
 const b=base(), local=structuredClone(b), remote=structuredClone(b);
 local.data.name='Confirmed product';local.data.cost_price='170';
 remote.revision=2;remote.data.photos.hero={url:'photo-1',original:'original-1'};remote.data.phoneLastSeenAt='now';
 const result=mergeCaptureDraft(local,b,remote);
 assert.equal(result.data.name,'Confirmed product');assert.equal(result.data.cost_price,'170');
 assert.equal(result.data.photos.hero.original,'original-1');assert.equal(result.revision,2);
 assert.equal(b.data.name,'');assert.deepEqual(b.data.photos,{});
});
test('both devices changing same field or photo is blocked, different photo slots merge',()=>{
 const b=base(), local=structuredClone(b), remote=structuredClone(b);
 local.data.name='A';remote.data.name='B';assert.throws(()=>mergeCaptureDraft(local,b,remote),/Both devices/);
 local.data.name='';remote.data.name='';local.data.photos.hero={url:'A'};remote.data.photos.front={url:'B'};
 assert.deepEqual(mergeCaptureDraft(local,b,remote).data.photos,{hero:{url:'A'},front:{url:'B'}});
 remote.data.photos.hero={url:'C'};assert.throws(()=>mergeCaptureDraft(local,b,remote),/photo hero/);
});
test('sync rejects wrong draft and published record; equality handles JSON key order',()=>{
 assert.throws(()=>mergeCaptureDraft(base(),base(),{...base(),id:'other'}),/identity/);
 assert.throws(()=>mergeCaptureDraft(base(),base(),{...base(),status:'published'}),/published/);
 assert.ok(sameValue({a:1,b:{c:2}},{b:{c:2},a:1}));
});
test('optimistic retry rereads latest data and preserves concurrent Mac fields',async()=>{
 let record=base(), calls=0;
 const client={from(){return {select(){return {eq(){return {single:async()=>({data:structuredClone(record)})};}};}};},
 async rpc(_name,args){calls++;if(calls===1){record={...record,revision:2,data:{...record.data,name:'Dictated name'}};return {error:{message:'This product was changed on another device.'}};}
 assert.equal(args.p_revision,2);record={...record,revision:3,data:args.p_data};return {data:record};}};
 const saved=await updateSharedDraft(client,'draft-1',latest=>({...latest,data:{...latest.data,photos:{hero:{url:'phone-photo'}}}}));
 assert.equal(saved.data.name,'Dictated name');assert.equal(saved.data.photos.hero.url,'phone-photo');assert.equal(calls,2);
});
