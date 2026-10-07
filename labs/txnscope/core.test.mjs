import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, begin, reserve, commit, abort, view } from './core.mjs';

test('lost update is rejected', () => {
  const store = createStore({ A: 10 });
  const t1 = begin(store); const t2 = begin(store);
  reserve(t1, 'A', 6); reserve(t2, 'A', 6);
  assert.deepEqual(commit(store, t1), { ok: true });
  assert.deepEqual(commit(store, t2), { ok: false, conflict: 'A' });
  assert.equal(view(store).A, 4);
});

test('independent rows can commit', () => {
  const store = createStore({ A: 10, B: 10 });
  const t1 = begin(store); const t2 = begin(store);
  reserve(t1, 'A', 3); reserve(t2, 'B', 4);
  assert.equal(commit(store, t1).ok, true);
  assert.equal(commit(store, t2).ok, true);
  assert.deepEqual(view(store), { A: 7, B: 6 });
});

test('snapshot rejects over-reservation', () => {
  const store = createStore({ A: 5 });
  const tx = begin(store);
  assert.throws(() => reserve(tx, 'A', 6), /Insufficient/);
});

test('aborted transaction has no side effect', () => {
  const store = createStore({ A: 8 });
  const tx = begin(store); reserve(tx, 'A', 2); abort(tx);
  assert.deepEqual(view(store), { A: 8 });
});

test('retry after conflict succeeds with a fresh snapshot', () => {
  const store = createStore({ A: 10 });
  const stale = begin(store); const winner = begin(store);
  reserve(stale, 'A', 2); reserve(winner, 'A', 3); commit(store, winner);
  assert.equal(commit(store, stale).ok, false);
  const retry = begin(store); reserve(retry, 'A', 2);
  assert.equal(commit(store, retry).ok, true);
  assert.equal(view(store).A, 5);
});
