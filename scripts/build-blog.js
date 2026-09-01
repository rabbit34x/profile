const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");
const { renderSidebar } = require("./components");

const root = path.resolve(__dirname, "..");
const postsDir = path.join(root, "posts");
const outputDir = path.join(root, "blog");
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

function youtubeVideoId(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/")[1] || "";
    } else if (["youtube.com", "m.youtube.com"].includes(hostname)) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else {
        const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/);
        videoId = match?.[1] || "";
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

function twitterPostUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);

    if (!["x.com", "twitter.com"].includes(hostname) || !match) return null;
    return `https://twitter.com/${match[1]}/status/${match[2]}`;
  } catch {
    return null;
  }
}

markdown.block.ruler.before("paragraph", "media_embed", (state, startLine, endLine, silent) => {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const finish = state.eMarks[startLine];
  const line = state.src.slice(start, finish).trim();
  const match = line.match(/^@\[(youtube|twitter)\]\((\S+)\)$/);

  if (!match) return false;
  if (silent) return true;

  const [, service, value] = match;
  const embedValue = service === "youtube" ? youtubeVideoId(value) : twitterPostUrl(value);
  if (!embedValue) return false;

  const token = state.push("media_embed", "", 0);
  token.block = true;
  token.meta = { service, value: embedValue };
  state.line = startLine + 1;
  return true;
}, { alt: ["paragraph"] });

markdown.renderer.rules.media_embed = (tokens, index) => {
  const { service, value } = tokens[index].meta;

  if (service === "youtube") {
    return `<div class="media-embed media-embed-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${value}" title="YouTube動画プレーヤー" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>\n`;
  }

  return `<div class="media-embed media-embed-twitter"><blockquote class="twitter-tweet"><a href="${value}">${value}</a></blockquote></div>\n`;
};

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

function layout({ title, active, content, depth = 0, hasTwitterEmbed = false }) {
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
${hasTwitterEmbed ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>\n' : ""}</body>
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
    layout({
      title: `${post.title} | kn_iidx`,
      active: "blog",
      content,
      depth: 1,
      hasTwitterEmbed: post.body.includes('class="twitter-tweet"'),
    }),
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
