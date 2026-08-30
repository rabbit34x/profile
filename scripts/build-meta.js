const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const rootPages = ["index.html", "games.html", "gallery.html", "blog.html", "accounts.html"];

function getCommit() {
  const candidate = process.env.GITHUB_SHA
    || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

  if (!/^[0-9a-f]{40}$/i.test(candidate)) {
    throw new Error("Could not determine a valid Git commit hash");
  }

  return candidate.toLowerCase();
}

const metadata = { commit: getCommit() };
const version = metadata.commit.slice(0, 7);
fs.writeFileSync(
  path.join(root, "site-meta.js"),
  `window.SITE_META = Object.freeze(${JSON.stringify(metadata)});\n`,
);

const htmlFiles = rootPages.map((filename) => path.join(root, filename));
const blogDirectory = path.join(root, "blog");
if (fs.existsSync(blogDirectory)) {
  htmlFiles.push(...fs.readdirSync(blogDirectory)
    .filter((filename) => filename.endsWith(".html"))
    .map((filename) => path.join(blogDirectory, filename)));
}

const assetPattern = /((?:href|src)=")((?:\.\.\/)?(?:style\.css|site-meta\.js|site\.js|chart\.js|favicon\.ico|images\/[^"?]+))(?:\?v=[^"]*)?(")/g;
const pagePattern = /(href=")((?!https?:\/\/|mailto:|#)[^"?]+\.html)(?:\?v=[^"]*)?(")/g;
for (const htmlFile of htmlFiles) {
  if (!fs.existsSync(htmlFile)) continue;
  const html = fs.readFileSync(htmlFile, "utf8");
  fs.writeFileSync(
    htmlFile,
    html
      .replace(assetPattern, `$1$2?v=${version}$3`)
      .replace(pagePattern, `$1$2?v=${version}$3`),
  );
}

console.log(`Built site metadata and asset version ${version}`);
