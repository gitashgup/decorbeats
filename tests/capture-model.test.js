import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDraft, countTotal, readiness, SHOTS } from '../src/capture/model.js';

function complete() {
 const d=newDraft({id:1,name:'Brass diya',sku:'DB-001',quantity:12,category:'Diya',material:'Brass',mrp:500,cost_price:200});
 Object.assign(d.data,{unit:'1 piece',locations:[{name:'Room A',sellable:'3',damaged:'1'},{name:'Room B',sellable:'5',damaged:'2'}],
  allLocations:true,pricingApproved:true,stockConfirmed:true,length:'10',width:'8',height:'5',weight_g:'300',packed_length:'12',packed_width:'10',packed_height:'8',packed_weight_g:'400',photos:Object.fromEntries(SHOTS.map(s=>[s.id,{url:'https://example.com/'+s.id}]))});
 return d;
}
test('counts aggregate locations and keep damaged units out of sellable stock',()=>{
 const d=complete();assert.equal(countTotal(d.data),8);assert.equal(countTotal(d.data,'damaged'),3);assert.equal(d.baseline.quantity,12);assert.deepEqual(readiness(d),[]);
});
test('duplicate locations, fractional counts and incomplete measurements block publishing',()=>{
 const d=complete();d.data.locations[1].name=' room a ';assert.ok(readiness(d).some(x=>x.includes('duplicate')));
 d.data.locations[1].sellable='2.5';assert.ok(readiness(d).some(x=>x.includes('whole-number')));
 d.data.weight_g='';assert.ok(readiness(d).some(x=>x.includes('measurements')));
});
test('publishing requires identity, photos, stock confirmation and pricing',()=>{
 const d=complete();d.data.stockConfirmed=false;d.data.pricingApproved=false;delete d.data.photos.hero;d.data.cost_price='';
 assert.ok(readiness(d).some(x=>x.includes('controlled')));assert.ok(readiness(d).some(x=>x.includes('photographs')));assert.ok(readiness(d).some(x=>x.includes('Megha')));assert.ok(readiness(d).some(x=>x.includes('unit cost')));
});
test('a new capture starts with no invented count or measurements',()=>{
 const d=newDraft(null,'Room 1');assert.equal(d.product_id,null);assert.equal(d.data.locations[0].sellable,'');assert.equal(d.data.weight_g,'');assert.ok(readiness(d).length>0);
});
