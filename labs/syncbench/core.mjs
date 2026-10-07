export function createReplica(id, initial = {}) {
  const fields = {};
  for (const [key, value] of Object.entries(initial)) {
    fields[key] = { value, version: { counter: 0, replica: 'seed' } };
  }
  return { id, counter: 0, fields, log: [] };
}

export function compareVersion(a, b) {
  if (a.counter !== b.counter) return a.counter - b.counter;
  return a.replica.localeCompare(b.replica);
}

export function localWrite(replica, field, value) {
  replica.counter += 1;
  const version = { counter: replica.counter, replica: replica.id };
  replica.fields[field] = { value, version };
  replica.log.push({ id: `${replica.id}:${replica.counter}`, replica: replica.id, field, value, version });
  return replica;
}

export function mergeReplicas(left, right) {
  const fieldNames = new Set([...Object.keys(left.fields), ...Object.keys(right.fields)]);
  const mergedFields = {};
  const conflicts = [];

  for (const field of fieldNames) {
    const a = left.fields[field];
    const b = right.fields[field];
    if (!a) mergedFields[field] = structuredClone(b);
    else if (!b) mergedFields[field] = structuredClone(a);
    else {
      const winner = compareVersion(a.version, b.version) >= 0 ? a : b;
      mergedFields[field] = structuredClone(winner);
      if (a.value !== b.value && a.version.counter > 0 && b.version.counter > 0) {
        conflicts.push({ field, left: structuredClone(a), right: structuredClone(b), winner: structuredClone(winner) });
      }
    }
  }

  const byId = new Map();
  for (const op of [...left.log, ...right.log]) byId.set(op.id, structuredClone(op));
  const mergedLog = [...byId.values()].sort((a, b) => {
    const byVersion = compareVersion(a.version, b.version);
    return byVersion || a.id.localeCompare(b.id);
  });
  const maxCounter = Math.max(left.counter, right.counter, ...mergedLog.map(x => x.version.counter), 0);

  return {
    left: { id: left.id, counter: maxCounter, fields: structuredClone(mergedFields), log: structuredClone(mergedLog) },
    right: { id: right.id, counter: maxCounter, fields: structuredClone(mergedFields), log: structuredClone(mergedLog) },
    conflicts
  };
}

export function snapshot(replica) {
  return Object.fromEntries(Object.entries(replica.fields).map(([key, entry]) => [key, entry.value]));
}

export function isConverged(a, b) {
  return JSON.stringify(snapshot(a)) === JSON.stringify(snapshot(b));
}
