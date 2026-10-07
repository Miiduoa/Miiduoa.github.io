# Rampwatch

Interactive progressive-delivery guardrail calculator.

Live: https://miiduoa.github.io/labs/rampwatch/

## Decision policy

The lab compares a baseline cohort with a canary cohort using request errors and p95 latency.

- **Rollback** when p95 latency regresses by at least 30%, or error rate increases by at least 0.5 percentage points and the 95% Wilson intervals separate.
- **Hold** when either cohort has fewer than 500 requests, p95 is 15–30% slower, or error uncertainty remains meaningfully worse.
- **Advance** otherwise, through the fixed stages `1 → 5 → 10 → 25 → 50 → 100%`.

The thresholds are intentionally explicit and reviewable. They are demo policy, not universal production guidance.

## Verify

```sh
node --test core.test.mjs
```

Tests cover interval bounds, healthy advance, latency rollback, insufficient evidence, and clear error regression.
