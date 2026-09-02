const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");
const { renderSidebar } = require("./components");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "daily");
const outputDir = path.join(root, "log");
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseEntry(filename) {
  const source = fs.readFileSync(path.join(sourceDir, filename), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!match) throw new Error(`${filename}: YAML front matter is required`);

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    metadata[key] = value;
  }

  if (!validDate(metadata.date || "")) {
    throw new Error(`${filename}: date must be a real date in YYYY-MM-DD format`);
  }

  const slug = path.basename(filename, ".md");
  if (slug !== metadata.date) {
    throw new Error(`${filename}: filename must match date (${metadata.date}.md)`);
  }

  const minutes = Number(metadata.minutes ?? 0);
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error(`${filename}: minutes must be a non-negative integer`);
  }

  const editorMarker = (match[2] || "").match(/<!-- daily-editor:([A-Za-z0-9+/=]+) -->\s*$/);
  let editorData = null;
  if (editorMarker) {
    try {
      editorData = JSON.parse(Buffer.from(editorMarker[1], "base64").toString("utf8"));
    } catch {
      throw new Error(`${filename}: daily editor metadata is invalid`);
    }
  }
  const bodySource = (match[2] || "")
    .replace(/\r?\n?<!-- daily-editor:[A-Za-z0-9+/=]+ -->\s*$/, "");

  return {
    slug,
    date: metadata.date,
    title: metadata.title || `${metadata.date}の記録`,
    minutes,
    categories: (metadata.categories || "").split(",").map((item) => item.trim()).filter(Boolean),
    body: markdown.render(bodySource),
    editorData,
  };
}

function layout({ title, content, depth = 0, script = "" }) {
  const prefix = depth ? "../" : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="${prefix}favicon.ico">
  <link rel="stylesheet" href="${prefix}style.css">
</head>
<body>
<div class="page-shell">
${renderSidebar({ active: "log", prefix })}

  <main class="page-content">
${content}
    <footer class="site-footer">
      <div class="site-footer-meta">
        <span>Last updated: <time data-last-updated></time></span>
        <span>Commit: <a data-commit></a></span>
      </div>
      <div class="site-footer-legal">
        <span>管理者が権利を有するコンテンツは <a rel="license" href="https://creativecommons.org/licenses/by/4.0/deed.ja">CC BY 4.0</a> で提供しています。</span>
        <span>© 2026 kn_iidx</span>
      </div>
    </footer>
  </main>
</div>
<script src="${prefix}site-meta.js"></script>
<script src="${prefix}site.js"></script>
${script ? `<script src="${prefix}${script}"></script>\n` : ""}</body>
</html>
`;
}

function utcDate(dateString) {
  return new Date(`${dateString}T00:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function level(minutes, recorded) {
  if (!recorded) return 0;
  if (minutes === 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

const weekdayLabels = ["", "月", "", "水", "", "金", ""];

function textWithBreaks(value) {
  return escapeHtml(String(value || "")).replaceAll("\n", "<br>");
}

function renderEditorEntry(data) {
  const parts = [];
  if (data.summary) {
    parts.push(`<div class="daily-summary">
        <h2>今日の概要</h2>
        <p>${textWithBreaks(data.summary)}</p>
      </div>`);
  }

  const grouped = new Map();
  const activities = Array.isArray(data.activities) ? data.activities : [];
  for (const activity of activities) {
    const category = String(activity.category || "その他");
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(activity);
  }

  const fields = [
    ["やったこと", "did"],
    ["できたこと", "achieved"],
    ["課題", "issues"],
    ["次回試すこと", "next"],
    ["メモ", "notes"],
  ];

  for (const [category, categoryActivities] of grouped) {
    const cards = categoryActivities.map((activity) => {
      const details = fields
        .filter(([, key]) => activity[key])
        .map(([label, key]) => `<div><dt>${label}</dt><dd>${textWithBreaks(activity[key])}</dd></div>`)
        .join("\n");
      return `<article class="daily-activity">
          <header><h3>${escapeHtml(activity.name || "活動")}</h3><span>${Number(activity.minutes) || 0}分</span></header>
          ${details ? `<dl>${details}</dl>` : '<p class="empty-state">詳細はありません。</p>'}
        </article>`;
    }).join("\n");
    parts.push(`<div class="daily-category">
        <h2>${escapeHtml(category)}</h2>
${cards}
      </div>`);
  }

  if (data.other) {
    parts.push(`<div class="daily-other">
        <h2>その他</h2>
        <p>${textWithBreaks(data.other)}</p>
      </div>`);
  }

  return parts.length ? parts.join("\n") : '<p class="empty-state">内容はありません。</p>';
}

function graphForYear(year, entriesByDate, selected) {
  const first = new Date(Date.UTC(year, 0, 1));
  const last = new Date(Date.UTC(year, 11, 31));
  const start = addDays(first, -first.getUTCDay());
  const end = addDays(last, 6 - last.getUTCDay());
  const weeks = [];

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(cursor);
  }

  const monthCells = weeks.map((week) => {
    let label = "";
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(week, offset);
      if (date.getUTCFullYear() === year && date.getUTCDate() === 1) {
        label = `${date.getUTCMonth() + 1}月`;
        break;
      }
    }
    return `<th scope="col">${label}</th>`;
  }).join("");

  const rows = weekdayLabels.map((weekday, row) => {
    const cells = weeks.map((week) => {
      const date = addDays(week, row);
      if (date.getUTCFullYear() !== year) return '<td class="outside-year"></td>';

      const dateString = isoDate(date);
      const entry = entriesByDate.get(dateString);
      if (!entry && dateString > todayInJst) return '<td class="future-day"></td>';
      if (!entry) {
        return `<td><span class="contribution-day level-0" title="${dateString}: 記録なし" aria-label="${dateString}: 記録なし"></span></td>`;
      }

      const categories = entry.categories.length ? ` / ${entry.categories.join("・")}` : "";
      const label = `${dateString}: ${entry.minutes}分${categories}`;
      return `<td><a class="contribution-day level-${level(entry.minutes, true)}${entry.minutes === 0 ? " recorded-zero" : ""}" href="log/${entry.slug}.html" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></a></td>`;
    }).join("");
    return `<tr><th scope="row">${weekday}</th>${cells}</tr>`;
  }).join("\n");

  return `    <div class="contribution-panel" data-log-year="${year}"${selected ? "" : " hidden"}>
      <div class="contribution-scroll">
        <table class="contribution-table" aria-label="${year}年の活動記録">
          <thead><tr><th></th>${monthCells}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

fs.mkdirSync(sourceDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const filename of fs.readdirSync(outputDir)) {
  if (filename.endsWith(".html")) fs.unlinkSync(path.join(outputDir, filename));
}

const entries = fs.readdirSync(sourceDir)
  .filter((filename) => filename.endsWith(".md"))
  .map(parseEntry)
  .sort((a, b) => b.date.localeCompare(a.date));
const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));

for (const [index, entry] of entries.entries()) {
  const newer = entries[index - 1];
  const older = entries[index + 1];
  const categories = entry.categories.map((category) => `<span>${escapeHtml(category)}</span>`).join("");
  const navigation = `<nav class="daily-navigation" aria-label="日別記録の移動">
        ${older ? `<a href="${older.slug}.html">← ${older.date}</a>` : "<span></span>"}
        ${newer ? `<a href="${newer.slug}.html">${newer.date} →</a>` : "<span></span>"}
      </nav>`;
  const content = `    <article class="blog-post daily-entry">
      <header class="post-header">
        <h1>${escapeHtml(entry.title)}</h1>
        <div class="daily-entry-meta"><time datetime="${entry.date}">${entry.date}</time><span>${entry.minutes}分</span>${categories}</div>
      </header>
      <div class="post-body daily-entry-body">
${entry.editorData ? renderEditorEntry(entry.editorData) : entry.body.trimEnd()}
      </div>
${navigation}
      <a class="back-link" href="../log.html">← 日々の記録</a>
    </article>`;
  fs.writeFileSync(
    path.join(outputDir, `${entry.slug}.html`),
    layout({ title: `${entry.title} | kn_iidx`, content, depth: 1 }),
  );
}

const todayParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date()).map(({ type, value }) => [type, value]));
const todayInJst = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
const jstYear = Number(todayParts.year);
const years = [...new Set([jstYear, ...entries.map((entry) => Number(entry.date.slice(0, 4)))])].sort((a, b) => b - a);
const selectedYear = years[0];
const graphs = years.map((year) => graphForYear(year, entriesByDate, year === selectedYear)).join("\n");
const recentEntries = entries.slice(0, 20);
const recentList = recentEntries.length
  ? `<div class="post-list daily-list">
${recentEntries.map((entry) => `      <article class="post-list-item">
        <time datetime="${entry.date}">${entry.date}</time>
        <h2><a href="log/${entry.slug}.html">${escapeHtml(entry.title)}</a></h2>
        <p>${entry.minutes}分${entry.categories.length ? ` · ${escapeHtml(entry.categories.join(" / "))}` : ""}</p>
      </article>`).join("\n")}
    </div>`
  : '    <p class="empty-state">記録はまだありません。</p>';

const indexContent = `    <div class="page-heading daily-heading">
      <h1 class="page-title">日々の記録</h1>
      <label class="year-selector">年
        <select data-year-selector>
${years.map((year) => `          <option value="${year}"${year === selectedYear ? " selected" : ""}>${year}</option>`).join("\n")}
        </select>
      </label>
    </div>
    <div class="contribution-graph">
${graphs}
      <div class="contribution-legend" aria-label="活動時間の凡例">
        <span>少ない</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>多い</span>
      </div>
    </div>
    <h2 class="daily-recent-title">最近の記録</h2>
${recentList}`;

fs.writeFileSync(
  path.join(root, "log.html"),
  layout({ title: "日々の記録 | kn_iidx", content: indexContent, script: "daily.js" }),
);

console.log(`Built ${entries.length} daily entry/entries.`);
