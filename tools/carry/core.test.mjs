import test from 'node:test';
import assert from 'node:assert/strict';
import { payment, balance, evaluate, scenarioTable } from './core.mjs';
const base = { liquid: 1500000, price: 1000000, down: 200000, reserve: 100000,
  budget: 30000, apr: .025, term: 84, horizon: 84, annualReturn: .04 };
const near = (a, b, tolerance = .0001) => assert.ok(Math.abs(a - b) < tolerance);
test('zero-interest payment and principal reconciliation', () => {
  near(payment(1200, 0, 12), 100);
  near(balance(1200, 0, 12, 3), 900);
  near(balance(1200, 0, 12, 12), 0);
});
test('positive-interest schedule amortizes at term', () => {
  const a = payment(800000, .025, 84);
  assert.ok(a > 800000 / 84);
  assert.ok(balance(800000, .025, 84, 18) < 800000);
  near(balance(800000, .025, 84, 84), 0);
});
test('same end wealth at effective financing rate, including early exit', () => {
  for (const horizon of [1, 18, 36, 84, 120]) {
    const effective = Math.pow(1 + base.apr / 12, 12) - 1;
    const result = evaluate({ ...base, horizon }, effective);
    near(result.difference, 0, .01);
  }
});
test('zero financing and all-cash purchase have identical wealth', () => {
  const result = evaluate({ ...base, down: base.price });
  near(result.difference, 0);
  near(result.outstanding, 0);
});
test('lower returns punish the financed case', () => {
  const rows = scenarioTable(base);
  assert.equal(rows.length, 4);
  assert.ok(rows[0].difference < rows[3].difference);
  assert.ok(rows[0].difference < 0);
  assert.ok(rows[3].difference > 0);
});
test('invalid affordability, liquidity, returns, and terms reject', () => {
  assert.throws(() => evaluate({ ...base, budget: 100 }), /budget/);
  assert.throws(() => evaluate({ ...base, reserve: 600000 }), /liquid/);
  assert.throws(() => evaluate({ ...base, down: 1000001 }), /Down/);
  assert.throws(() => evaluate({ ...base, term: 0 }), /term/);
  assert.throws(() => evaluate({ ...base }, -1), /annualReturn/);
});
