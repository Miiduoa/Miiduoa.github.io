import { demoEvents, sealEvents, verifyLedger } from "./core.mjs";

const $ = id => document.getElementById(id);
let ledger;
let checkpoint;
let pending = 0;
let rendering = 0;

function text(id, value) { $(id).textContent = String(value); }
function node(tag, value, className = "") {
  const n = document.createElement(tag);
  n.textContent = String(value ?? "—");
  if (className) n.className = className;
  return n;
}

async function display() {
  const current = ++rendering;
  const result = await verifyLedger(ledger, $("checkIndependent").checked ? checkpoint : null);
  if (current !== rendering) return;
  text("status", result.ok ? (result.anchored ? "與獨立檢查點一致" : "只有內部一致") : "驗證失敗");
  $("status").dataset.status = result.ok ? (result.anchored ? "verified" : "unanchored") : "failed";
  text("explanation", !result.ok ? result.reason :
    result.anchored ? "內容、事件順序、前筆雜湊與獨立檢查點全部符合。"
      : "這只代表雜湊鏈內部一致，無法排除整段遭改寫或截斷。");
  text("external", checkpoint?.hash ?? "尚未設定獨立檢查點");
  text("embedded", ledger?.anchor?.hash ?? "無");
  text("count", Array.isArray(ledger?.entries) ? ledger.entries.length : "—");
  $("saveAnchor").disabled = !checkpoint;
  const body = $("events");
  body.replaceChildren();
  if (!Array.isArray(ledger?.entries)) return;
  for (const entry of ledger.entries.slice(0, 100)) {
    const event = entry?.event ?? {};
    const tr = document.createElement("tr");
    for (const [value, className] of [
      [entry?.seq, "mono"], [String(event.at ?? "").slice(11, 19), "mono"],
      [event.actor, "mono"], [event.action, ""], [event.note, ""],
      [String(entry?.hash ?? "").slice(0, 12), "mono"]
    ]) tr.append(node("td", value, className));
    body.append(tr);
  }
}

async function showCase(kind) {
  const current = ++pending;
  text("message", "");
  try {
    const original = await sealEvents(demoEvents());
    if (current !== pending) return;
    checkpoint = { ...original.anchor };
    ledger = original;
    if (kind === "edit") ledger.entries[1].event.note = "擅自變更為自動核准";
    if (kind === "swap") [ledger.entries[0], ledger.entries[1]] = [ledger.entries[1], ledger.entries[0]];
    if (kind === "truncate") {
      ledger.entries.pop();
      ledger.anchor = { count:ledger.entries.length, hash:ledger.entries.at(-1)?.hash ?? "0".repeat(64) };
    }
    if (kind === "rewrite") {
      const events = demoEvents();
      events[1].note = "重寫審核結果並重算所有雜湊";
      ledger = await sealEvents(events);
    }
    $("checkIndependent").checked = true;
    document.querySelectorAll("[data-case]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.case === kind));
    });
    await display();
  } catch (error) { text("message", error.message); }
}

function save(name, object) {
  if (!object) return;
  const blob = new Blob([JSON.stringify(object, null, 2) + "\n"], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function parseFile(file) {
  if (!file || file.size > 120000) throw new TypeError("JSON 檔案不可超過 120 KB");
  return JSON.parse(await file.text());
}

$("saveLog").addEventListener("click", () => save("proofline-ledger.json", ledger));
$("saveAnchor").addEventListener("click", () => save("proofline-anchor.json", checkpoint));
$("checkIndependent").addEventListener("change", display);
document.querySelectorAll("[data-case]").forEach(b => b.addEventListener("click", () => showCase(b.dataset.case)));

$("openLog").addEventListener("change", async e => {
  try {
    const file = await parseFile(e.target.files[0]);
    ++pending;
    ledger = file;
    checkpoint = null;
    $("checkIndependent").checked = true;
    document.querySelectorAll("[data-case]").forEach(b => b.setAttribute("aria-pressed", "false"));
    text("message", "已讀取本機紀錄。若要確認完整性，請再提供獨立保存的檢查點。");
    await display();
  } catch (error) { text("message", "匯入失敗：" + error.message); }
  e.target.value = "";
});
$("openAnchor").addEventListener("change", async e => {
  try {
    if (!ledger) throw new Error("請先載入紀錄");
    checkpoint = await parseFile(e.target.files[0]);
    $("checkIndependent").checked = true;
    text("message", "已載入檢查點。");
    await display();
  } catch (error) { text("message", "檢查點讀取失敗：" + error.message); }
  e.target.value = "";
});
showCase("original");
