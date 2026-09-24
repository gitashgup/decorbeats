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
