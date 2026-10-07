import { assessRelease, nextTraffic } from './core.mjs';

const $ = (selector) => document.querySelector(selector);
const ids = ['baselineRequests','baselineErrors','baselineP95','canaryRequests','canaryErrors','canaryP95','traffic'];
const presets = {
  healthy: [10000,100,220,2500,23,228,10],
  latency: [10000,100,220,2500,24,310,10],
  errors: [20000,100,220,5000,100,230,10],
  small: [10000,100,220,120,1,225,5]
};

function pct(x, digits = 2) {
  return `${(x * 100).toFixed(digits)}%`;
}

function num(id) {
  return Number($(`#${id}`).value);
}

function render() {
  try {
    const input = Object.fromEntries(ids.map(id => [id, num(id)]));
    const result = assessRelease(input);
    const badge = $('#decision');

    badge.textContent = result.decision;
    badge.dataset.state = result.decision.toLowerCase();

    $('#baselineRate').textContent = pct(result.baselineRate);
    $('#canaryRate').textContent = pct(result.canaryRate);
    $('#delta').textContent = `${result.errorDelta >= 0 ? '+' : ''}${(result.errorDelta * 100).toFixed(2)} pp`;
    $('#latency').textContent = `${result.latencyRatio.toFixed(2)}×`;
    $('#bci').textContent = `${pct(result.baselineCI[0])}–${pct(result.baselineCI[1])}`;
    $('#cci').textContent = `${pct(result.canaryCI[0])}–${pct(result.canaryCI[1])}`;
    $('#next').textContent = result.decision === 'ADVANCE'
      ? `${nextTraffic(input.traffic, result.decision)}% traffic`
      : `${input.traffic}% traffic`;
    $('#reasons').innerHTML = result.reasons.map(reason => `<li>${reason}</li>`).join('');
    $('#error').textContent = '';
  } catch (error) {
    $('#error').textContent = error.message;
  }
}

for (const id of ids) {
  $(`#${id}`).addEventListener('input', render);
}

document.querySelectorAll('[data-preset]').forEach(button => {
  button.addEventListener('click', () => {
    const values = presets[button.dataset.preset];
    ids.forEach((id, index) => {
      $(`#${id}`).value = values[index];
    });
    render();
  });
});

render();
