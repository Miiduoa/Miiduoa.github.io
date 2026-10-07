import { evaluate, scenarioTable } from './core.mjs';
const form = document.querySelector('#model');
const readout = document.querySelector('#readout');
const rows = document.querySelector('#scenarios');
const chart = document.querySelector('#chart');
const graphLegend = document.querySelector('#graph-legend');
const state = document.querySelector('#state');
const formatter = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });
const money = v => (v < 0 ? '−' : '') + 'NT$ ' + formatter.format(Math.round(Math.abs(v)));
const percent = v => (v * 100).toFixed(1) + '%';
const inputs = ['liquid', 'price', 'down', 'reserve', 'budget', 'apr', 'term', 'horizon', 'annualReturn'];
let latest = null;
function getInput() {
  const data = Object.fromEntries(inputs.map(name => [name, Number(form.elements.namedItem(name).value)]));
  data.apr /= 100;
  data.annualReturn /= 100;
  data.horizon *= 12;
  return data;
}
function chartLine(track, name, max, min, w, h) {
  const x = m => 47 + (m / track.at(-1).month) * (w - 72);
  const y = val => 14 + (max - val) / (max - min || 1) * (h - 42);
  return track.map((row, index) => (index ? 'L ' : 'M ') + x(row.month).toFixed(2) + ' ' + y(row[name]).toFixed(2)).join(' ');
}
function draw(track) {
  const w = 720, h = 240;
  const values = track.flatMap(r => [r.cash, r.financed]);
  const lo = Math.min(0, ...values), hi = Math.max(1, ...values);
  const buffer = (hi - lo) * .09;
  const max = hi + buffer, min = lo - buffer;
  const y = v => 14 + (max - v) / (max - min) * (h - 42);
  const grid = Array.from({ length: 5 }, (_, i) => {
    const value = min + ((max - min) * i / 4);
    const line = y(value);
    return '<line x1="47" x2="695" y1="' + line + '" y2="' + line + '" stroke="#d9d8cf"/><text x="39" y="' + (line + 4) + '" text-anchor="end" fill="#667268" font-size="11">' + (value / 1e6).toFixed(1) + '</text>';
  }).join('');
  const yearMarks = Array.from({ length: Math.floor(track.at(-1).month / 12) }, (_, i) => {
    const m = (i + 1) * 12;
    return '<text x="' + (47 + m / track.at(-1).month * 648) + '" y="231" text-anchor="middle" font-size="11" fill="#667268">' + (i + 1) + '年</text>';
  }).join('');
  chart.innerHTML = grid + '<path d="' + chartLine(track, 'cash', max, min, w, h) + '" fill="none" stroke="#3b6655" stroke-width="3" stroke-linejoin="round"/><path d="' + chartLine(track, 'financed', max, min, w, h) + '" fill="none" stroke="#b27939" stroke-width="3" stroke-linejoin="round"/>' + yearMarks + '<text x="7" y="11" font-size="11" fill="#667268">百萬</text>';
}
function render() {
  try {
    const input = getInput();
    const result = evaluate(input);
    const scenarios = scenarioTable(input);
    latest = { input, result, scenarios };
    state.hidden = true;
    readout.hidden = false;
    document.querySelector('#installment').textContent = money(result.installment);
    document.querySelector('#cash-result').textContent = money(result.cashWealth);
    document.querySelector('#credit-result').textContent = money(result.financedWealth);
    const edge = document.querySelector('#difference');
    edge.textContent = money(result.difference);
    edge.className = result.difference >= 0 ? 'value gain' : 'value loss';
    document.querySelector('#verdict').textContent = result.difference >= 0 ? '此情境下，貸款方案期末淨資產較高' : '此情境下，現金購買方案期末淨資產較高';
    document.querySelector('#loan-cost').textContent = money(result.loanInterest);
    document.querySelector('#debt').textContent = money(result.outstanding);
    document.querySelector('#threshold').textContent = percent(result.effectiveBorrowingRate);
    document.querySelector('#budget-left').textContent = money(input.budget - result.installment);
    rows.replaceChildren(...scenarios.map(s => {
      const tr = document.createElement('tr');
      [percent(s.rate), money(s.cashWealth), money(s.financedWealth), money(s.difference)].forEach((txt, index) => {
        const td = document.createElement(index === 0 ? 'th' : 'td');
        td.textContent = txt;
        if (index === 3) td.className = s.difference >= 0 ? 'gain' : 'loss';
        tr.append(td);
      });
      return tr;
    }));
    graphLegend.textContent = '每年報酬 ' + percent(input.annualReturn) + '，單位：百萬元（包含現金預備金；貸款餘額已扣除）';
    draw(result.track);
  } catch (error) {
    latest = null;
    state.hidden = false;
    state.textContent = error.message.includes('budget') ? '每月可投入金額不足以支付月付金。請調整貸款或每月預算。'
      : error.message.includes('liquid') ? '可動用資金不足以同時支應全額購車與保留現金。'
      : '輸入條件不合理，請檢查價格、頭期款、期數與報酬率。';
    readout.hidden = true;
  }
}
form.addEventListener('input', render);
form.addEventListener('change', render);
document.querySelector('#reset').addEventListener('click', () => { form.reset(); render(); });
document.querySelector('#export').addEventListener('click', () => {
  if (!latest) return;
  const content = JSON.stringify({
    model: 'carry/v1', generatedAt: new Date().toISOString(), currency: 'TWD',
    methodology: 'fixed monthly return; end-of-month contributions; equal monthly budget; vehicle value excluded',
    ...latest,
  }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'carry-scenario.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
});
render();
