const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function getCommit() {
  const candidate = process.env.GITHUB_SHA
    || execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

  if (!/^[0-9a-f]{40}$/i.test(candidate)) {
    throw new Error("Could not determine a valid Git commit hash");
  }

  return candidate.toLowerCase();
}

const metadata = { commit: getCommit() };
fs.writeFileSync(
  path.join(root, "site-meta.js"),
  `window.SITE_META = Object.freeze(${JSON.stringify(metadata)});\n`,
);

console.log(`Built site metadata for commit ${metadata.commit.slice(0, 7)}`);
