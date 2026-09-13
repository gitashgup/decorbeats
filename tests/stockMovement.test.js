import test from 'node:test';
import assert from 'node:assert/strict';
import {stockPreview} from '../src/capture/stockMovement.js';
import {readFileSync} from 'node:fs';
test('arrival adds, dispatch subtracts, physical count replaces',()=>{
 assert.deepEqual(stockPreview(10,'arrival',3),{before:10,after:13,valid:true});
 assert.equal(stockPreview(10,'dispatch',3).after,7);
 assert.equal(stockPreview(10,'count',3).after,3);
 assert.equal(stockPreview(10,'dispatch',3,true).after,10);
 assert.equal(stockPreview(1,'dispatch',3).valid,false);
});
test('migration locks approvals, rejects stale counts and blocks duplicate references',()=>{
 const sql=readFileSync(new URL('../migrations/20260913_stock_intake.sql',import.meta.url),'utf8');
 assert.match(sql,/where id=p_id for update/);
 assert.match(sql,/r.status<>'pending'/);
 assert.match(sql,/r.expected_revision<>p.stock_revision/);
 assert.match(sql,/create unique index stock_intake_reference/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/is_decorbeats_admin/);
});
