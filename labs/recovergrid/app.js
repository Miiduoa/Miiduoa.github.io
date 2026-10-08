import { demoPlan, evaluateRestore } from "./core.mjs";

const $ = id => document.getElementById(id);
const fields = ["rpo", "rto", "delay"];
const scenarios = {
  normal: "一般狀況", regional: "區域失效", corruption: "備份損毀", tight: "目標過緊"
};
let scenario = "normal";
let plan = demoPlan(scenario);

function setText(id, value) { $(id).textContent = String(value); }
function label(status) {
  return { "WITHIN TARGET":"符合目標", "TARGET MISSED":"未達目標", "UNRECOVERABLE":"無法還原" }[status];
}
function numberField(id) {
  const value = Number($(id).value);
  if (!Number.isSafeInteger(value) || value < 0 || !$(id).value.trim()) throw new Error("時間必須是非負整數");
  return value;
}
function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
}
function row(parent, name, value) {
  const tr = element("tr");
  tr.append(element("th", "", name), element("td", "", value));
  parent.append(tr);
}
function draw() {
  $("error").textContent = "";
  try {
    const input = {
      ...plan, policy:$("policy").value, rpoTargetMinutes:numberField("rpo"),
      rtoTargetMinutes:numberField("rto"), decisionMinutes:numberField("delay")
    };
    const result = evaluateRestore(input);
    setText("decision", label(result.status));
    $("decision").dataset.state = result.status;
    setText("chosen", result.selected ? result.selected.id : "沒有可用的還原點");
    setText("rpoValue", result.selected ? result.selected.rpoMinutes + " 分鐘" : "—");
    setText("rtoValue", result.selected ? result.selected.rtoMinutes + " 分鐘" : "—");
    $("reason").textContent = result.selected
      ? (result.violations.length ? result.violations.join("、") : "已通過資格檢查，預估落在 RPO / RTO 範圍內。")
      : "請先確認來源區域、備份完成時間和完整性檢查。";
    const table = $("candidates");
    table.replaceChildren();
    for (const item of result.candidates) {
      const tr = element("tr");
      const quality = element("td");
      quality.append(element("span", item.eligible ? "good" : "bad", item.eligible ? "可選" : item.reasons.join("；")));
      tr.append(element("td", "mono", item.id), element("td", "", item.region.toUpperCase()),
        element("td", "mono", item.capturedAt.slice(11,16) + " UTC"),
        element("td", "", item.rpoMinutes + "m"), element("td", "", item.rtoMinutes + "m"), quality);
      if (result.selected?.id === item.id) tr.className = "selected";
      table.append(tr);
    }
    const steps = $("steps"); steps.replaceChildren();
    if (result.selected) {
      const entries = Object.entries(result.selected.steps);
      const labels = { decision:"決策", transfer:"傳輸", restore:"還原", verification:"驗證" };
      for (const [name, duration] of entries) {
        const wrap = element("div", "step");
        const header = element("div", "step-head");
        header.append(element("span", "", labels[name]), element("strong", "", duration + " 分鐘"));
        const track = element("div", "track"); const bar = element("span", "bar");
        bar.style.width = Math.min(100, result.selected.rtoMinutes ? duration / result.selected.rtoMinutes * 100 : 0) + "%";
        track.append(bar); wrap.append(header, track); steps.append(wrap);
      }
    } else steps.append(element("p","muted","目前沒有可安排的還原流程。"));
    setText("policyNote", input.policy === "freshest" ? "優先減少資料遺失，再比較還原時間。" : "優先縮短中斷時間，再比較資料落差。");
  } catch (error) {
    $("error").textContent = error.message;
    $("decision").textContent = "輸入無效";
    $("decision").dataset.state = "UNRECOVERABLE";
    for (const id of ["chosen","rpoValue","rtoValue","reason","policyNote"]) setText(id, "—");
    $("candidates").replaceChildren(); $("steps").replaceChildren();
  }
}
function load(name) {
  scenario = name; plan = demoPlan(name);
  $("rpo").value = plan.rpoTargetMinutes;
  $("rto").value = plan.rtoTargetMinutes;
  $("delay").value = plan.decisionMinutes;
  $("policy").value = plan.policy;
  document.querySelectorAll("[data-scenario]").forEach(button => {
    const active = button.dataset.scenario === name;
    button.setAttribute("aria-pressed", String(active));
  });
  draw();
}
document.querySelectorAll("[data-scenario]").forEach(button => button.addEventListener("click", () => load(button.dataset.scenario)));
[...fields,"policy"].forEach(id => $(id).addEventListener(id === "policy" ? "change" : "input", draw));
load(scenario);
