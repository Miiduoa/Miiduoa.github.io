import { overview } from './core.mjs';
import { display } from './view.mjs';
const form=document.getElementById('inputs');
const keys=['arrival','serviceMinutes','servers','targetMinutes','surge'];
const input=()=>Object.fromEntries(keys.map(k=>[k,Number(form.elements.namedItem(k).value)]));
let last=null;
function update(){
  try {
    const params=input(), result=overview(params);
    last={model:'capacity/v1',params,result};
    document.getElementById('results').hidden=false;
    document.getElementById('error').hidden=true;
    display(params,result);
  } catch(error) {
    last=null;
    document.getElementById('results').hidden=true;
    document.getElementById('error').hidden=false;
    document.getElementById('error').textContent='輸入超出範圍，請檢查到達率、處理時間、服務席數及尖峰倍率。';
  }
}
form.addEventListener('input',update);
form.addEventListener('change',update);
document.getElementById('reset').addEventListener('click',()=>{form.reset();update()});
document.getElementById('export').addEventListener('click',()=>{
  if(!last)return;
  const data=JSON.stringify({...last,generatedAt:new Date().toISOString()},null,2);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=url;a.download='capacity-report.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
});
update();
