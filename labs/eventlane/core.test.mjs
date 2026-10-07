import test from 'node:test';
import assert from 'node:assert/strict';
import { createSystem, enqueue, processNext, replayDlq } from './core.mjs';

test('duplicate delivery produces one side effect', () => {
  const system = createSystem();
  enqueue(system, { id: 'e1', kind: 'charge' });
  enqueue(system, { id: 'e1', kind: 'charge' });
  processNext(system, event => event.kind);
  processNext(system, event => event.kind);
  assert.equal(system.effects.length, 1);
});

test('transient failure retries and then succeeds', () => {
  const system = createSystem();
  enqueue(system, { id: 'e1' });
  assert.equal(processNext(system, () => { throw new Error('temp'); }).status, 'retry');
  assert.equal(processNext(system, () => 'ok').status, 'processed');
  assert.equal(system.effects.length, 1);
});

test('poison event reaches dlq after max attempts', () => {
  const system = createSystem(2);
  enqueue(system, { id: 'bad' });
  processNext(system, () => { throw new Error('bad payload'); });
  processNext(system, () => { throw new Error('bad payload'); });
  assert.equal(system.dlq.length, 1);
  assert.equal(system.dlq[0].id, 'bad');
});

test('dlq replay resets attempts', () => {
  const system = createSystem(1);
  enqueue(system, { id: 'bad' });
  processNext(system, () => { throw new Error('bad'); });
  assert.equal(replayDlq(system, 'bad'), true);
  assert.equal(system.queue[0].attempts, 0);
});

test('idle is explicit when no event is ready', () => {
  const system = createSystem();
  enqueue(system, { id: 'future', availableAt: 5 });
  assert.equal(processNext(system, () => 'ok').status, 'idle');
});
