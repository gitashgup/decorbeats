import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
test('sharing metadata is in initial HTML with a small, public JPEG',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const key of ['og:title','og:description','og:type','og:url','og:image','og:image:width','og:image:height'])assert.ok(html.includes(`property="${key}"`),key);
 const image=html.match(/property="og:image" content="([^"]+)"/)[1];
 assert.equal(image,'https://www.decorbeats.com/assets/brand/decorbeats-share-v1.jpg');
 const file=new URL('../public/assets/brand/decorbeats-share-v1.jpg',import.meta.url);
 const bytes=readFileSync(file);
 assert.equal(bytes.subarray(0,2).toString('hex'),'ffd8');
 assert.ok(statSync(file).size<300000);
});
