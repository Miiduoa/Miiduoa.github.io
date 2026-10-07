# Eventlane

Interactive event-driven reliability lab.

Live: https://miiduoa.github.io/labs/eventlane/

## What it demonstrates

- at-least-once delivery,
- consumer-side idempotency,
- transient failures with exponential backoff,
- poison-event handling,
- dead-letter queue after the attempt budget is exhausted,
- repair and replay from the DLQ.

Duplicate delivery intentionally produces only one side effect.

## Verify

```sh
node --test core.test.mjs
```

Tests cover duplicate suppression, transient retry, DLQ routing, DLQ replay, and not-yet-ready events.

## Boundary

This is a deterministic consumer model, not a message broker. It does not implement partitions, distributed ordering, broker transactions, consumer groups, or exactly-once guarantees.
