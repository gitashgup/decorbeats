import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAsin } from '../api/import-amazon-product.js';

test('parseAsin: parses 10-character raw ASIN', () => {
  assert.equal(parseAsin('B09HXVLC76'), 'B09HXVLC76');
  assert.equal(parseAsin('b09hxvlc76'), 'B09HXVLC76');
  assert.equal(parseAsin('  B09HXVLC76  '), 'B09HXVLC76');
});

test('parseAsin: parses Amazon.in and global URLs', () => {
  assert.equal(
    parseAsin('https://www.amazon.in/dp/B09HXVLC76'),
    'B09HXVLC76'
  );
  assert.equal(
    parseAsin('https://www.amazon.in/Decorbeats-Spartan-Handcrafted-Evershine-Polished/dp/B09HXVLC76/ref=sr_1_1'),
    'B09HXVLC76'
  );
  assert.equal(
    parseAsin('https://www.amazon.com/dp/B09HXVLC76/'),
    'B09HXVLC76'
  );
  assert.equal(
    parseAsin('https://amazon.in/gp/product/B09HXVLC76'),
    'B09HXVLC76'
  );
});

test('parseAsin: returns null for invalid input', () => {
  assert.equal(parseAsin(''), null);
  assert.equal(parseAsin('https://www.amazon.in'), null);
  assert.equal(parseAsin('invalid-asin-string-too-long'), null);
});

test('api/import-amazon-product: rejects non-POST methods with 405', async () => {
  const handler = (await import('../api/import-amazon-product.js')).default;
  const req = { method: 'GET' };
  let status = null, json = null;
  const res = {
    set statusCode(c) { status = c; },
    setHeader() {},
    end(data) { json = JSON.parse(data); }
  };
  await handler(req, res);
  assert.equal(status, 405);
  assert.match(json.error, /Method not allowed/);
});

test('api/import-amazon-product: validates missing or invalid ASIN with 400', async () => {
  const handler = (await import('../api/import-amazon-product.js')).default;
  const req = {
    method: 'POST',
    body: { urlOrAsin: 'not-valid' }
  };
  let status = null, json = null;
  const res = {
    set statusCode(c) { status = c; },
    setHeader() {},
    end(data) { json = JSON.parse(data); }
  };
  await handler(req, res);
  assert.equal(status, 400);
  assert.match(json.error, /Invalid Amazon URL or ASIN/);
});

