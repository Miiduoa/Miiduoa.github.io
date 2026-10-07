function clamp01(x){ return Math.max(0, Math.min(1, x)); }

export function rate(events, total) {
  if (!Number.isFinite(events) || !Number.isFinite(total) || total <= 0 || events < 0 || events > total) return null;
  return events / total;
}

export function wilson(events, total, z = 1.96) {
  const p = rate(events, total);
  if (p === null) return null;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denom;
  return [clamp01(center - margin), clamp01(center + margin)];
}

export function assessRelease(input) {
  const bRate = rate(input.baselineErrors, input.baselineRequests);
  const cRate = rate(input.canaryErrors, input.canaryRequests);
  if (bRate === null || cRate === null) throw new Error('Invalid request/error counts.');
  if (!(input.baselineP95 > 0) || !(input.canaryP95 > 0)) throw new Error('Latency must be positive.');

  const bCI = wilson(input.baselineErrors, input.baselineRequests);
  const cCI = wilson(input.canaryErrors, input.canaryRequests);
  const errorDelta = cRate - bRate;
  const latencyRatio = input.canaryP95 / input.baselineP95;
  const enoughData = input.baselineRequests >= 500 && input.canaryRequests >= 500;
  const errorSeparation = cCI[0] > bCI[1];
  const severeError = errorDelta >= 0.005 && errorSeparation;
  const severeLatency = latencyRatio >= 1.30;
  const warningLatency = latencyRatio >= 1.15;

  let decision = 'ADVANCE';
  const reasons = [];
  if (severeError || severeLatency) {
    decision = 'ROLLBACK';
    if (severeError) reasons.push('Canary error rate is materially higher and its 95% interval no longer overlaps baseline.');
    if (severeLatency) reasons.push('Canary p95 latency is at least 30% slower than baseline.');
  } else if (!enoughData || warningLatency || cCI[1] > bCI[1] + 0.003) {
    decision = 'HOLD';
    if (!enoughData) reasons.push('At least 500 requests per cohort are required before advancing.');
    if (warningLatency) reasons.push('Latency is 15–30% slower; gather more evidence before increasing traffic.');
    if (cCI[1] > bCI[1] + 0.003) reasons.push('Error-rate uncertainty is still meaningfully worse than baseline.');
  } else {
    reasons.push('Current guardrails are inside the configured thresholds.');
  }

  return { decision, baselineRate: bRate, canaryRate: cRate, baselineCI: bCI, canaryCI: cCI, errorDelta, latencyRatio, reasons };
}

export function nextTraffic(current, decision) {
  const stages = [1, 5, 10, 25, 50, 100];
  if (decision !== 'ADVANCE') return current;
  const idx = stages.findIndex(x => x >= current);
  if (idx < 0 || idx === stages.length - 1) return 100;
  return stages[idx + 1];
}
