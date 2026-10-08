const VERSION = "proofline.v1";
const EMPTY_HASH = "0".repeat(64);
const HEX = /^[0-9a-f]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FIELDS = ["id", "at", "actor", "action", "target", "note"];

function string(value, key, limit) {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new TypeError("invalid " + key);
  return value;
}

function normalize(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== FIELDS.length ||
      Object.keys(value).some(k => !FIELDS.includes(k)))
    throw new TypeError("event requires exactly six fields");
  const id = string(value.id, "id", 40);
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(id)) throw new TypeError("invalid id");
  const at = string(value.at, "at", 24);
  if (!ISO.test(at) || !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at)
    throw new TypeError("invalid canonical UTC timestamp");
  return {
    id, at, actor: string(value.actor, "actor", 80),
    action: string(value.action, "action", 80),
    target: string(value.target, "target", 120),
    note: string(value.note, "note", 240)
  };
}

async function sha256(message) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto requires HTTPS or Node 22+");
  const bytes = new TextEncoder().encode(message);
  const buffer = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2, "0")).join("");
}

function checkAnchor(value) {
  if (!value || !Number.isSafeInteger(value.count) || value.count < 0 ||
      value.count > 100 || typeof value.hash !== "string" || !HEX.test(value.hash))
    throw new TypeError("invalid checkpoint");
}

export async function sealEvents(events) {
  if (!Array.isArray(events) || events.length > 100) throw new TypeError("expected 0–100 events");
  let previousHash = EMPTY_HASH;
  const entries = [];
  const ids = new Set();
  for (const item of events) {
    const event = normalize(item);
    if (ids.has(event.id)) throw new TypeError("duplicate id");
    ids.add(event.id);
    const seq = entries.length + 1;
    const hash = await sha256(JSON.stringify([VERSION, seq, previousHash, event]));
    entries.push({ seq, previousHash, event, hash });
    previousHash = hash;
  }
  return { format: VERSION, entries, anchor: { count: entries.length, hash: previousHash } };
}

export async function verifyLedger(bundle, trustedAnchor = null) {
  try {
    if (!bundle || bundle.format !== VERSION || !Array.isArray(bundle.entries) || bundle.entries.length > 100)
      throw new TypeError("unknown ledger format or oversized log");
    checkAnchor(bundle.anchor);
    if (trustedAnchor !== null) checkAnchor(trustedAnchor);
    let previousHash = EMPTY_HASH;
    const ids = new Set();
    for (let i = 0; i < bundle.entries.length; i++) {
      const row = bundle.entries[i];
      if (!row || row.seq !== i + 1) throw new Error("sequence mismatch at entry " + (i + 1));
      if (row.previousHash !== previousHash) throw new Error("previous hash mismatch at entry " + (i + 1));
      const event = normalize(row.event);
      if (ids.has(event.id)) throw new Error("duplicate id at entry " + (i + 1));
      ids.add(event.id);
      if (typeof row.hash !== "string" || !HEX.test(row.hash))
        throw new Error("invalid digest at entry " + (i + 1));
      const digest = await sha256(JSON.stringify([VERSION, row.seq, previousHash, event]));
      if (digest !== row.hash) throw new Error("content mismatch at entry " + (i + 1));
      previousHash = digest;
    }
    if (bundle.anchor.count !== bundle.entries.length || bundle.anchor.hash !== previousHash)
      throw new Error("embedded checkpoint mismatch");
    if (trustedAnchor && (trustedAnchor.count !== bundle.entries.length || trustedAnchor.hash !== previousHash))
      throw new Error("independent checkpoint mismatch");
    return { ok:true, anchored:trustedAnchor !== null, reason:null };
  } catch (error) {
    return { ok:false, anchored:trustedAnchor !== null, reason:error.message };
  }
}

export function demoEvents() {
  return [
    {id:"ev-01",at:"2026-10-08T09:00:00.000Z",actor:"operator-07",action:"request",target:"restore-42",note:"提出測試還原申請"},
    {id:"ev-02",at:"2026-10-08T09:03:00.000Z",actor:"reviewer-02",action:"approve",target:"restore-42",note:"核對申請範圍"},
    {id:"ev-03",at:"2026-10-08T09:07:00.000Z",actor:"runner-01",action:"execute",target:"restore-42",note:"完成模擬還原程序"},
    {id:"ev-04",at:"2026-10-08T09:10:00.000Z",actor:"reviewer-02",action:"close",target:"restore-42",note:"覆核模擬結果"}
  ];
}
