import {queue} from './core.mjs';
export function drawChart(input,center){
 const current=input.servers;
 const start=Math.max(1,Math.min(center,current)-4);
 const end=Math.min(120,Math.max(center,current)+7);
 const values=[];
 for(let n=start;n<=end;n++)values.push({n,p:queue({...input,servers:n}).overTargetProbability});
 const x=n=>52+(n-start)/Math.max(1,end-start)*656;
 const y=p=>24+(1-p)*192;
 const path=values.map((v,i)=>(i?'L':'M')+x(v.n).toFixed(1)+','+y(v.p).toFixed(1)).join(' ');
 const svg=document.getElementById('curve');
 const ns='http://www.w3.org/2000/svg';
 const add=(tag,attrs,txt)=>{
  const el=document.createElementNS(ns,tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
  if(txt!==undefined)el.textContent=txt;
  svg.append(el);
 };
 svg.replaceChildren();
 [0,.25,.5,.75,1].forEach(p=>{
  add('line',{x1:52,x2:708,y1:y(p),y2:y(p),stroke:'#d5dce1'});
  add('text',{x:42,y:y(p)+4,'text-anchor':'end','font-size':11,fill:'#667681'},(p*100)+'%');
 });
 add('line',{x1:52,x2:708,y1:y(.1),y2:y(.1),stroke:'#b96c53','stroke-dasharray':'6 5'});
 add('path',{d:path,stroke:'#245777','stroke-width':3,fill:'none'});
 values.forEach(v=>{
  add('circle',{cx:x(v.n),cy:y(v.p),r:v.n===current?6:3,fill:v.n===current?'#d5874c':'#245777'});
  if(v.n===current||v.n===center||v.n===start||v.n===end)
   add('text',{x:x(v.n),y:245,'text-anchor':'middle','font-size':11,fill:'#667681'},v.n);
 });
 add('text',{x:708,y:15,'text-anchor':'end','font-size':11,fill:'#b96c53'},'目標 10%');
}
