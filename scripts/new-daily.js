const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const templateFile = path.join(root, "templates", "daily.md");
const outputDir = path.join(root, "daily");

function todayInJst() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const date = process.argv[2] || todayInJst();
if (!validDate(date)) {
  console.error("Date must be a real date in YYYY-MM-DD format.");
  process.exit(1);
}

const outputFile = path.join(outputDir, `${date}.md`);
if (fs.existsSync(outputFile)) {
  console.error(`${path.relative(root, outputFile)} already exists.`);
  process.exit(1);
}

const template = fs.readFileSync(templateFile, "utf8").replaceAll("{{date}}", date);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, template);
console.log(`Created ${path.relative(root, outputFile)}`);
