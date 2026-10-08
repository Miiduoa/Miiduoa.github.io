const minute = 60_000;
const isoUtc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function utc(value, name) {
  if (typeof value !== "string" || !isoUtc.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(name + " must be canonical UTC ISO 8601 with milliseconds");
  }
  return Date.parse(value);
}

function minutes(value, name, positive = false) {
  if (!Number.isSafeInteger(value) || value < 0 || (positive && value === 0)) {
    throw new TypeError(name + " must be a " + (positive ? "positive" : "non-negative") + " integer");
  }
  return value;
}

export function evaluateRestore(input) {
  if (!input || !Array.isArray(input.checkpoints) || input.checkpoints.length > 100) {
    throw new TypeError("checkpoints must be an array with at most 100 entries");
  }
  const incident = utc(input.incidentAt, "incidentAt");
  const rpo = minutes(input.rpoTargetMinutes, "rpoTargetMinutes");
  const rto = minutes(input.rtoTargetMinutes, "rtoTargetMinutes");
  const delay = minutes(input.decisionMinutes, "decisionMinutes");
  const unavailable = input.unavailableRegions ?? [];
  if (!Array.isArray(unavailable) || unavailable.some(r => typeof r !== "string")) {
    throw new TypeError("unavailableRegions must be a list of region names");
  }
  const policy = input.policy ?? "freshest";
  if (!["freshest", "fastest"].includes(policy)) throw new TypeError("unknown restore policy");
  const regionsDown = new Set(unavailable);
  const ids = new Set();
  const results = input.checkpoints.map((item) => {
    if (!item || typeof item.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,39}$/i.test(item.id) || ids.has(item.id)) {
      throw new TypeError("checkpoint id invalid or duplicated");
    }
    ids.add(item.id);
    if (typeof item.region !== "string" || !item.region.trim() || item.region.length > 80) {
      throw new TypeError("checkpoint region invalid");
    }
    if (!["verified", "corrupt", "unknown"].includes(item.integrity)) {
      throw new TypeError("checkpoint integrity must be verified, corrupt or unknown");
    }
    const captured = utc(item.capturedAt, "capturedAt");
    const available = utc(item.availableAt, "availableAt");
    const transfer = minutes(item.transferMinutes, "transferMinutes");
    const restore = minutes(item.restoreMinutes, "restoreMinutes");
    const verification = minutes(item.verifyMinutes, "verifyMinutes");
    const reasons = [];
    if (captured > incident) reasons.push("事故後的資料");
    if (available > incident) reasons.push("事故時尚未完成備份");
    if (available < captured) reasons.push("備份完成時間早於擷取時間");
    if (regionsDown.has(item.region)) reasons.push("儲存區域不可用");
    if (item.integrity !== "verified") reasons.push(item.integrity === "corrupt" ? "完整性檢查失敗" : "缺少完整性檢查");
    const rpoMinutes = Math.max(0, (incident - captured) / minute);
    const rtoMinutes = delay + transfer + restore + verification;
    return {
      id: item.id, region: item.region, capturedAt: item.capturedAt,
      rpoMinutes, rtoMinutes, eligible: reasons.length === 0, reasons,
      steps: { decision: delay, transfer, restore, verification }
    };
  });
  const eligible = results.filter(r => r.eligible).sort((a, b) =>
    (policy === "freshest" ? a.rpoMinutes - b.rpoMinutes || a.rtoMinutes - b.rtoMinutes
      : a.rtoMinutes - b.rtoMinutes || a.rpoMinutes - b.rpoMinutes) || a.id.localeCompare(b.id)
  );
  const selected = eligible[0] ?? null;
  const status = !selected ? "UNRECOVERABLE" :
    selected.rpoMinutes <= rpo && selected.rtoMinutes <= rto ? "WITHIN TARGET" : "TARGET MISSED";
  return {
    policy, rpoTargetMinutes: rpo, rtoTargetMinutes: rto,
    status, selected, candidates: results,
    violations: selected ? [
      ...(selected.rpoMinutes > rpo ? ["RPO 超出目標"] : []),
      ...(selected.rtoMinutes > rto ? ["RTO 超出目標"] : [])
    ] : ["沒有符合備份資格的還原點"]
  };
}

export function demoPlan(name = "normal") {
  if (!["normal", "regional", "corruption", "tight"].includes(name)) throw new TypeError("unknown scenario");
  const checkpoints = [
    { id:"cp-0900", region:"east", capturedAt:"2026-10-08T09:00:00.000Z", availableAt:"2026-10-08T09:07:00.000Z", integrity:"verified", transferMinutes:3, restoreMinutes:5, verifyMinutes:6 },
    { id:"cp-0930", region:"west", capturedAt:"2026-10-08T09:30:00.000Z", availableAt:"2026-10-08T09:40:00.000Z", integrity:"verified", transferMinutes:28, restoreMinutes:16, verifyMinutes:8 },
    { id:"cp-0945", region:"east", capturedAt:"2026-10-08T09:45:00.000Z", availableAt:"2026-10-08T09:52:00.000Z", integrity:name === "corruption" ? "corrupt" : "verified", transferMinutes:7, restoreMinutes:10, verifyMinutes:8 },
    { id:"cp-0955", region:"west", capturedAt:"2026-10-08T09:55:00.000Z", availableAt:"2026-10-08T10:06:00.000Z", integrity:"verified", transferMinutes:14, restoreMinutes:12, verifyMinutes:8 }
  ];
  return {
    incidentAt:"2026-10-08T10:00:00.000Z", checkpoints,
    rpoTargetMinutes:name === "tight" ? 10 : 35,
    rtoTargetMinutes:name === "tight" ? 25 : name === "regional" ? 40 : 50,
    decisionMinutes:5,
    policy:"freshest",
    unavailableRegions:name === "regional" ? ["east"] : []
  };
}
