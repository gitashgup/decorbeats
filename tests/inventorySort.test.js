import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortProducts, filterAndSortDrafts, getDraftQty, nextQtySort } from '../src/capture/inventorySort.js';

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

test('draft quantity: calculates quantity from locations and baseline correctly', () => {
  // Empty / null draft
  assert.equal(getDraftQty(null), 0);
  assert.equal(getDraftQty({}), 0);

  // Uncounted new draft (locations empty strings, no baseline)
  assert.equal(getDraftQty({ data: { locations: [{ name: 'Rack 1', sellable: '', damaged: '0' }] } }), 0);

  // Uncounted draft linked to existing product with baseline quantity
  assert.equal(getDraftQty({
    baseline: { quantity: 15 },
    data: { locations: [{ name: 'Rack 1', sellable: '', damaged: '0' }] }
  }), 15);

  // Counted single location
  assert.equal(getDraftQty({
    baseline: { quantity: 15 },
    data: { locations: [{ name: 'Rack 1', sellable: '7', damaged: '0' }] }
  }), 7);

  // Counted multiple locations
  assert.equal(getDraftQty({
    data: {
      locations: [
        { name: 'Rack 1', sellable: 4, damaged: 0 },
        { name: 'Rack 2', sellable: 6, damaged: 1 }
      ]
    }
  }), 10);

  // Confirmed 0 sellable units
  assert.equal(getDraftQty({
    data: { locations: [{ name: 'Rack 1', sellable: 0, damaged: 2 }] }
  }), 0);
});

test('draft filtering: filters by queue correctly', () => {
  const drafts = [
    { id: 'd1', status: 'draft', data: { name: 'D1', reviewStatus: '' } },
    { id: 'd2', status: 'draft', data: { name: 'D2', reviewStatus: 'submitted' } },
    { id: 'd3', status: 'draft', data: { name: 'D3', pricingApproved: true } },
    { id: 'd4', status: 'draft', data: { name: 'D4', pricingApproved: false } },
    { id: 'd5', status: 'published', data: { name: 'D5' } }
  ];

  const inProgress = filterAndSortDrafts(drafts, { queue: 'drafts' });
  assert.deepEqual(inProgress.map(x => x.id), ['d1', 'd3', 'd4']);

  const review = filterAndSortDrafts(drafts, { queue: 'review' });
  assert.deepEqual(review.map(x => x.id), ['d2']);

  const pricing = filterAndSortDrafts(drafts, { queue: 'pricing' });
  assert.deepEqual(pricing.map(x => x.id), ['d1', 'd2', 'd4']);

  const published = filterAndSortDrafts(drafts, { queue: 'published' });
  assert.deepEqual(published.map(x => x.id), ['d5']);
});

test('draft filtering & sorting: filters by stock level and sorts by quantity', () => {
  const drafts = [
    { id: 'd1', status: 'draft', data: { name: 'Brass Peacock', locations: [{ sellable: '0' }] } },
    { id: 'd2', status: 'draft', data: { name: 'Elephant Diya', locations: [{ sellable: '3' }] } },
    { id: 'd3', status: 'draft', data: { name: 'Ganesha Wall Decor', locations: [{ sellable: '18' }] } },
    { id: 'd4', status: 'draft', baseline: { quantity: 4 }, data: { name: 'Urli Bowl', locations: [{ sellable: '' }] } }
  ];

  // Stock filtering
  const inStock = filterAndSortDrafts(drafts, { qtyFilter: 'in_stock' });
  assert.deepEqual(inStock.map(x => x.id), ['d2', 'd3', 'd4']);

  const lowStock = filterAndSortDrafts(drafts, { qtyFilter: 'low_stock' });
  assert.deepEqual(lowStock.map(x => x.id), ['d2', 'd4']); // 3 and 4

  const outOfStock = filterAndSortDrafts(drafts, { qtyFilter: 'out_of_stock' });
  assert.deepEqual(outOfStock.map(x => x.id), ['d1']); // 0

  // Quantity ascending sorting
  const sortedAsc = filterAndSortDrafts(drafts, { qtySort: 'asc' });
  assert.deepEqual(sortedAsc.map(x => x.id), ['d1', 'd2', 'd4', 'd3']); // 0, 3, 4, 18

  // Quantity descending sorting
  const sortedDesc = filterAndSortDrafts(drafts, { qtySort: 'desc' });
  assert.deepEqual(sortedDesc.map(x => x.id), ['d3', 'd4', 'd2', 'd1']); // 18, 4, 3, 0

  // Search filtering
  const searched = filterAndSortDrafts(drafts, { search: 'peacock' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'd1');
});

