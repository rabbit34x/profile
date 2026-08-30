const fs = require("node:fs");
const path = require("node:path");
const decodeHeic = require("heic-decode");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const galleryFile = path.join(root, "gallery.html");
const sourceRoot = path.join(root, "gallery-src");
const outputRoot = path.join(root, "images", "gallery");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const homeImage = {
  source: path.join(root, "image-src", "profile-doll.jpg"),
  output: path.join(root, "images", "profile-doll.webp"),
};
const categories = [
  { key: "games", source: "games", output: "games" },
  { key: "dolls", source: "dolls", output: "dolls" },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function captionFromFilename(filename) {
  return path.basename(filename, path.extname(filename)).replace(/[-_]+/g, " ").trim();
}

function clearDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    fs.rmSync(path.join(directory, entry.name), { recursive: true, force: true });
  }
}

async function getSharpInput(source) {
  if (path.extname(source).toLowerCase() !== ".heic") {
    return { input: source };
  }

  const decoded = await decodeHeic({ buffer: fs.readFileSync(source) });
  return {
    input: Buffer.from(decoded.data),
    options: { raw: { width: decoded.width, height: decoded.height, channels: 4 } },
  };
}

async function buildCategory(category) {
  const sourceDirectory = path.join(sourceRoot, category.source);
  const fullDirectory = path.join(outputRoot, category.output, "full");
  const thumbnailDirectory = path.join(outputRoot, category.output, "thumbs");
  fs.mkdirSync(sourceDirectory, { recursive: true });
  clearDirectory(fullDirectory);
  clearDirectory(thumbnailDirectory);

  const filenames = fs.readdirSync(sourceDirectory)
    .filter((filename) => supportedExtensions.has(path.extname(filename).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "ja"));
  const outputNames = new Set();
  const figures = [];

  for (const filename of filenames) {
    const basename = path.basename(filename, path.extname(filename));
    const outputName = `${basename}.webp`;
    const outputKey = outputName.toLowerCase();
    if (outputNames.has(outputKey)) {
      throw new Error(`${category.source}: duplicate output filename ${outputName}`);
    }
    outputNames.add(outputKey);

    const source = path.join(sourceDirectory, filename);
    const sharpInput = await getSharpInput(source);
    const full = await sharp(sharpInput.input, sharpInput.options)
      .autoOrient()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(path.join(fullDirectory, outputName));
    const thumbnail = await sharp(sharpInput.input, sharpInput.options)
      .autoOrient()
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toFile(path.join(thumbnailDirectory, outputName));

    const caption = captionFromFilename(filename);
    const encodedName = encodeURIComponent(outputName);
    figures.push(`      <figure>
        <a href="images/gallery/${category.output}/full/${encodedName}"><img src="images/gallery/${category.output}/thumbs/${encodedName}" alt="${escapeHtml(caption)}" width="${thumbnail.width}" height="${thumbnail.height}" loading="lazy"></a>
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>`);

    console.log(`Optimized ${category.source}/${filename} (${full.width}x${full.height})`);
  }

  return figures.length
    ? figures.join("\n")
    : "      <p class=\"empty-state\">画像はまだありません。</p>";
}

async function main() {
  fs.mkdirSync(path.dirname(homeImage.output), { recursive: true });
  const home = await sharp(homeImage.source)
    .autoOrient()
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(homeImage.output);
  console.log(`Optimized home image (${home.width}x${home.height})`);

  let gallery = fs.readFileSync(galleryFile, "utf8");

  for (const category of categories) {
    const content = await buildCategory(category);
    const pattern = new RegExp(`(<!-- gallery:${category.key}:start -->)[\\s\\S]*?(<!-- gallery:${category.key}:end -->)`);
    if (!pattern.test(gallery)) {
      throw new Error(`Missing gallery markers for ${category.key}`);
    }
    gallery = gallery.replace(pattern, `$1\n${content}\n      $2`);
  }

  fs.writeFileSync(galleryFile, gallery);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
