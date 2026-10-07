import { analyzeTrace, demoTrace } from './core.mjs';

let spans = demoTrace(false);
let selected = 'root';
const $ = selector => document.querySelector(selector);

function issueText(issue) {
  if (issue.type === 'parent-boundary') return issue.spanId + ' escapes parent ' + issue.parentId;
  if (issue.type === 'missing-parent') return issue.spanId + ' references missing parent ' + issue.parentId;
  if (issue.type === 'cycle') return 'cycle detected near ' + issue.spanId;
  return issue.type + ' on ' + issue.spanId;
}

function render() {
  const analysis = analyzeTrace(spans);
  const maxEnd = Math.max(...analysis.rows.map(row => row.end),1);

  $('#wall').textContent = analysis.wallTime + ' ms';
  $('#spanCount').textContent = analysis.rows.length;
  $('#issueCount').textContent = analysis.issues.length;
  $('#bottleneck').textContent = analysis.bottleneck ? analysis.bottleneck.service : '—';

  $('#timeline').innerHTML = analysis.rows
    .slice()
    .sort((a,b) => a.start-b.start || b.duration-a.duration)
    .map(row => {
      const left = (row.start/maxEnd)*100;
      const width = Math.max(1.5,(row.duration/maxEnd)*100);
      const isSelected = row.id === selected ? ' selected' : '';
      return '<button class="span'+isSelected+'" data-id="'+row.id+'"><span class="span-label"><b>'+row.service+'</b><small>'+row.name+'</small></span><span class="track"><i style="left:'+left+'%;width:'+width+'%"></i></span><code>'+row.duration+'ms</code></button>';
    }).join('');

  const chosen = analysis.rows.find(row => row.id === selected) || analysis.rows[0];
  if (chosen) {
    $('#detail').innerHTML =
      '<div class="kv"><span>Span</span><strong>'+chosen.id+'</strong></div>'+
      '<div class="kv"><span>Service</span><strong>'+chosen.service+'</strong></div>'+
      '<div class="kv"><span>Duration</span><strong>'+chosen.duration+' ms</strong></div>'+
      '<div class="kv"><span>Exclusive</span><strong>'+chosen.exclusive+' ms</strong></div>'+
      '<div class="kv"><span>Parent</span><strong>'+(chosen.parentId || 'root')+'</strong></div>';
  }

  $('#issues').innerHTML = analysis.issues.length
    ? analysis.issues.map(issue => '<div class="issue">'+issueText(issue)+'</div>').join('')
    : '<p class="empty">No structural issue in this trace.</p>';

  $('#services').innerHTML = analysis.services.map(service =>
    '<div class="service"><span>'+service.service+'</span><b>'+service.exclusive+' ms exclusive</b><small>'+service.spans+' spans</small></div>'
  ).join('');

  document.querySelectorAll('.span[data-id]').forEach(button => {
    button.onclick = () => { selected = button.dataset.id; render(); };
  });
}

$('#healthy').onclick = () => { spans = demoTrace(false); selected='root'; render(); };
$('#skew').onclick = () => { spans = demoTrace(true); selected='late'; render(); };
render();
