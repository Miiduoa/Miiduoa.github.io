import { createStore, begin, reserve, commit } from './core.mjs';

let store;
let tx = { A: null, B: null };
let log = [];
const $ = s => document.querySelector(s);

function reset() {
  store = createStore({ 'SKU-RED': 10, 'SKU-BLUE': 8 });
  tx = { A: null, B: null };
  log = [{ kind: 'system', text: 'Store reset to known state.' }];
  render();
}

function note(kind, text) {
  log.unshift({ kind, text });
}

function start(id) {
  tx[id] = begin(store);
  note('info', `Clerk ${id} opened a snapshot.`);
  render();
}

function doReserve(id) {
  try {
    if (!tx[id]) throw new Error('Begin a transaction first.');
    const sku = $(`#sku-${id}`).value;
    const qty = Number($( `#qty-${id}`).value);
    reserve(tx[id], sku, qty);
    note('info', `Clerk ${id} staged -${qty} on ${sku}.`);
  } catch (error) {
    note('error', `Clerk ${id}: ${error.message}`);
  }
  render();
}

function doCommit(id) {
  try {
    if (!tx[id]) throw new Error('Begin a transaction first.');
    const result = commit(store, tx[id]);
    if (result.ok) note('ok', `Clerk ${id} committed successfully.`);
    else note('error', `Clerk ${id} hit a write conflict on ${result.conflict}.`);
  } catch (error) {
    note('error', `Clerk ${id}: ${error.message}`);
  }
  render();
}

function race() {
  reset();
  tx.A = begin(store);
  tx.B = begin(store);
  reserve(tx.A, 'SKU-RED', 6);
  reserve(tx.B, 'SKU-RED', 6);
  const first = commit(store, tx.A);
  const second = commit(store, tx.B);
  note(second.ok ? 'ok' : 'error', second.ok ? 'Both commits passed.' : 'B was rejected instead of silently overwriting A.');
  note(first.ok ? 'ok' : 'error', 'A committed -6 units from its snapshot.');
  render();
}

function txCard(id) {
  const current = tx[id];
  const snapshot = current?.snapshot ?? {};
  const writes = current?.writes ?? {};
  return `
    <article class="worker">
      <div class="worker-head"><strong>Clerk ${id}</strong><span class="status">${current?.status ?? 'no transaction'}</span></div>
      <div class="controls">
        <button data-begin="${id}">Begin</button>
        <select id="sku-${id}"><option>SKU-RED</option><option>SKU-BLUE</option></select>
        <input id="qty-${id}" type="number" min="1" value="2" aria-label="quantity">
        <button data-reserve="${id}">Reserve</button>
        <button class="primary" data-commit="${id}">Commit</button>
      </div>
      <div class="mini"><span>Snapshot</span><code>${JSON.stringify(snapshot)}</code></div>
      <div class="mini"><span>Staged writes</span><code>${JSON.stringify(writes)}</code></div>
    </article>`;
}

function render() {
  $('#stock').innerHTML = Object.entries(store.rows).map(([sku,row]) => `
    <div class="stock-row"><div><strong>${sku}</strong><span>version ${row.version}</span></div><b>${row.qty}</b></div>`).join('');
  $('#workers').innerHTML = txCard('A') + txCard('B');
  $('#log').innerHTML = log.slice(0,8).map(item => `<div class="entry ${item.kind}">${item.text}</div>`).join('');

  document.querySelectorAll('[data-begin]').forEach(b => b.onclick = () => start(b.dataset.begin));
  document.querySelectorAll('[data-reserve]').forEach(b => b.onclick = () => doReserve(b.dataset.reserve));
  document.querySelectorAll('[data-commit]').forEach(b => b.onclick = () => doCommit(b.dataset.commit));
}

$('#race').onclick = race;
$('#reset').onclick = reset;
reset();
