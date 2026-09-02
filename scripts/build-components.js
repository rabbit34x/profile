const fs = require("node:fs");
const path = require("node:path");
const { renderSidebar } = require("./components");

const root = path.resolve(__dirname, "..");
const pages = {
  "index.html": "top",
  "games.html": "games",
  "log.html": "log",
  "gallery.html": "gallery",
  "blog.html": "blog",
  "accounts.html": "accounts",
};
const sidebarPattern = /<!-- component:sidebar -->[\s\S]*?<!-- \/component:sidebar -->/;

for (const [filename, active] of Object.entries(pages)) {
  const file = path.join(root, filename);
  const html = fs.readFileSync(file, "utf8");

  if (!sidebarPattern.test(html)) {
    throw new Error(`Sidebar component marker not found in ${filename}`);
  }

  fs.writeFileSync(file, html.replace(sidebarPattern, renderSidebar({ active })));
}

console.log(`Built shared components for ${Object.keys(pages).length} pages`);
