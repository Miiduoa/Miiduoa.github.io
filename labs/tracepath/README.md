# Tracepath

Interactive trace-structure and exclusive-time lab.

Live: https://miiduoa.github.io/labs/tracepath/

## What it checks

- duplicate span ids,
- missing parents,
- parent/child boundary violations,
- ancestry cycles,
- root wall time,
- direct-child overlap,
- per-span exclusive time,
- per-service exclusive-time summary.

Exclusive time subtracts the **union** of direct-child intervals. Parallel child spans therefore do not get subtracted twice.

## Verify

```sh
node --test core.test.mjs
```

Tests cover overlapping children, missing parents, boundary violations, analysis output, and cycle detection.

## Boundary

This is not a tracing backend, sampler, collector, or complete causal critical-path algorithm. The demo uses deterministic synthetic spans so the calculation stays inspectable.
