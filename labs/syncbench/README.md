# Syncbench

Small local-first synchronization lab for reasoning about offline edits, convergence, and deterministic conflict resolution.

Live: https://miiduoa.github.io/labs/syncbench/

## Why this exists

A sync UI can look fine while its merge behavior is vague. This lab keeps the model small enough to inspect: two replicas, per-field logical versions, an append-only operation log, and a deterministic merge rule.

## Model

- Local writes increment the replica's logical counter.
- Each field stores `{ value, version }`.
- Merge keeps the newer logical version per field.
- Equal counters use replica id as a stable tie-break.
- Logs deduplicate by operation id.
- Re-merging converged replicas is idempotent.

This is a teaching model, not a CRDT library. It does not model deletes, causal delivery, partial replication, server authority, or malicious clients.

## Verify

```sh
node --test core.test.mjs
```

The tests cover different-field offline edits, same-field conflicts, deterministic tie-breaking, idempotent merge, and logical-clock precedence.
