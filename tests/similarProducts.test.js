import test from 'node:test';
import assert from 'node:assert/strict';
import { findSimilarProducts } from '../src/capture/productMatching.js';

test('recommends exact deity and craft matches with high confidence', () => {
  const products = [
    { id: 1, name: 'Ganesha Brass Murti', sku: 'DB-BR-MURTI-01-S', category: 'Idol', material: 'Brass', quantity: 10, mrp: 1500 },
    { id: 2, name: 'Small Brass Diya', sku: 'DB-BR-DIYA-05-S', category: 'Diya', material: 'Brass', quantity: 94, mrp: 450 },
    { id: 3, name: 'Brass Kalp tree small', sku: 'DB-BR-TREE-02-S', category: 'Decor', material: 'Brass', quantity: 76, mrp: 850 }
  ];

  // Test 1: Draft is Ganesha
  const draftGanesha = {
    data: {
      name: 'Handcrafted Brass Lord Ganesha Seated Idol',
      category: 'Idols & Sculptures',
      material: 'Solid Brass'
    }
  };
  const matchesGanesha = findSimilarProducts(draftGanesha, products);
  assert.ok(matchesGanesha.length >= 1);
  assert.equal(matchesGanesha[0].product.id, 1);
  assert.ok(matchesGanesha[0].score >= 70);

  // Test 2: Draft is Diya
  const draftDiya = {
    data: {
      name: 'Handcrafted Antique Brass Oil Diya with Turtle Base',
      category: 'Diya',
      material: 'Brass'
    }
  };
  const matchesDiya = findSimilarProducts(draftDiya, products);
  assert.ok(matchesDiya.length >= 1);
  assert.equal(matchesDiya[0].product.id, 2);
  assert.ok(matchesDiya[0].score >= 70);
});

test('handles novel products with low score to signal new product', () => {
  const products = [
    { id: 1, name: 'Ganesha Brass Murti', sku: 'DB-BR-MURTI-01-S', category: 'Decor', material: 'Brass', quantity: 10 },
    { id: 2, name: 'Small Brass Diya', sku: 'DB-BR-DIYA-05-S', category: 'Diya', material: 'Brass', quantity: 94 }
  ];

  // Draft is Vishnu Sheshashayi (not in products)
  const draftVishnu = {
    data: {
      name: 'Handcrafted Brass Sheshashayi Vishnu & Lakshmi Narayan Idol',
      category: 'Idols & Sculptures',
      material: 'Solid Brass'
    }
  };
  const matches = findSimilarProducts(draftVishnu, products);
  // May match Ganesha weakly on Brass + Decor category, but score will be < 50
  if (matches.length > 0) {
    assert.ok(matches[0].score < 60);
  }
});
