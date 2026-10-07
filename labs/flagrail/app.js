import { evaluateFlag, demoFlag, stableBucket } from './core.mjs';

let flag = demoFlag();
const $ = selector => document.querySelector(selector);

const sampleUsers = [
  {userId:'u-1001',role:'student',country:'TW',plan:'free'},
  {userId:'u-1002',role:'staff',country:'TW',plan:'free'},
  {userId:'u-1003',role:'student',country:'JP',plan:'pro'},
  {userId:'u-1004',role:'student',country:'TW',plan:'pro'},
  {userId:'u-1005',role:'student',country:'US',plan:'free'},
  {userId:'u-1006',role:'student',country:'KR',plan:'free'},
  {userId:'u-1007',role:'student',country:'SY',plan:'pro'},
  {userId:'u-1008',role:'student',country:'TW',plan:'free'}
];

function contextFromForm() {
  return {
    userId: $('#userId').value.trim(),
    role: $('#role').value,
    country: $('#country').value.trim().toUpperCase(),
    plan: $('#plan').value
  };
}

function decisionText(result) {
  if (result.reason === 'rule') return 'matched ' + result.ruleId;
  if (result.reason === 'rollout') return 'bucket ' + result.bucket + ' / ' + result.threshold;
  return result.reason;
}

function render() {
  flag.rollout = Number($('#rollout').value);
  flag.killSwitch = $('#kill').checked;
  $('#rolloutValue').textContent = flag.rollout + '%';

  const context = contextFromForm();
  const result = evaluateFlag(flag,context);
  const badge = $('#decision');
  badge.textContent = result.value ? 'ON' : 'OFF';
  badge.dataset.state = result.value ? 'on' : 'off';
  $('#reason').textContent = decisionText(result);
  $('#bucket').textContent = context.userId ? stableBucket(context.userId,flag.salt) : '—';

  $('#rules').innerHTML = flag.rules.map((rule,index) =>
    '<div class="rule"><b>0'+(index+1)+' · '+rule.id+'</b><span>'+rule.all.map(c => c.attribute+' '+c.op+' '+JSON.stringify(c.value)).join(' AND ')+'</span><strong>'+String(rule.value).toUpperCase()+'</strong></div>'
  ).join('');

  $('#matrix').innerHTML = sampleUsers.map(user => {
    const evaluated = evaluateFlag(flag,user);
    return '<div class="user"><code>'+user.userId+'</code><span>'+user.role+' · '+user.country+' · '+user.plan+'</span><b class="'+(evaluated.value?'yes':'no')+'">'+(evaluated.value?'ON':'OFF')+'</b><small>'+decisionText(evaluated)+'</small></div>';
  }).join('');
}

['userId','role','country','plan','rollout','kill'].forEach(id => {
  $('#'+id).addEventListener(id === 'kill' ? 'change' : 'input',render);
  if (id === 'role' || id === 'plan') $('#'+id).addEventListener('change',render);
});

document.querySelectorAll('[data-preset]').forEach(button => {
  button.onclick = () => {
    const preset = button.dataset.preset;
    if (preset === 'staff') Object.assign($('#userId'),{value:'staff-77'}), $('#role').value='staff', $('#country').value='TW', $('#plan').value='free';
    if (preset === 'pro') Object.assign($('#userId'),{value:'pro-21'}), $('#role').value='student', $('#country').value='TW', $('#plan').value='pro';
    if (preset === 'ordinary') Object.assign($('#userId'),{value:'student-42'}), $('#role').value='student', $('#country').value='JP', $('#plan').value='free';
    render();
  };
});

render();
