import {queue} from './core.mjs';
import {drawChart} from './plot.mjs';
const out=(id,value)=>document.getElementById(id).textContent=value;
const pct=x=>(x*100).toFixed(1)+'%';
const min=x=>Number.isFinite(x)?x.toFixed(1)+' 分':'無穩態值';
export function display(input,result){
 const a=result.regular,b=result.surge;
 out('occupancy',pct(a.utilization));
 out('delay',pct(a.waitProbability));
 out('wait',min(a.meanWaitMinutes));
 out('sla',pct(a.overTargetProbability));
 out('peak',pct(b.overTargetProbability));
 out('regular-head',result.regularRecommendation?result.regularRecommendation.servers+' 席':'超過 120 席');
 out('surge-head',result.surgeRecommendation?result.surgeRecommendation.servers+' 席':'超過 120 席');
 out('condition',a.stable?'穩態模型可計算；平均總停留 '+min(a.meanTotalMinutes):'到達量已達處理上限，沒有有限的穩態平均等待時間。');
 out('peak-arrivals',(input.arrival*input.surge).toFixed(1));
 out('target',input.targetMinutes.toFixed(1));
 const center=result.regularRecommendation?.servers??input.servers;
 const from=Math.max(1,Math.min(center,input.servers)-2);
 const to=Math.min(120,Math.max(center,input.servers)+3);
 const body=document.getElementById('staff');
 body.replaceChildren();
 for(let n=from;n<=to;n++){
  const q=queue({...input,servers:n});
  const tr=document.createElement('tr');
  const values=[n,pct(q.utilization),min(q.meanWaitMinutes),pct(q.overTargetProbability),!q.stable?'超載':q.overTargetProbability<=.1?'達標':'未達標'];
  values.forEach((v,i)=>{const td=document.createElement(i===0?'th':'td');td.textContent=v;tr.append(td)});
  if(n===input.servers)tr.className='current';
  body.append(tr);
 }
 drawChart(input,center);
}
