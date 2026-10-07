# LineageGuard

Column-level schema evolution impact lab.

Live: https://miiduoa.github.io/labs/lineageguard/

## What it models

- schema diff between producer versions,
- removed columns,
- type changes,
- nullable → required tightening,
- additive nullable/defaulted columns,
- explicit column mappings between datasets,
- downstream blast-radius traversal,
- cycle-safe lineage walking.

A source column can be renamed downstream: the demo maps `raw_orders.amount` to `order_mart.gross_amount`, then continues the impact into `revenue_dashboard.gross_amount`.

## Verify

```sh
node --test core.test.mjs
```

Tests cover removal classification, safe additions, multi-hop impact, renamed downstream columns, and cycle termination.

## Boundary

This is an explicit lineage model, not a SQL parser or warehouse catalog. Production lineage also needs query parsing, jobs, ownership, freshness, permissions, and versioned metadata.
