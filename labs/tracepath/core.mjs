export function validateSpans(spans) {
  const issues = [];
  const byId = new Map();

  for (const span of spans) {
    if (!span.id || byId.has(span.id)) {
      issues.push({ type: 'duplicate-id', spanId: span.id || '(missing)' });
      continue;
    }
    if (!Number.isFinite(span.start) || !Number.isFinite(span.duration) || span.duration < 0) {
      issues.push({ type: 'invalid-time', spanId: span.id });
    }
    byId.set(span.id, span);
  }

  for (const span of spans) {
    if (!span.parentId) continue;
    const parent = byId.get(span.parentId);
    if (!parent) {
      issues.push({ type: 'missing-parent', spanId: span.id, parentId: span.parentId });
      continue;
    }
    const spanEnd = span.start + span.duration;
    const parentEnd = parent.start + parent.duration;
    if (span.start < parent.start || spanEnd > parentEnd) {
      issues.push({ type: 'parent-boundary', spanId: span.id, parentId: parent.id });
    }
  }

  for (const span of spans) {
    const seen = new Set([span.id]);
    let cursor = span;
    while (cursor?.parentId) {
      if (seen.has(cursor.parentId)) {
        issues.push({ type: 'cycle', spanId: span.id, parentId: cursor.parentId });
        break;
      }
      seen.add(cursor.parentId);
      cursor = byId.get(cursor.parentId);
      if (!cursor) break;
    }
  }

  return issues;
}

function unionLength(intervals) {
  if (!intervals.length) return 0;
  const sorted = intervals
    .map(([start,end]) => [start,end])
    .sort((a,b) => a[0]-b[0] || a[1]-b[1]);

  let total = 0;
  let [start,end] = sorted[0];

  for (let i=1;i<sorted.length;i++) {
    const [nextStart,nextEnd] = sorted[i];
    if (nextStart <= end) {
      end = Math.max(end,nextEnd);
    } else {
      total += Math.max(0,end-start);
      start = nextStart;
      end = nextEnd;
    }
  }
  total += Math.max(0,end-start);
  return total;
}

export function exclusiveTime(spans, spanId) {
  const span = spans.find(item => item.id === spanId);
  if (!span) throw new Error('Unknown span.');

  const spanStart = span.start;
  const spanEnd = span.start + span.duration;
  const childIntervals = spans
    .filter(item => item.parentId === spanId)
    .map(child => [
      Math.max(spanStart, child.start),
      Math.min(spanEnd, child.start + child.duration)
    ])
    .filter(([start,end]) => end > start);

  return Math.max(0, span.duration - unionLength(childIntervals));
}

export function analyzeTrace(spans) {
  const issues = validateSpans(spans);
  const rows = spans.map(span => ({
    ...span,
    end: span.start + span.duration,
    exclusive: exclusiveTime(spans, span.id)
  }));

  const rootStarts = rows.filter(row => !row.parentId).map(row => row.start);
  const rootEnds = rows.filter(row => !row.parentId).map(row => row.end);
  const wallStart = rootStarts.length ? Math.min(...rootStarts) : 0;
  const wallEnd = rootEnds.length ? Math.max(...rootEnds) : 0;

  const service = new Map();
  for (const row of rows) {
    const key = row.service || 'unknown';
    const current = service.get(key) || { service:key, spans:0, duration:0, exclusive:0 };
    current.spans += 1;
    current.duration += row.duration;
    current.exclusive += row.exclusive;
    service.set(key,current);
  }

  const bottleneck = rows.slice().sort((a,b) => b.exclusive-a.exclusive || b.duration-a.duration)[0] || null;

  return {
    rows,
    issues,
    wallTime: Math.max(0, wallEnd-wallStart),
    bottleneck,
    services: [...service.values()].sort((a,b) => b.exclusive-a.exclusive)
  };
}

export function demoTrace(withBoundaryIssue=false) {
  const spans = [
    { id:'root', parentId:null, service:'web', name:'GET /checkout', start:0, duration:420 },
    { id:'auth', parentId:'root', service:'auth', name:'verify session', start:18, duration:64 },
    { id:'cart', parentId:'root', service:'cart', name:'load cart', start:96, duration:118 },
    { id:'pricing', parentId:'root', service:'pricing', name:'price items', start:110, duration:74 },
    { id:'db', parentId:'cart', service:'postgres', name:'SELECT cart', start:118, duration:62 },
    { id:'payment', parentId:'root', service:'payments', name:'authorize', start:232, duration:146 },
    { id:'gateway', parentId:'payment', service:'gateway', name:'POST /authorize', start:252, duration:91 }
  ];
  if (withBoundaryIssue) spans.push({ id:'late', parentId:'root', service:'email', name:'enqueue receipt', start:405, duration:38 });
  return spans;
}
