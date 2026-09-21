import test from 'node:test';
import assert from 'node:assert/strict';
import { useCaptureAdmin } from '../src/adminRoute.js';

test('admin bookmarks open the upgraded workspace', () => {
  for (const path of ['/admin', '/admin/', '/admin/capture', '/admin/capture/']) {
    assert.equal(useCaptureAdmin(path), true);
  }
  assert.equal(useCaptureAdmin('/admin', '?view=pricing'), true);
  assert.equal(useCaptureAdmin('/admin/capture', '?view=movements'), true);
  assert.equal(useCaptureAdmin('/admin/capture', '?draft=a46b22a4-c766-4fb7-9e23-0a681509dd14'), true);
});
test('invitation and recovery hashes route directly to capture workspace', () => {
  assert.equal(useCaptureAdmin('/', '', '#access_token=xyz&type=invite'), true);
  assert.equal(useCaptureAdmin('/', '', '#access_token=xyz&type=recovery'), true);
  assert.equal(useCaptureAdmin('/admin', '', '#access_token=xyz&type=invite'), true);
});
test('legacy tools require explicit opt-in and storefront stays unchanged', () => {
  assert.equal(useCaptureAdmin('/admin', '?legacy=1'), false);
  assert.equal(useCaptureAdmin('/admin', '?legacy=1&view=pricing'), false);
  assert.equal(useCaptureAdmin('/'), false);
  assert.equal(useCaptureAdmin('/product/elephant'), false);
  assert.equal(useCaptureAdmin('/category/brass'), false);
  assert.equal(useCaptureAdmin('/catalogue/festive'), false);
});

