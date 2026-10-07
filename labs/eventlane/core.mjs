export function createSystem(maxAttempts = 3) {
  return { queue: [], processed: new Set(), effects: [], dlq: [], maxAttempts, tick: 0 };
}

export function enqueue(system, event) {
  system.queue.push({ ...event, attempts: event.attempts ?? 0, availableAt: event.availableAt ?? system.tick });
}

export function processNext(system, handler) {
  system.tick += 1;
  const index = system.queue.findIndex(event => event.availableAt <= system.tick);
  if (index < 0) return { status: 'idle' };

  const event = system.queue.splice(index, 1)[0];
  if (system.processed.has(event.id)) return { status: 'duplicate', event };

  try {
    const effect = handler(event);
    system.processed.add(event.id);
    system.effects.push({ eventId: event.id, effect });
    return { status: 'processed', event };
  } catch (error) {
    event.attempts += 1;
    if (event.attempts >= system.maxAttempts) {
      system.dlq.push({ ...event, error: error.message });
      return { status: 'dlq', event };
    }
    event.availableAt = system.tick + 2 ** (event.attempts - 1);
    system.queue.push(event);
    return { status: 'retry', event };
  }
}

export function replayDlq(system, id) {
  const index = system.dlq.findIndex(event => event.id === id);
  if (index < 0) return false;
  const event = system.dlq.splice(index, 1)[0];
  enqueue(system, { ...event, attempts: 0, availableAt: system.tick });
  return true;
}
