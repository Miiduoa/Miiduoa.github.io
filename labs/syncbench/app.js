import { createReplica, localWrite, mergeReplicas, snapshot, isConverged } from './core.mjs';

const initial = { title: 'Prepare release notes', status: 'todo', owner: 'Jin-Wei' };
let a;
let b;
let connected = true;
let conflicts = [];

const $ = (selector) => document.querySelector(selector);

function reset() {
  a = createReplica('A', initial);
  b = createReplica('B', initial);
  connected = true;
  conflicts = [];
  render();
}

function syncNow() {
  const merged = mergeReplicas(a, b);
  a = merged.left;
  b = merged.right;
  conflicts = merged.conflicts;
}

function write(replica, field, value) {
  localWrite(replica, field, value);
  if (connected) syncNow();
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function deviceCard(replica, label) {
  const state = snapshot(replica);
  return `
    <article class="device">
      <div class="device-head"><div><span class="dot"></span>${label}</div><code>${replica.id} · clock ${replica.counter}</code></div>
      <label>Title<input data-replica="${replica.id}" data-field="title" value="${escapeHtml(state.title ?? '')}"></label>
      <label>Status<select data-replica="${replica.id}" data-field="status">
        ${['todo','doing','blocked','done'].map(v => `<option ${state.status === v ? 'selected' : ''}>${v}</option>`).join('')}
      </select></label>
      <label>Owner<input data-replica="${replica.id}" data-field="owner" value="${escapeHtml(state.owner ?? '')}"></label>
    </article>`;
}

function renderLog() {
  const merged = mergeReplicas(a, b).left.log;
  if (!merged.length) return '<p class="empty">No local writes yet.</p>';
  return merged.slice().reverse().map(op => `
    <div class="op"><code>${op.id}</code><span>${escapeHtml(op.field)}</span><strong>${escapeHtml(op.value)}</strong></div>`).join('');
}

function render() {
  $('#devices').innerHTML = deviceCard(a, 'Laptop') + deviceCard(b, 'Phone');
  $('#linkState').textContent = connected ? 'CONNECTED' : 'OFFLINE';
  $('#linkState').className = connected ? 'pill ok' : 'pill warn';
  $('#toggle').textContent = connected ? 'Go offline' : 'Reconnect & merge';
  $('#converged').textContent = isConverged(a, b) ? 'Converged' : 'Diverged';
  $('#conflictCount').textContent = conflicts.length;
  $('#clock').textContent = Math.max(a.counter, b.counter);
  $('#log').innerHTML = renderLog();
  $('#conflicts').innerHTML = conflicts.length
    ? conflicts.map(c => `<div class="conflict"><strong>${escapeHtml(c.field)}</strong><span>${escapeHtml(c.left.value)} ↔ ${escapeHtml(c.right.value)}</span><code>winner: ${escapeHtml(c.winner.version.replica)}:${c.winner.version.counter}</code></div>`).join('')
    : '<p class="empty">No merge conflict in the last sync.</p>';

  document.querySelectorAll('[data-replica]').forEach(el => {
    el.addEventListener('change', event => {
      const replica = event.target.dataset.replica === 'A' ? a : b;
      write(replica, event.target.dataset.field, event.target.value);
    });
  });
}

$('#toggle').addEventListener('click', () => {
  if (connected) {
    connected = false;
    conflicts = [];
  } else {
    syncNow();
    connected = true;
  }
  render();
});

$('#splitEdit').addEventListener('click', () => {
  connected = false;
  localWrite(a, 'status', 'doing');
  localWrite(b, 'status', 'blocked');
  conflicts = [];
  render();
});

$('#reset').addEventListener('click', reset);
reset();
