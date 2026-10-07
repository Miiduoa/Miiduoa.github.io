# SessionSentry

Small defensive lab for session lifecycle decisions.

Live: https://miiduoa.github.io/labs/sessionsentry/

## Model

The demo keeps a server-side session with:

- absolute and idle expiry,
- token rotation,
- revocation of the previous/current token,
- stale-token rejection,
- CSRF verification for state-changing requests.

The copied-token scenario is intentionally visible: rotate the session, then replay the old token and watch it fail.

## Verify

```sh
node --test core.test.mjs
```

Tests cover fresh authentication, idle expiry, rotation, CSRF enforcement, and revocation.

## Boundary

This is a defensive state model, not an authentication library. It does not implement cookies, cryptography, OAuth/OIDC, passkeys, credential storage, or browser policy.
