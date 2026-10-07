# TxnScope

Interactive lab for lost updates and optimistic concurrency control.

Live: https://miiduoa.github.io/labs/txnscope/

## What it models

Two clients can start from the same row version, stage inventory changes, and then race to commit. A commit succeeds only when the live row version still matches the transaction snapshot.

That makes a stale write fail explicitly instead of silently overwriting a newer value.

## Verify

```sh
node --test core.test.mjs
```

Tests cover lost-update prevention, independent-row commits, insufficient stock, abort behavior, and retry after conflict.

## Boundary

This is a deliberately small teaching model. It does not implement MVCC, locks, phantom protection, deadlock detection, WAL, or a full SQL isolation level.
