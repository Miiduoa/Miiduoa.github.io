import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRestore, demoPlan } from "./core.mjs";

test("baseline picks most recent completed, verified, reachable copy", () => {
  const result = evaluateRestore(demoPlan());
  assert.equal(result.selected.id, "cp-0945");
  assert.equal(result.status, "WITHIN TARGET");
  assert.equal(result.selected.rpoMinutes, 15);
  assert.equal(result.selected.rtoMinutes, 30);
  assert.ok(result.candidates.find(x => x.id === "cp-0955").reasons.includes("事故時尚未完成備份"));
});

test("region outage removes otherwise most recent checkpoint", () => {
  const result = evaluateRestore(demoPlan("regional"));
  assert.equal(result.selected.id, "cp-0930");
  assert.equal(result.status, "TARGET MISSED");
  assert.deepEqual(result.violations, ["RTO 超出目標"]);
});

test("corrupted backup is rejected rather than included in ranking", () => {
  const result = evaluateRestore(demoPlan("corruption"));
  assert.equal(result.selected.id, "cp-0930");
  assert.ok(result.candidates.find(x => x.id === "cp-0945").reasons.includes("完整性檢查失敗"));
});

test("tight targets report both missed objectives", () => {
  const result = evaluateRestore(demoPlan("tight"));
  assert.equal(result.status, "TARGET MISSED");
  assert.deepEqual(result.violations, ["RPO 超出目標", "RTO 超出目標"]);
});

test("fastest and freshest can make different valid selections", () => {
  const input = demoPlan();
  assert.equal(evaluateRestore(input).selected.id, "cp-0945");
  input.policy = "fastest";
  assert.equal(evaluateRestore(input).selected.id, "cp-0900");
});

test("missing integrity assessment blocks recovery", () => {
  const input = demoPlan();
  input.checkpoints.forEach(x => x.integrity = "unknown");
  assert.equal(evaluateRestore(input).status, "UNRECOVERABLE");
});

test("all regions down blocks recovery", () => {
  const input = demoPlan();
  input.unavailableRegions = ["east", "west"];
  assert.equal(evaluateRestore(input).selected, null);
});

test("a checkpoint captured after incident is ineligible", () => {
  const input = demoPlan();
  input.checkpoints[0].capturedAt = "2026-10-08T10:01:00.000Z";
  assert.ok(evaluateRestore(input).candidates[0].reasons.includes("事故後的資料"));
});

test("malformed timestamps and inverted backup timeline are handled", () => {
  const input = demoPlan();
  input.incidentAt = "2026-10-08";
  assert.throws(() => evaluateRestore(input), /canonical UTC/);
  const inverted = demoPlan();
  inverted.checkpoints[0].availableAt = "2026-10-08T08:00:00.000Z";
  assert.ok(evaluateRestore(inverted).candidates[0].reasons.includes("備份完成時間早於擷取時間"));
});

test("invalid durations, duplicate checkpoints and invalid policy fail closed", () => {
  const bad = demoPlan(); bad.checkpoints[0].restoreMinutes = -1;
  assert.throws(() => evaluateRestore(bad), /non-negative/);
  const duplicate = demoPlan(); duplicate.checkpoints[1].id = duplicate.checkpoints[0].id;
  assert.throws(() => evaluateRestore(duplicate), /duplicated/);
  const policy = demoPlan(); policy.policy = "guess";
  assert.throws(() => evaluateRestore(policy), /unknown restore policy/);
});

test("zero-minute objectives are accepted but evaluated literally", () => {
  const plan = demoPlan(); plan.rpoTargetMinutes = 0; plan.rtoTargetMinutes = 0;
  assert.equal(evaluateRestore(plan).status, "TARGET MISSED");
});

test("empty inventory is unrecoverable instead of a false success", () => {
  const plan = demoPlan(); plan.checkpoints = [];
  assert.deepEqual(evaluateRestore(plan).violations, ["沒有符合備份資格的還原點"]);
});
