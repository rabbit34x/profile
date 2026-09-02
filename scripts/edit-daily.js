const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const dailyDir = path.join(root, "daily");
const buildScript = path.join(__dirname, "build-daily.js");
const host = "127.0.0.1";
const port = Number(process.env.DAILY_EDITOR_PORT || 4173);
const token = crypto.randomBytes(24).toString("hex");
const markerPattern = /<!-- daily-editor:([A-Za-z0-9+/=]+) -->\s*$/;

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function todayInJst() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function frontMatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const metadata = {};
  if (!match) return metadata;
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return metadata;
}

function decodeEditorData(source) {
  const match = source.match(markerPattern);
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function listEntries() {
  fs.mkdirSync(dailyDir, { recursive: true });
  return fs.readdirSync(dailyDir)
    .filter((filename) => /^\d{4}-\d{2}-\d{2}\.md$/.test(filename))
    .map((filename) => {
      const source = fs.readFileSync(path.join(dailyDir, filename), "utf8");
      const metadata = frontMatter(source);
      return {
        date: filename.slice(0, -3),
        title: metadata.title || filename.slice(0, -3) + "の記録",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function readEntry(date) {
  if (!validDate(date)) return null;
  const file = path.join(dailyDir, `${date}.md`);
  if (!fs.existsSync(file)) return null;
  const source = fs.readFileSync(file, "utf8");
  const editorData = decodeEditorData(source);
  if (editorData) return editorData;

  const metadata = frontMatter(source);
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  return {
    date,
    title: metadata.title || `${date}の記録`,
    summary: "",
    activities: [],
    other: body,
    importedBody: true,
  };
}

function cleanLine(value, fallback = "") {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim() || fallback;
}

function cleanText(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function normalizeData(input) {
  const date = cleanLine(input.date);
  if (!validDate(date)) throw new Error("日付が正しくありません。");

  const activities = Array.isArray(input.activities) ? input.activities.map((activity) => {
    const minutes = Number(activity.minutes || 0);
    if (!Number.isInteger(minutes) || minutes < 0) throw new Error("活動時間は0以上の整数で入力してください。");
    return {
      category: cleanLine(activity.category, "その他"),
      name: cleanLine(activity.name, "活動"),
      minutes,
      did: cleanText(activity.did),
      achieved: cleanText(activity.achieved),
      issues: cleanText(activity.issues),
      next: cleanText(activity.next),
      notes: cleanText(activity.notes),
    };
  }) : [];

  return {
    date,
    title: cleanLine(input.title, `${date}の記録`),
    summary: cleanText(input.summary),
    activities,
    other: cleanText(input.other),
  };
}

function paragraph(value) {
  return value || "-";
}

function renderMarkdown(data) {
  const minutes = data.activities.reduce((total, activity) => total + activity.minutes, 0);
  const categories = [...new Set(data.activities.map((activity) => activity.category))];
  const lines = [
    "---",
    `date: ${data.date}`,
    `title: ${data.title}`,
    `minutes: ${minutes}`,
    `categories: ${categories.join(", ")}`,
    "---",
    "",
    "## 今日の概要",
    "",
    paragraph(data.summary),
  ];

  const grouped = new Map();
  for (const activity of data.activities) {
    if (!grouped.has(activity.category)) grouped.set(activity.category, []);
    grouped.get(activity.category).push(activity);
  }

  for (const [category, activities] of grouped) {
    lines.push("", `## ${category}`);
    for (const activity of activities) {
      lines.push("", `### ${activity.name}`, "", `- 時間: ${activity.minutes}分`);
      const fields = [
        ["やったこと", activity.did],
        ["できたこと", activity.achieved],
        ["課題", activity.issues],
        ["次回試すこと", activity.next],
        ["メモ", activity.notes],
      ];
      for (const [label, value] of fields) {
        if (value) lines.push("", `#### ${label}`, "", value);
      }
    }
  }

  if (data.other) lines.push("", "## その他", "", data.other);
  const encoded = Buffer.from(JSON.stringify(data), "utf8").toString("base64");
  lines.push("", `<!-- daily-editor:${encoded} -->`, "");
  return lines.join("\n");
}

function saveEntry(input) {
  const data = normalizeData(input);
  fs.mkdirSync(dailyDir, { recursive: true });
  const file = path.join(dailyDir, `${data.date}.md`);
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, renderMarkdown(data));
  fs.renameSync(temporary, file);
  execFileSync(process.execPath, [buildScript], { cwd: root, stdio: "inherit" });
  return data;
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) request.destroy();
    });
    request.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error("送信内容を読み取れませんでした。")); }
    });
    request.on("error", reject);
  });
}

function editorHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>日々の記録エディター</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f8fa;color:#24292f;font-family:system-ui,sans-serif;line-height:1.5}main{width:min(100% - 24px,900px);margin:24px auto}.panel,.activity{padding:20px;border:1px solid #d0d7de;border-radius:6px;background:#fff}.toolbar{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin-bottom:16px}.toolbar label{flex:1;min-width:180px}h1{margin:0 0 20px;font-size:1.4rem}h2{font-size:1.05rem}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.wide{grid-column:1/-1}label{display:grid;gap:5px;font-size:.8rem;font-weight:600}input,select,textarea,button{font:inherit}input,select,textarea{width:100%;padding:8px;border:1px solid #d0d7de;border-radius:4px;background:#fff}textarea{min-height:88px;resize:vertical}.activity{position:relative;margin-top:12px;padding-top:42px}.activity-head{display:grid;grid-template-columns:1fr 2fr 180px;gap:10px}.minute-input{display:flex;gap:6px}.minute-input select{min-width:0}.minute-input input{width:76px}.remove{position:absolute;top:9px;right:12px;border:0;background:transparent;color:#cf222e;cursor:pointer}button{padding:8px 14px;border:1px solid #1f883d;border-radius:5px;background:#1f883d;color:#fff;cursor:pointer}button.secondary{border-color:#d0d7de;background:#f6f8fa;color:#24292f}button:disabled{opacity:.6;cursor:wait}.actions{display:flex;align-items:center;gap:12px;margin-top:20px}.status{font-size:.8rem}.status.error{color:#cf222e}.total{margin-left:auto;color:#57606a;font-size:.85rem}.notice{margin:12px 0;padding:10px;border:1px solid #d4a72c;background:#fff8c5;font-size:.8rem}@media(max-width:650px){.grid,.activity-head{grid-template-columns:1fr}.wide{grid-column:auto}.panel{padding:14px}}
</style>
</head>
<body><main>
<h1>日々の記録エディター</h1>
<div class="toolbar">
<label>既存の記録<select id="entries"><option value="">新規作成</option></select></label>
<button type="button" class="secondary" id="new-entry">新規</button>
</div>
<form class="panel" id="form">
<div class="grid">
<label>日付<input required type="date" id="date" value="${todayInJst()}"></label>
<label>タイトル<input id="title" value="${todayInJst()}の記録"></label>
<label class="wide">今日の概要<textarea id="summary"></textarea></label>
</div>
<div id="legacy-notice" class="notice" hidden>この記録はフォーム以外で作成されています。元の本文を「その他」に読み込みました。保存するとフォーム形式へ変換されます。</div>
<div class="actions"><h2>活動</h2><span class="total">合計 <strong id="total">0</strong>分</span></div>
<div id="activities"></div>
<button type="button" class="secondary" id="add-activity">＋ 活動を追加</button>
<div class="grid" style="margin-top:18px"><label class="wide">その他<textarea id="other"></textarea></label></div>
<div class="actions"><button id="save" type="submit">保存してビルド</button><span id="status" class="status"></span></div>
</form>
</main>
<template id="activity-template"><article class="activity">
<button type="button" class="remove" aria-label="この活動を削除">削除</button>
<div class="activity-head">
<label>カテゴリー<input data-field="category" list="category-list" placeholder="ゲーム"></label>
<label>活動名<input data-field="name" placeholder="GITADORA"></label>
<label>時間<div class="minute-input"><select data-minute-preset><option value="">選択</option><option value="15">15分</option><option value="30">30分</option><option value="45">45分</option><option value="60">1時間</option><option value="120">2時間</option><option value="180">3時間</option><option value="custom">自由入力</option></select><input data-field="minutes" type="number" min="0" step="1" value="0" aria-label="活動時間（分）" placeholder="分" hidden></div></label>
</div>
<div class="grid" style="margin-top:14px">
<label>やったこと<textarea data-field="did"></textarea></label>
<label>できたこと<textarea data-field="achieved"></textarea></label>
<label>課題<textarea data-field="issues"></textarea></label>
<label>次回試すこと<textarea data-field="next"></textarea></label>
<label class="wide">メモ<textarea data-field="notes"></textarea></label>
</div></article></template>
<datalist id="category-list"><option value="ゲーム"><option value="絵"><option value="プログラミング"><option value="読書"><option value="運動"></datalist>
<script>
const TOKEN=${JSON.stringify(token)};
const TODAY=${JSON.stringify(todayInJst())};
const fields=["category","name","minutes","did","achieved","issues","next","notes"];
const minutePresets=["15","30","45","60","120","180"];
const form=document.querySelector("#form");
const activities=document.querySelector("#activities");
const statusElement=document.querySelector("#status");
function setStatus(message,error){statusElement.textContent=message;statusElement.classList.toggle("error",Boolean(error));}
async function api(url,options){const response=await fetch(url,Object.assign({headers:{"X-Editor-Token":TOKEN}},options||{}));const result=await response.json();if(!response.ok)throw new Error(result.error||"処理に失敗しました。");return result;}
function updateTotal(){let total=0;activities.querySelectorAll('[data-field="minutes"]').forEach(function(input){total+=Number(input.value)||0;});document.querySelector("#total").textContent=String(total);}
function addActivity(value){const node=document.querySelector("#activity-template").content.firstElementChild.cloneNode(true);value=value||{};fields.forEach(function(field){if(field!=="minutes")node.querySelector('[data-field="'+field+'"]').value=value[field]||"";});const minutesInput=node.querySelector('[data-field="minutes"]');const preset=node.querySelector("[data-minute-preset]");const minuteValue=String(value.minutes||0);minutesInput.value=minuteValue;if(minutePresets.includes(minuteValue)){preset.value=minuteValue;minutesInput.hidden=true;}else if(Number(minuteValue)>0){preset.value="custom";minutesInput.hidden=false;}else{preset.value="";minutesInput.hidden=true;}preset.addEventListener("change",function(){if(preset.value==="custom"){minutesInput.hidden=false;minutesInput.value="";minutesInput.focus();}else{minutesInput.hidden=true;minutesInput.value=preset.value||"0";}updateTotal();});node.querySelector(".remove").addEventListener("click",function(){node.remove();updateTotal();});minutesInput.addEventListener("input",updateTotal);activities.append(node);updateTotal();}
function resetForm(){document.querySelector("#date").value=TODAY;document.querySelector("#title").value=TODAY+"の記録";document.querySelector("#summary").value="";document.querySelector("#other").value="";document.querySelector("#legacy-notice").hidden=true;activities.replaceChildren();addActivity({category:"ゲーム",minutes:0});document.querySelector("#entries").value="";setStatus("");}
function formData(){return {date:document.querySelector("#date").value,title:document.querySelector("#title").value,summary:document.querySelector("#summary").value,other:document.querySelector("#other").value,activities:Array.from(activities.children).map(function(node){const value={};fields.forEach(function(field){value[field]=node.querySelector('[data-field="'+field+'"]').value;});value.minutes=Number(value.minutes)||0;return value;})};}
function loadData(data){document.querySelector("#date").value=data.date;document.querySelector("#title").value=data.title||data.date+"の記録";document.querySelector("#summary").value=data.summary||"";document.querySelector("#other").value=data.other||"";document.querySelector("#legacy-notice").hidden=!data.importedBody;activities.replaceChildren();(data.activities||[]).forEach(addActivity);if(!data.activities||!data.activities.length)addActivity();setStatus("");}
async function refreshEntries(selected){const result=await api("/api/entries");const select=document.querySelector("#entries");select.innerHTML='<option value="">新規作成</option>';result.entries.forEach(function(entry){const option=document.createElement("option");option.value=entry.date;option.textContent=entry.date+" — "+entry.title;select.append(option);});if(selected)select.value=selected;}
document.querySelector("#add-activity").addEventListener("click",function(){addActivity();});document.querySelector("#new-entry").addEventListener("click",resetForm);document.querySelector("#date").addEventListener("change",function(event){if(!document.querySelector("#title").value||/^\\d{4}-\\d{2}-\\d{2}の記録$/.test(document.querySelector("#title").value))document.querySelector("#title").value=event.target.value+"の記録";});document.querySelector("#entries").addEventListener("change",async function(event){if(!event.target.value){resetForm();return;}try{loadData((await api("/api/entry?date="+encodeURIComponent(event.target.value))).entry);}catch(error){setStatus(error.message,true);}});
form.addEventListener("submit",async function(event){event.preventDefault();const button=document.querySelector("#save");button.disabled=true;setStatus("保存・ビルド中…");try{const result=await api("/api/save",{method:"POST",headers:{"Content-Type":"application/json","X-Editor-Token":TOKEN},body:JSON.stringify(formData())});await refreshEntries(result.entry.date);setStatus("保存とビルドが完了しました。");}catch(error){setStatus(error.message,true);}finally{button.disabled=false;}});
resetForm();refreshEntries().catch(function(error){setStatus(error.message,true);});
</script></body></html>`;
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${host}:${port}`);
  if (requestUrl.pathname !== "/" && request.headers["x-editor-token"] !== token) {
    sendJson(response, 403, { error: "アクセスが拒否されました。" });
    return;
  }

  try {
    if (request.method === "GET" && requestUrl.pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(editorHtml());
    } else if (request.method === "GET" && requestUrl.pathname === "/api/entries") {
      sendJson(response, 200, { entries: listEntries() });
    } else if (request.method === "GET" && requestUrl.pathname === "/api/entry") {
      const entry = readEntry(requestUrl.searchParams.get("date") || "");
      if (!entry) sendJson(response, 404, { error: "記録が見つかりません。" });
      else sendJson(response, 200, { entry });
    } else if (request.method === "POST" && requestUrl.pathname === "/api/save") {
      const entry = saveEntry(await readJson(request));
      sendJson(response, 200, { entry });
    } else {
      sendJson(response, 404, { error: "Not found" });
    }
  } catch (error) {
    console.error(error);
    sendJson(response, 400, { error: error.message || "処理に失敗しました。" });
  }
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}/`;
  console.log(`Daily editor: ${url}`);
  console.log("終了するには Ctrl+C を押してください。");
  if (!process.argv.includes("--no-open")) {
    const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    try {
      const child = spawn(command, args, { detached: true, stdio: "ignore" });
      child.on("error", () => console.log("ブラウザで上記URLを開いてください。"));
      child.unref();
    } catch {
      console.log("ブラウザで上記URLを開いてください。");
    }
  }
});
