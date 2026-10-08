import test from "node:test";
import assert from "node:assert/strict";
import { sealEvents, verifyLedger, demoEvents } from "./core.mjs";

test("same history is deterministic and externally anchored", async () => {
  const log = await sealEvents(demoEvents());
  assert.deepEqual(log, await sealEvents(demoEvents()));
  assert.equal(log.entries[0].previousHash, "0".repeat(64));
  assert.equal((await verifyLedger(log, log.anchor)).ok, true);
});
test("single-record modification is detected", async () => {
  const log = await sealEvents(demoEvents());
  log.entries[1].event.note = "審核已取消";
  assert.match((await verifyLedger(log)).reason, /content mismatch/);
});
test("reorder and broken previous hashes fail", async () => {
  const log = await sealEvents(demoEvents());
  [log.entries[0], log.entries[1]] = [log.entries[1], log.entries[0]];
  assert.match((await verifyLedger(log)).reason, /sequence mismatch/);
  const other = await sealEvents(demoEvents());
  other.entries[1].previousHash = "f".repeat(64);
  assert.match((await verifyLedger(other)).reason, /previous hash mismatch/);
});
test("truncation fails with original embedded checkpoint", async () => {
  const log = await sealEvents(demoEvents());
  log.entries.pop();
  assert.match((await verifyLedger(log)).reason, /embedded checkpoint/);
});
test("a rewritten tail passes internal validation but fails external anchoring", async () => {
  const full = await sealEvents(demoEvents());
  const shortened = await sealEvents(demoEvents().slice(0, -1));
  assert.equal((await verifyLedger(shortened)).ok, true);
  assert.match((await verifyLedger(shortened, full.anchor)).reason, /independent checkpoint/);
});
test("recomputed full chain still fails with externally held checkpoint", async () => {
  const full = await sealEvents(demoEvents());
  const altered = demoEvents();
  altered[1].note = "重新編寫的核准";
  const revised = await sealEvents(altered);
  assert.equal((await verifyLedger(revised)).ok, true);
  assert.equal((await verifyLedger(revised, full.anchor)).ok, false);
});
test("duplicate IDs are not permitted", async () => {
  const sample = demoEvents(); sample[1].id = sample[0].id;
  await assert.rejects(() => sealEvents(sample), /duplicate id/);
});
test("unknown formats, extra keys and missing keys are rejected", async () => {
  const log = await sealEvents(demoEvents()); log.format = "v2";
  assert.equal((await verifyLedger(log)).ok, false);
  const extra = demoEvents(); extra[0].ip = "127.0.0.1";
  await assert.rejects(() => sealEvents(extra), /six fields/);
  const missing = demoEvents(); delete missing[0].actor;
  await assert.rejects(() => sealEvents(missing), /six fields/);
});
test("invalid dates and oversized event contents are rejected", async () => {
  const a = demoEvents(); a[0].at = "2026-10-08";
  await assert.rejects(() => sealEvents(a), /UTC timestamp/);
  const b = demoEvents(); b[0].note = "x".repeat(241);
  await assert.rejects(() => sealEvents(b), /invalid note/);
});
test("empty log carries a deterministic zero checkpoint", async () => {
  const log = await sealEvents([]);
  assert.deepEqual(log.anchor, {count:0,hash:"0".repeat(64)});
  assert.equal((await verifyLedger(log,log.anchor)).ok, true);
});
test("invalid checkpoints or digest shapes cannot be accepted", async () => {
  const log = await sealEvents(demoEvents());
  assert.equal((await verifyLedger(log, {count:-1,hash:"n/a"})).ok, false);
  log.entries[0].hash = "invalid";
  assert.match((await verifyLedger(log)).reason, /invalid digest/);
});
