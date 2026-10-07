import { createSession, token, authenticate, rotate, authorizeMutation, revoke } from './core.mjs';

let now = 0;
let session;
let browserToken;
let stolenToken;
let events = [];
const $ = s => document.querySelector(s);

function log(kind, text) {
  events.unshift({ kind, text, at: now });
}

function reset() {
  now = 0;
  session = createSession(now, { absoluteTtl: 3600, idleTtl: 900 });
  browserToken = token(session);
  stolenToken = browserToken;
  events = [{ kind: 'info', text: 'Signed in; browser and copied token are initially identical.', at: now }];
  render();
}

function useBrowser() {
  const result = authenticate(session, browserToken, now);
  log(result.ok ? 'ok' : 'bad', result.ok ? 'Browser request accepted.' : `Browser request denied: ${result.reason}.`);
  render();
}

function replay() {
  const result = authenticate(session, stolenToken, now);
  log(result.ok ? 'warn' : 'ok', result.ok ? 'Copied token was still accepted.' : `Copied token denied: ${result.reason}.`);
  render();
}

function mutate(correctCsrf) {
  const csrf = correctCsrf ? session.csrf : 'forged-csrf';
  const result = authorizeMutation(session, browserToken, csrf, now);
  log(result.ok ? 'ok' : 'bad', result.ok ? 'State-changing request accepted.' : `Mutation denied: ${result.reason}.`);
  render();
}

function rotateNow() {
  browserToken = rotate(session, now);
  log('ok', 'Session rotated; the previous token entered the revocation set.');
  render();
}

function revokeNow() {
  revoke(session);
  log('ok', 'Current session revoked.');
  render();
}

function advance(seconds) {
  now += seconds;
  log('info', `Clock advanced by ${seconds}s.`);
  render();
}

function render() {
  $('#now').textContent = `${now}s`;
  $('#browser').textContent = browserToken;
  $('#stolen').textContent = stolenToken;
  $('#server').textContent = token(session);
  $('#csrf').textContent = session.csrf;
  $('#issued').textContent = `${session.issuedAt}s`;
  $('#lastSeen').textContent = `${session.lastSeenAt}s`;
  $('#revoked').textContent = session.revoked.size;
  $('#events').innerHTML = events.slice(0,10).map(e => `<div class="event ${e.kind}"><code>t+${e.at}</code><span>${e.text}</span></div>`).join('');
}

$('#browserReq').onclick = useBrowser;
$('#replay').onclick = replay;
$('#rotate').onclick = rotateNow;
$('#csrfGood').onclick = () => mutate(true);
$('#csrfBad').onclick = () => mutate(false);
$('#revoke').onclick = revokeNow;
$('#plus10').onclick = () => advance(10);
$('#plus901').onclick = () => advance(901);
$('#reset').onclick = reset;
reset();
