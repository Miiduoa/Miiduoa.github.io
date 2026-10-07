# Flagrail

Deterministic feature-flag evaluation lab.

Live: https://miiduoa.github.io/labs/flagrail/

## Evaluation order

1. validate configuration,
2. global kill switch,
3. enabled state,
4. first matching targeting rule,
5. stable subject bucket for percentage rollout.

The rollout uses a deterministic FNV-1a bucket from the subject id plus a flag salt, so the same subject does not randomly flip on every evaluation.

## Verify

```sh
node --test core.test.mjs
```

Tests cover stable bucketing, targeting precedence, kill-switch precedence, 100% rollout, and fail-closed invalid configuration.

## Boundary

This is a compact evaluator, not a hosted configuration service. It does not implement streaming config delivery, RBAC, audit storage, SDK caching, multi-variant experiments, or cryptographic config signing.
