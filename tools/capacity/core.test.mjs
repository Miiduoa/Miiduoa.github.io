import test from 'node:test';
import assert from 'node:assert/strict';
import { queue, recommend, overview } from './core.mjs';
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps);
test('known Erlang C case, two workers at 50 percent utilization', () => {
  const result = queue({ arrival: 1, serviceMinutes: 60, servers: 2, targetMinutes: 60 });
  near(result.waitProbability, 1 / 3);
  near(result.meanWaitMinutes, 20);
  near(result.overTargetProbability, Math.exp(-1) / 3);
});
test('zero arrivals, no waiting', () => {
  const result = queue({ arrival: 0, serviceMinutes: 6, servers: 2 });
  near(result.meanWaitMinutes, 0);
  near(result.waitProbability, 0);
  near(result.meanTotalMinutes, 6);
});
test('at and above capacity, no finite steady state', () => {
  for (const arrival of [20, 21]) {
    const q = queue({ arrival, serviceMinutes: 6, servers: 2 });
    assert.equal(q.stable, false);
    assert.equal(q.overTargetProbability, 1);
    assert.equal(q.meanWaitMinutes, Infinity);
  }
});
test('staff recommendation reaches target and previous staffing does not', () => {
  const args = { arrival: 24, serviceMinutes: 6, targetMinutes: 5 };
  const best = recommend(args);
  assert.ok(best.servers >= 3);
  assert.ok(best.overTargetProbability <= .1);
  if (best.servers > 1) assert.ok(queue({ ...args, servers: best.servers - 1 }).overTargetProbability > .1);
});
test('surge never yields lower staffing requirement', () => {
  const a = overview({ arrival: 24, serviceMinutes: 6, servers: 4, targetMinutes: 5, surge: 1.4 });
  assert.ok(a.surgeRecommendation.servers >= a.regularRecommendation.servers);
  assert.ok(a.surge.overTargetProbability >= a.regular.overTargetProbability);
});
test('no recommendation within deliberately small capacity bound', () => {
  assert.equal(recommend({ arrival: 240, serviceMinutes: 20, targetMinutes: 5, maxServers: 4 }), null);
});
test('input validation rejects impossible and fractional staffing', () => {
  assert.throws(() => queue({ arrival: -1, serviceMinutes: 6, servers: 4 }), /arrival/);
  assert.throws(() => queue({ arrival: 24, serviceMinutes: 0, servers: 4 }), /service/);
  assert.throws(() => queue({ arrival: 24, serviceMinutes: 6, servers: 3.5 }), /servers/);
  assert.throws(() => queue({ arrival: 24, serviceMinutes: 6, servers: 4, targetMinutes: 0 }), /target/);
});
