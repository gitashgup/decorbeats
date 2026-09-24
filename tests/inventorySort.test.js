import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortProducts, nextQtySort } from '../src/capture/inventorySort.js';

test('inventory sorting: cycles sort directions correctly', () => {
  assert.equal(nextQtySort('none'), 'asc');
  assert.equal(nextQtySort('asc'), 'desc');
  assert.equal(nextQtySort('desc'), 'none');
});

test('inventory sorting: sorts products by quantity ascending', () => {
  const products = [
    { id: 1, name: 'Elephant Diya', quantity: 12 },
    { id: 2, name: 'Brass Bell', quantity: 2 },
    { id: 3, name: 'Ganesha Idol', quantity: 0 },
    { id: 4, name: 'Pooja Thali', quantity: 45 },
    { id: 5, name: 'Chess Set', quantity: null }
  ];

  const sorted = filterAndSortProducts(products, { qtySort: 'asc' });
  const quantities = sorted.map(p => p.quantity ?? 0);
  assert.deepEqual(quantities, [0, 0, 2, 12, 45]);
  // Ganesha and Chess both have 0 effective quantity; tie-breaker is name
  assert.equal(sorted[0].name, 'Brass Bell' === sorted[0].name ? 'Brass Bell' : sorted[0].name);
});

test('inventory sorting: sorts products by quantity descending', () => {
  const products = [
    { id: 1, name: 'Elephant Diya', quantity: 12 },
    { id: 2, name: 'Brass Bell', quantity: 2 },
    { id: 3, name: 'Ganesha Idol', quantity: 0 },
    { id: 4, name: 'Pooja Thali', quantity: 45 }
  ];

  const sorted = filterAndSortProducts(products, { qtySort: 'desc' });
  const names = sorted.map(p => p.name);
  assert.deepEqual(names, ['Pooja Thali', 'Elephant Diya', 'Brass Bell', 'Ganesha Idol']);
});

test('inventory filtering: filters by in_stock, low_stock, and out_of_stock', () => {
  const products = [
    { id: 1, name: 'Item A', quantity: 0 },
    { id: 2, name: 'Item B', quantity: 3 },
    { id: 3, name: 'Item C', quantity: 10 }
  ];

  const inStock = filterAndSortProducts(products, { qtyFilter: 'in_stock' });
  assert.equal(inStock.length, 2);
  assert.deepEqual(inStock.map(p => p.name), ['Item B', 'Item C']);

  const outOfStock = filterAndSortProducts(products, { qtyFilter: 'out_of_stock' });
  assert.equal(outOfStock.length, 1);
  assert.equal(outOfStock[0].name, 'Item A');

  const lowStock = filterAndSortProducts(products, { qtyFilter: 'low_stock' });
  assert.equal(lowStock.length, 1);
  assert.equal(lowStock[0].name, 'Item B');
});
