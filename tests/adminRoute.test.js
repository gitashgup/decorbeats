import test from 'node:test';
import assert from 'node:assert/strict';
import { useCaptureAdmin } from '../src/adminRoute.js';

test('admin bookmarks open the upgraded workspace', () => {
  for (const path of ['/admin', '/admin/', '/admin/capture', '/admin/capture/']) {
    assert.equal(useCaptureAdmin(path), true);
  }
  assert.equal(useCaptureAdmin('/admin', '?view=pricing'), true);
});
test('legacy tools require explicit opt-in and storefront stays unchanged', () => {
  assert.equal(useCaptureAdmin('/admin', '?legacy=1'), false);
  assert.equal(useCaptureAdmin('/'), false);
  assert.equal(useCaptureAdmin('/product/elephant'), false);
});
