import { createSystem, enqueue, processNext, replayDlq } from './core.mjs';

let system;
let sequence = 1;
let transientFailures = new Map();
let timeline = [];
const $ = s => document.querySelector(s);

function reset() {
  system = createSystem(3);
  sequence = 1;
  transientFailures = new Map();
  timeline = [{ kind: 'info', text: 'Consumer reset.' }];
  enqueue(system, { id: 'evt-1', kind: 'order.created', mode: 'ok' });
  sequence = 2;
  render();
}

function addEvent(mode, duplicate) {
  mode = mode || 'ok';
  const id = duplicate && system.queue.length ? system.queue[0].id : 'evt-' + sequence++;
  enqueue(system, { id, kind: mode === 'poison' ? 'order.malformed' : 'order.created', mode });
  timeline.unshift({ kind: 'info', text: 'Enqueued ' + id + ' (' + mode + ').' });
  render();
}

function handler(event) {
  if (event.mode === 'poison') throw new Error('schema validation failed');
  if (event.mode === 'transient') {
    const count = transientFailures.get(event.id) || 0;
    transientFailures.set(event.id, count + 1);
    if (count === 0) throw new Error('temporary dependency failure');
  }
  return 'reserved inventory for ' + event.id;
}

function describe(result) {
  if (result.status === 'processed') return ['ok', result.event.id + ' processed; side effect recorded once.'];
  if (result.status === 'duplicate') return ['warn', result.event.id + ' detected as duplicate; side effect skipped.'];
  if (result.status === 'retry') return ['warn', result.event.id + ' failed; scheduled with backoff.'];
  if (result.status === 'dlq') return ['bad', result.event.id + ' exhausted attempts and moved to DLQ.'];
  return ['info', 'No event is ready at this tick.'];
}

function step() {
  const result = processNext(system, handler);
  const message = describe(result);
  timeline.unshift({ kind: message[0], text: message[1] });
  render();
}

function drain() {
  for (let i = 0; i < 12 && system.queue.length; i++) {
    const result = processNext(system, handler);
    const message = describe(result);
    timeline.unshift({ kind: message[0], text: 'tick ' + system.tick + ': ' + message[1] });
  }
  render();
}

function replayFirst() {
  if (!system.dlq.length) {
    timeline.unshift({ kind: 'info', text: 'DLQ is empty.' });
  } else {
    const id = system.dlq[0].id;
    replayDlq(system, id);
    const event = system.queue.find(item => item.id === id);
    if (event) event.mode = 'ok';
    timeline.unshift({ kind: 'ok', text: id + ' replayed after repair; attempts reset.' });
  }
  render();
}

function eventRow(event) {
  return '<div class="row"><code>' + event.id + '</code><span>' + event.kind + '</span><b>' + (event.attempts || 0) + '</b><small>ready @ ' + (event.availableAt ?? system.tick) + '</small></div>';
}

function render() {
  $('#tick').textContent = system.tick;
  $('#queued').textContent = system.queue.length;
  $('#processed').textContent = system.processed.size;
  $('#dead').textContent = system.dlq.length;

  $('#queue').innerHTML = system.queue.length ? system.queue.map(eventRow).join('') : '<p class="empty">Queue empty.</p>';
  $('#effects').innerHTML = system.effects.length
    ? system.effects.slice().reverse().map(effect => '<div class="effect"><code>' + effect.eventId + '</code><span>' + effect.effect + '</span></div>').join('')
    : '<p class="empty">No side effects yet.</p>';
  $('#dlq').innerHTML = system.dlq.length
    ? system.dlq.map(event => '<div class="dlq"><code>' + event.id + '</code><span>' + event.error + '</span><b>' + event.attempts + ' attempts</b></div>').join('')
    : '<p class="empty">DLQ empty.</p>';
  $('#timeline').innerHTML = timeline.slice(0, 10).map(item => '<div class="timeline ' + item.kind + '">' + item.text + '</div>').join('');
}

$('#ok').onclick = () => addEvent('ok', false);
$('#duplicate').onclick = () => addEvent('ok', true);
$('#transient').onclick = () => addEvent('transient', false);
$('#poison').onclick = () => addEvent('poison', false);
$('#step').onclick = step;
$('#drain').onclick = drain;
$('#replay').onclick = replayFirst;
$('#reset').onclick = reset;
reset();
