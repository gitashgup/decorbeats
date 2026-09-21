import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';

test('festive hero and campaign assets exist and are optimized', () => {
  const images = [
    '../public/assets/images/festive/dussehra-diwali-brass-urli-hero.jpg',
    '../public/assets/images/festive/festive-corporate-gifting-hero.jpg',
    '../public/assets/images/festive/dussehra-pooja-sacred-brass-hero.jpg',
    '../public/assets/images/decorbeats-atelier-campaign-v2.jpg'
  ];

  for (const relPath of images) {
    const fileUrl = new URL(relPath, import.meta.url);
    assert.ok(existsSync(fileUrl), `Missing asset: ${relPath}`);
    const bytes = readFileSync(fileUrl);
    // Verify JPEG magic bytes
    assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8', `Invalid JPEG format: ${relPath}`);
    const size = statSync(fileUrl).size;
    assert.ok(size > 50000 && size < 600000, `Asset size out of expected bounds (~50KB-600KB): ${size} bytes for ${relPath}`);
  }
});

test('storefront App.jsx contains Dussehra and Deepawali festive edit and no stale summer sale', () => {
  const appCode = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

  // Assert festive announcements & tickers
  assert.ok(appCode.includes('Dussehra & Deepawali Festive Edit is now live'), 'Missing Dussehra & Deepawali announcement');
  assert.ok(appCode.includes('Dussehra & Deepawali Festive Edit'), 'Missing festive edit header');
  assert.ok(!appCode.includes('Summer Sale Live'), 'Stale Summer Sale announcement should not be active');

  // Assert Festive Edit component and Editorial Atelier integration
  assert.ok(appCode.includes('function CustomerFestiveEdit'), 'CustomerFestiveEdit component missing');
  assert.ok(appCode.includes('<CustomerFestiveEdit'), 'CustomerFestiveEdit not rendered in storefront');
  assert.ok(appCode.includes('decorbeats-atelier-campaign-v2.jpg'), 'EditorialSection missing atelier campaign artwork');
  assert.ok(appCode.includes('Festive Brass Spotlight'), 'Festive Brass Spotlight headline missing');
});
