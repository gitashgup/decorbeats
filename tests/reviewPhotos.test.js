import test from 'node:test';
import assert from 'node:assert/strict';
import { editedPhotoEntries, MAX_EDITED_PHOTOS } from '../src/capture/reviewPhotos.js';
test('edited photos appear separately without replacing required captures or samples',()=>{
 const photos={hero:{url:'original',cleanedPreview:{url:'sample'}},edited_b:{url:'b'},edited_a:{url:'a'},edited_empty:{}};
 assert.deepEqual(editedPhotoEntries(photos).map(([key])=>key),['edited_a','edited_b']);
 assert.equal(photos.hero.url,'original');
 assert.equal(MAX_EDITED_PHOTOS,12);
 assert.deepEqual(editedPhotoEntries(),[]);
});
