import test from 'node:test';
import assert from 'node:assert/strict';
import {productVideoEntries, MAX_PRODUCT_VIDEOS} from '../src/capture/reviewVideos.js';
test('multiple product videos are retained with stable ordering',()=>{
 const videos={video_b:{url:'b'},video_a:{url:'a'},unfinished:{}};
 assert.deepEqual(productVideoEntries(videos).map(([key])=>key),['video_a','video_b']);
 assert.deepEqual(productVideoEntries(),[]);
 assert.equal(MAX_PRODUCT_VIDEOS,6);
 assert.equal(videos.video_a.url,'a');
});
