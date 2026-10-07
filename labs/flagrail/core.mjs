export function stableBucket(subject, salt='') {
  const text = String(salt) + ':' + String(subject);
  let hash = 0x811c9dc5;
  for (let i=0;i<text.length;i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash,0x01000193);
  }
  return (hash >>> 0) % 10000;
}

export function matches(condition, context) {
  const value = context[condition.attribute];
  if (condition.op === 'eq') return value === condition.value;
  if (condition.op === 'in') return Array.isArray(condition.value) && condition.value.includes(value);
  if (condition.op === 'not-in') return Array.isArray(condition.value) && !condition.value.includes(value);
  throw new Error('Unsupported operator: ' + condition.op);
}

export function validateFlag(flag) {
  const issues = [];
  if (!flag || typeof flag !== 'object') return ['flag must be an object'];
  if (!Array.isArray(flag.rules)) issues.push('rules must be an array');
  if (!Number.isFinite(flag.rollout) || flag.rollout < 0 || flag.rollout > 100) issues.push('rollout must be between 0 and 100');
  const ids = new Set();
  for (const rule of flag.rules || []) {
    if (!rule.id || ids.has(rule.id)) issues.push('rule ids must be unique');
    ids.add(rule.id);
    if (!Array.isArray(rule.all) || !rule.all.length) issues.push('each rule needs conditions');
    if (typeof rule.value !== 'boolean') issues.push('rule value must be boolean');
  }
  return issues;
}

export function evaluateFlag(flag, context) {
  const issues = validateFlag(flag);
  if (issues.length) return { value:false, reason:'invalid-config', issues };

  if (flag.killSwitch) return { value:false, reason:'kill-switch' };
  if (!flag.enabled) return { value:false, reason:'disabled' };

  for (const rule of flag.rules) {
    if (rule.all.every(condition => matches(condition,context))) {
      return { value:rule.value, reason:'rule', ruleId:rule.id };
    }
  }

  const subject = context.userId;
  if (!subject) return { value:false, reason:'missing-subject' };

  const bucket = stableBucket(subject,flag.salt || flag.key || 'flag');
  const threshold = Math.round(flag.rollout * 100);
  return {
    value: bucket < threshold,
    reason:'rollout',
    bucket,
    threshold
  };
}

export function demoFlag(overrides={}) {
  return {
    key:'new-checkout',
    enabled:true,
    killSwitch:false,
    rollout:25,
    salt:'checkout-v2',
    rules:[
      { id:'staff-on', all:[{attribute:'role',op:'eq',value:'staff'}], value:true },
      { id:'blocked-region', all:[{attribute:'country',op:'in',value:['KP','SY']}], value:false },
      { id:'pro-tw', all:[{attribute:'plan',op:'eq',value:'pro'},{attribute:'country',op:'eq',value:'TW'}], value:true }
    ],
    ...overrides
  };
}
