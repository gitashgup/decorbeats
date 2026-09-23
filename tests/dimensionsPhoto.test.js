import test from 'node:test';
import assert from 'node:assert/strict';
import { cmToInches, formatWeight, computeScaleDimensions } from '../src/capture/photoEnhancer.js';

test('converts centimeters to inches accurately', () => {
  assert.equal(cmToInches(18), '7.1');
  assert.equal(cmToInches(14), '5.5');
  assert.equal(cmToInches(2.54), '1.0');
  assert.equal(cmToInches(25.4), '10.0');
  assert.equal(cmToInches(0), '0.0');
});

test('formats product weights in grams and kilograms', () => {
  assert.equal(formatWeight(533), '533 g');
  assert.equal(formatWeight(1450), '1,450 g (1.45 kg)');
  assert.equal(formatWeight(3200), '3,200 g (3.20 kg)');
  assert.equal(formatWeight(null), '');
});

test('computes proportional dimensions when only height or width is specified', () => {
  // cropW = 200, cropH = 400 (aspect ratio 1:2)
  const dimsOnlyHeight = computeScaleDimensions(200, 400, { height: 20 });
  assert.equal(dimsOnlyHeight.height, 20);
  assert.equal(dimsOnlyHeight.width, 10);
  assert.equal(dimsOnlyHeight.heightInches, '7.9');
  assert.equal(dimsOnlyHeight.widthInches, '3.9');

  // cropW = 600, cropH = 300 (aspect ratio 2:1)
  const dimsOnlyWidth = computeScaleDimensions(600, 300, { width: 30 });
  assert.equal(dimsOnlyWidth.width, 30);
  assert.equal(dimsOnlyWidth.height, 15);

  // Default fallback when neither is entered
  const dimsDefault = computeScaleDimensions(400, 400, {});
  assert.equal(dimsDefault.height, 15);
  assert.equal(dimsDefault.width, 15);
});
