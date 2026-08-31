const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");
const { renderSidebar } = require("./components");

const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "posts");
const outputDir = path.join(root, "blog");
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parsePost(filename) {
  const source = fs.readFileSync(path.join(postsDir, filename), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`${filename}: YAML front matter is required`);
  }

  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    metadata[key] = value;
  }

  const slug = path.basename(filename, ".md");
  if (!metadata.title || !metadata.date) {
    throw new Error(`${filename}: title and date are required`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
    throw new Error(`${filename}: date must use YYYY-MM-DD`);
  }

  return {
    slug,
    title: metadata.title,
    date: metadata.date,
    description: metadata.description || "",
    body: markdown.render(match[2]),
  };
}

function layout({ title, active, content, depth = 0 }) {
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
${renderSidebar({ active, prefix })}

  <main class="page-content">
${content}
    <footer class="site-footer">
      <span>Last updated: <time data-last-updated></time></span>
      <span>Commit: <a data-commit></a></span>
    </footer>
  </main>
</div>
<script src="${prefix}site-meta.js"></script>
<script src="${prefix}site.js"></script>
</body>
</html>
`;
}

fs.mkdirSync(postsDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const filename of fs.readdirSync(outputDir)) {
  if (filename.endsWith(".html")) {
    fs.unlinkSync(path.join(outputDir, filename));
  }
}

const posts = fs.readdirSync(postsDir)
  .filter((filename) => filename.endsWith(".md"))
  .map(parsePost)
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

for (const post of posts) {
  const content = `    <article class="blog-post">
      <header class="post-header">
        <h1>${escapeHtml(post.title)}</h1>
        <time datetime="${post.date}">${post.date}</time>
      </header>
      <div class="post-body">
${post.body.trimEnd()}
      </div>
      <a class="back-link" href="../blog.html">← 記事一覧</a>
    </article>`;
  fs.writeFileSync(
    path.join(outputDir, `${post.slug}.html`),
    layout({ title: `${post.title} | kn_iidx`, active: "blog", content, depth: 1 }),
  );
}

const list = posts.length
  ? `<div class="post-list">
${posts.map((post) => `      <article class="post-list-item">
        <time datetime="${post.date}">${post.date}</time>
        <h2><a href="blog/${encodeURIComponent(post.slug)}.html">${escapeHtml(post.title)}</a></h2>${post.description ? `
        <p>${escapeHtml(post.description)}</p>` : ""}
      </article>`).join("\n")}
    </div>`
  : `    <p class="empty-state">記事はまだありません。</p>`;

const indexContent = `    <h1 class="page-title">ブログ</h1>
${list}`;
fs.writeFileSync(
  path.join(root, "blog.html"),
  layout({ title: "ブログ | kn_iidx", active: "blog", content: indexContent }),
);

console.log(`Built ${posts.length} post(s).`);
