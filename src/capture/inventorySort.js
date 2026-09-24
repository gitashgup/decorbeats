export function nextQtySort(current) {
  if (current === 'asc') return 'desc';
  if (current === 'desc') return 'none';
  return 'asc';
}

export function filterAndSortProducts(products = [], { search = '', qtySort = 'none', qtyFilter = 'all' } = {}) {
  const query = search.trim().toLowerCase();

  let list = products.filter(p => {
    // Search query matching
    if (query) {
      const match = [p.name, p.sku, p.category, p.material].some(x =>
        String(x || '').toLowerCase().includes(query)
      );
      if (!match) return false;
    }

    // Quantity filtering
    const qty = Number(p.quantity ?? 0);
    if (qtyFilter === 'in_stock') {
      return qty > 0;
    }
    if (qtyFilter === 'out_of_stock') {
      return qty === 0;
    }
    if (qtyFilter === 'low_stock') {
      return qty > 0 && qty <= 5;
    }

    return true;
  });

  // Quantity sorting
  if (qtySort === 'asc') {
    list = [...list].sort((a, b) => {
      const qa = a.quantity == null ? 0 : Number(a.quantity);
      const qb = b.quantity == null ? 0 : Number(b.quantity);
      if (qa !== qb) return qa - qb;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  } else if (qtySort === 'desc') {
    list = [...list].sort((a, b) => {
      const qa = a.quantity == null ? 0 : Number(a.quantity);
      const qb = b.quantity == null ? 0 : Number(b.quantity);
      if (qa !== qb) return qb - qa;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  return list;
}

export function getDraftQty(row) {
  if (!row) return 0;
  const data = row.data || {};
  const locations = data.locations;
  if (Array.isArray(locations) && locations.length > 0) {
    const hasSellable = locations.some(
      l => l.sellable !== '' && l.sellable != null && !Number.isNaN(Number(l.sellable))
    );
    if (hasSellable) {
      return locations.reduce((sum, l) => sum + (Number(l.sellable) || 0), 0);
    }
  }
  if (row.baseline?.quantity != null && !Number.isNaN(Number(row.baseline.quantity))) {
    return Number(row.baseline.quantity);
  }
  return 0;
}

export function filterAndSortDrafts(drafts = [], { search = '', qtySort = 'none', qtyFilter = 'all', queue = '' } = {}) {
  const query = search.trim().toLowerCase();

  let list = drafts.filter(row => {
    // Queue filter
    if (queue === 'published') {
      if (row.status !== 'published') return false;
    } else if (queue === 'review') {
      if (row.status !== 'draft' || row.data?.reviewStatus !== 'submitted') return false;
    } else if (queue === 'drafts') {
      if (row.status !== 'draft' || row.data?.reviewStatus === 'submitted') return false;
    } else if (queue === 'pricing') {
      if (row.status !== 'draft' || row.data?.pricingApproved) return false;
    } else if (queue === 'capture') {
      // capture queue shows active inventory products, drafts should not appear
      return false;
    }

    // Search query matching
    if (query) {
      const data = row.data || {};
      const baseline = row.baseline || {};
      const match = [
        data.name,
        data.sku,
        data.category,
        data.material,
        baseline.name,
        baseline.sku
      ].some(x => String(x || '').toLowerCase().includes(query));
      if (!match) return false;
    }

    // Quantity filtering
    const qty = getDraftQty(row);
    if (qtyFilter === 'in_stock') {
      return qty > 0;
    }
    if (qtyFilter === 'out_of_stock') {
      return qty === 0;
    }
    if (qtyFilter === 'low_stock') {
      return qty > 0 && qty <= 5;
    }

    return true;
  });

  // Quantity sorting
  if (qtySort === 'asc') {
    list = [...list].sort((a, b) => {
      const qa = getDraftQty(a);
      const qb = getDraftQty(b);
      if (qa !== qb) return qa - qb;
      const nameA = String(a.data?.name || a.baseline?.name || '');
      const nameB = String(b.data?.name || b.baseline?.name || '');
      return nameA.localeCompare(nameB);
    });
  } else if (qtySort === 'desc') {
    list = [...list].sort((a, b) => {
      const qa = getDraftQty(a);
      const qb = getDraftQty(b);
      if (qa !== qb) return qb - qa;
      const nameA = String(a.data?.name || a.baseline?.name || '');
      const nameB = String(b.data?.name || b.baseline?.name || '');
      return nameA.localeCompare(nameB);
    });
  }

  return list;
}

