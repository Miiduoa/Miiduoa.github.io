export function createSession(now = 0, options = {}) {
  return {
    id: options.id ?? 's1',
    user: options.user ?? 'user-1',
    issuedAt: now,
    lastSeenAt: now,
    absoluteTtl: options.absoluteTtl ?? 3600,
    idleTtl: options.idleTtl ?? 900,
    rotation: 0,
    csrf: options.csrf ?? 'csrf-1',
    revoked: new Set()
  };
}

export function token(session) {
  return `${session.id}.${session.rotation}`;
}

export function isExpired(session, now) {
  return now - session.issuedAt > session.absoluteTtl || now - session.lastSeenAt > session.idleTtl;
}

export function authenticate(session, presentedToken, now) {
  if (session.revoked.has(presentedToken)) return { ok: false, reason: 'revoked' };
  if (presentedToken !== token(session)) return { ok: false, reason: 'stale-token' };
  if (isExpired(session, now)) return { ok: false, reason: 'expired' };
  session.lastSeenAt = now;
  return { ok: true };
}

export function rotate(session, now) {
  const old = token(session);
  session.revoked.add(old);
  session.rotation += 1;
  session.issuedAt = now;
  session.lastSeenAt = now;
  session.csrf = `csrf-${session.rotation + 1}`;
  return token(session);
}

export function authorizeMutation(session, presentedToken, csrfToken, now) {
  const auth = authenticate(session, presentedToken, now);
  if (!auth.ok) return auth;
  if (csrfToken !== session.csrf) return { ok: false, reason: 'csrf' };
  return { ok: true };
}

export function revoke(session) {
  session.revoked.add(token(session));
}
