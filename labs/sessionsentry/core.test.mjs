import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, token, authenticate, rotate, authorizeMutation, revoke } from './core.mjs';

test('fresh session authenticates', () => {
  const s = createSession(0);
  assert.equal(authenticate(s, token(s), 10).ok, true);
});

test('idle timeout expires session', () => {
  const s = createSession(0, { idleTtl: 100 });
  assert.equal(authenticate(s, token(s), 101).reason, 'expired');
});

test('rotation invalidates the old token', () => {
  const s = createSession(0);
  const old = token(s);
  const fresh = rotate(s, 50);
  assert.equal(authenticate(s, old, 60).reason, 'revoked');
  assert.equal(authenticate(s, fresh, 60).ok, true);
});

test('state-changing request requires csrf token', () => {
  const s = createSession(0);
  assert.equal(authorizeMutation(s, token(s), 'wrong', 20).reason, 'csrf');
  assert.equal(authorizeMutation(s, token(s), s.csrf, 20).ok, true);
});

test('revocation blocks the current token', () => {
  const s = createSession(0);
  const t = token(s); revoke(s);
  assert.equal(authenticate(s, t, 1).reason, 'revoked');
});
