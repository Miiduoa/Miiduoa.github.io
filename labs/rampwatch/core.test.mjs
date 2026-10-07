import test from 'node:test';
import assert from 'node:assert/strict';
import { wilson, assessRelease, nextTraffic } from './core.mjs';

test('wilson interval stays within probability bounds', () => {
  const [lo, hi] = wilson(0, 100);
  assert.equal(lo, 0);
  assert.ok(hi > 0 && hi < 0.05);
});

test('healthy canary advances', () => {
  const r = assessRelease({ baselineRequests: 10000, baselineErrors: 100, baselineP95: 220, canaryRequests: 2500, canaryErrors: 23, canaryP95: 228 });
  assert.equal(r.decision, 'ADVANCE');
  assert.equal(nextTraffic(10, r.decision), 25);
});

test('high latency triggers rollback', () => {
  const r = assessRelease({ baselineRequests: 10000, baselineErrors: 100, baselineP95: 200, canaryRequests: 2500, canaryErrors: 25, canaryP95: 270 });
  assert.equal(r.decision, 'ROLLBACK');
});

test('small cohort is held even when metrics look healthy', () => {
  const r = assessRelease({ baselineRequests: 10000, baselineErrors: 100, baselineP95: 200, canaryRequests: 120, canaryErrors: 1, canaryP95: 202 });
  assert.equal(r.decision, 'HOLD');
});

test('clear error regression triggers rollback', () => {
  const r = assessRelease({ baselineRequests: 20000, baselineErrors: 100, baselineP95: 200, canaryRequests: 5000, canaryErrors: 100, canaryP95: 205 });
  assert.equal(r.decision, 'ROLLBACK');
});
