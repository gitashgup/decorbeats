import test from 'node:test';
import assert from 'node:assert/strict';
import {pricePayload,saveInventoryPrices} from '../src/capture/inventoryPrices.js';
test('price saves contain only validated prices, never stock or photos',()=>{
  assert.deepEqual(pricePayload('0','1250.50'),{cost_price:0,mrp:1250.5});
  for(const pair of [['',100],[5,0],[-1,10],[1,'bad'],[Infinity,10]]) assert.throws(()=>pricePayload(...pair));
});
test('save scopes to product and original prices and reports conflicts',async()=>{
  const calls=[];
  const query={update(v){calls.push(v);return this;},eq(k,v){calls.push([k,v]);return this;},is(k,v){calls.push([k,v]);return this;},select(){return this;},async maybeSingle(){return {data:null,error:null};}};
  const client={from(name){assert.equal(name,'products');return query;}};
  await assert.rejects(saveInventoryPrices(client,{id:'one',cost_price:null,mrp:100},20,120),/changed elsewhere/);
  assert.deepEqual(calls,[{cost_price:20,mrp:120},['id','one'],['archived_at',null],['cost_price',null],['mrp',100]]);
});
