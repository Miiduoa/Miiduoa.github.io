import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplica, localWrite, mergeReplicas, snapshot, isConverged } from './core.mjs';

const seed = { title: 'Ship portfolio', status: 'todo', owner: 'Jin-Wei' };

test('offline edits on different fields both survive merge', () => {
  const a = createReplica('A', seed);
  const b = createReplica('B', seed);
  localWrite(a, 'status', 'doing');
  localWrite(b, 'owner', 'Team');
  const result = mergeReplicas(a, b);
  assert.deepEqual(snapshot(result.left), { title: 'Ship portfolio', status: 'doing', owner: 'Team' });
  assert.ok(isConverged(result.left, result.right));
});

test('same-field ties resolve deterministically by replica id', () => {
  const a = createReplica('A', seed);
  const b = createReplica('B', seed);
  localWrite(a, 'title', 'A edit');
  localWrite(b, 'title', 'B edit');
  const first = mergeReplicas(a, b);
  const second = mergeReplicas(b, a);
  assert.equal(snapshot(first.left).title, 'B edit');
  assert.equal(snapshot(second.left).title, 'B edit');
});

test('merge is idempotent after convergence', () => {
  const a = createReplica('A', seed);
  const b = createReplica('B', seed);
  localWrite(a, 'status', 'done');
  const first = mergeReplicas(a, b);
  const again = mergeReplicas(first.left, first.right);
  assert.deepEqual(snapshot(again.left), snapshot(first.left));
  assert.equal(again.left.log.length, first.left.log.length);
});

test('later logical clock wins over replica-id tie break', () => {
  const a = createReplica('A', seed);
  const b = createReplica('B', seed);
  localWrite(a, 'owner', 'A1');
  localWrite(a, 'owner', 'A2');
  localWrite(b, 'owner', 'B1');
  const result = mergeReplicas(a, b);
  assert.equal(snapshot(result.left).owner, 'A2');
});
