import { assessSchemaChange, demoGraph } from './core.mjs';

const graph = demoGraph();
const base = graph.schemas.raw_orders;
let scenario = 'remove-customer';
const $ = selector => document.querySelector(selector);

function scenarioSchema(name) {
  const after = structuredClone(base);

  if (name === 'remove-customer') delete after.customer_id;
  if (name === 'amount-string') after.amount = {type:'string',nullable:false};
  if (name === 'tighten-customer') after.customer_id = {type:'string',nullable:false};
  if (name === 'add-coupon') after.coupon_code = {type:'string',nullable:true};

  return after;
}

function humanChange(change) {
  if (change.kind === 'removed') return 'remove ' + change.column;
  if (change.kind === 'type-change') return change.column + ': ' + change.before.type + ' → ' + change.after.type;
  if (change.kind === 'nullability-tightened') return change.column + ': nullable → required';
  return 'add ' + change.column;
}

function renderDataset(name, impacted, sourceChanges) {
  const schema = graph.schemas[name] || (name === 'raw_orders' ? base : {});
  const columns = Object.keys(schema).map(column => {
    const key = name + '.' + column;
    const changed = name === 'raw_orders' && sourceChanges.some(change => change.column === column);
    const affected = impacted.has(key);
    return '<span class="column '+(changed?'changed ':'')+(affected?'affected':'')+'">'+column+'</span>';
  }).join('');

  return '<article class="dataset"><div><b>'+name+'</b><small>'+Object.keys(schema).length+' columns</small></div><div class="columns">'+columns+'</div></article>';
}

function render() {
  const after = scenarioSchema(scenario);
  const result = assessSchemaChange(graph,'raw_orders',base,after);
  const impacted = new Set(result.impacted);

  $('#breaking').textContent = result.breaking;
  $('#additive').textContent = result.additive;
  $('#downstream').textContent = result.impacted.length;
  $('#status').textContent = result.breaking ? 'REVIEW' : 'SAFE';
  $('#status').dataset.state = result.breaking ? 'review' : 'safe';

  $('#changes').innerHTML = result.changes.length
    ? result.changes.map(change =>
      '<div class="change"><b>'+humanChange(change)+'</b><span class="'+change.severity+'">'+change.severity+'</span><small>'+change.impact.length+' downstream columns</small></div>'
    ).join('')
    : '<p class="empty">No schema change.</p>';

  const order = ['raw_orders','clean_orders','order_mart','revenue_dashboard','crm_export'];
  $('#graph').innerHTML = order.map(name => renderDataset(name,impacted,result.changes)).join('<div class="arrow">↓</div>');

  $('#impacts').innerHTML = result.impacted.length
    ? result.impacted.map(key => '<code>'+key+'</code>').join('')
    : '<p class="empty">No downstream column impact.</p>';

  $('#after').textContent = JSON.stringify(after,null,2);
}

document.querySelectorAll('[data-scenario]').forEach(button => {
  button.onclick = () => {
    scenario = button.dataset.scenario;
    document.querySelectorAll('[data-scenario]').forEach(item => item.classList.toggle('active',item===button));
    render();
  };
});

document.querySelector('[data-scenario="remove-customer"]').classList.add('active');
render();
