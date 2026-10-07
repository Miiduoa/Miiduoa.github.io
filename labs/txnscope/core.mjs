export function createStore(initial) {
  const rows = {};
  for (const [sku, qty] of Object.entries(initial)) rows[sku] = { qty, version: 0 };
  return { rows };
}

export function begin(store) {
  const snapshot = {};
  for (const [sku, row] of Object.entries(store.rows)) snapshot[sku] = { ...row };
  return { snapshot, writes: {}, status: 'open' };
}

export function reserve(tx, sku, qty) {
  if (tx.status !== 'open') throw new Error('Transaction is not open.');
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('Quantity must be a positive integer.');
  const base = tx.writes[sku] ?? tx.snapshot[sku];
  if (!base) throw new Error('Unknown SKU.');
  if (base.qty < qty) throw new Error('Insufficient stock in this transaction snapshot.');
  tx.writes[sku] = { qty: base.qty - qty, baseVersion: tx.snapshot[sku].version };
  return tx;
}

export function commit(store, tx) {
  if (tx.status !== 'open') throw new Error('Transaction is not open.');
  for (const [sku, write] of Object.entries(tx.writes)) {
    const live = store.rows[sku];
    if (!live || live.version !== write.baseVersion) {
      tx.status = 'conflict';
      return { ok: false, conflict: sku };
    }
  }
  for (const [sku, write] of Object.entries(tx.writes)) {
    const live = store.rows[sku];
    store.rows[sku] = { qty: write.qty, version: live.version + 1 };
  }
  tx.status = 'committed';
  return { ok: true };
}

export function abort(tx) {
  if (tx.status === 'open') tx.status = 'aborted';
}

export function view(store) {
  return Object.fromEntries(Object.entries(store.rows).map(([sku, row]) => [sku, row.qty]));
}
