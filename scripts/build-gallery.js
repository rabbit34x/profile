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
  { key: "imas", source: "imas", output: "imas" },
  { key: "photos", source: "photos", output: "photos" },
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

function parseExifDate(exif) {
  if (!exif) return null;

  const tiffOffset = exif.subarray(0, 6).toString("ascii") === "Exif\0\0" ? 6 : 0;
  const byteOrder = exif.subarray(tiffOffset, tiffOffset + 2).toString("ascii");
  if (byteOrder !== "II" && byteOrder !== "MM") return null;
  const littleEndian = byteOrder === "II";
  const uint16 = (offset) => littleEndian ? exif.readUInt16LE(offset) : exif.readUInt16BE(offset);
  const uint32 = (offset) => littleEndian ? exif.readUInt32LE(offset) : exif.readUInt32BE(offset);
  const firstIfd = tiffOffset + uint32(tiffOffset + 4);

  function readIfd(offset) {
    const values = new Map();
    if (offset < tiffOffset || offset + 2 > exif.length) return values;
    const count = uint16(offset);
    for (let index = 0; index < count; index += 1) {
      const entry = offset + 2 + index * 12;
      if (entry + 12 > exif.length) break;
      const tag = uint16(entry);
      const type = uint16(entry + 2);
      const length = uint32(entry + 4);
      const bytesPerValue = type === 3 ? 2 : type === 4 ? 4 : 1;
      const byteLength = length * bytesPerValue;
      const valueOffset = byteLength <= 4 ? entry + 8 : tiffOffset + uint32(entry + 8);
      if (valueOffset >= 0 && valueOffset + byteLength <= exif.length) {
        values.set(tag, { type, length, valueOffset });
      }
    }
    return values;
  }

  function asciiValue(entry) {
    if (!entry || entry.type !== 2) return null;
    return exif.subarray(entry.valueOffset, entry.valueOffset + entry.length)
      .toString("ascii").replace(/\0.*$/, "").trim();
  }

  const ifd0 = readIfd(firstIfd);
  const exifPointer = ifd0.get(0x8769);
  const exifIfd = exifPointer ? readIfd(tiffOffset + uint32(exifPointer.valueOffset)) : new Map();
  const value = asciiValue(exifIfd.get(0x9003))
    || asciiValue(exifIfd.get(0x9004))
    || asciiValue(ifd0.get(0x0132));
  const match = value?.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return match ? Date.UTC(...match.slice(1).map(Number).map((part, index) => index === 1 ? part - 1 : part)) : null;
}

function parseFilenameDate(filename) {
  const match = filename.match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)(?:[ T_-]?([0-2]\d)[.:_-]?([0-5]\d)[.:_-]?([0-5]\d))?/);
  if (!match) return null;
  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

async function getTakenAt(source, filename) {
  try {
    const metadata = await sharp(source).metadata();
    return parseExifDate(metadata.exif) ?? parseFilenameDate(filename);
  } catch (error) {
    console.warn(`Could not read metadata from ${filename}: ${error.message}`);
    return parseFilenameDate(filename);
  }
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

  const files = await Promise.all(fs.readdirSync(sourceDirectory)
    .filter((filename) => supportedExtensions.has(path.extname(filename).toLowerCase()))
    .map(async (filename) => ({
      filename,
      takenAt: await getTakenAt(path.join(sourceDirectory, filename), filename),
    })));
  files.sort((a, b) => {
    if (a.takenAt !== null && b.takenAt !== null && a.takenAt !== b.takenAt) return b.takenAt - a.takenAt;
    if (a.takenAt !== null && b.takenAt === null) return -1;
    if (a.takenAt === null && b.takenAt !== null) return 1;
    return a.filename.localeCompare(b.filename, "ja");
  });
  const outputNames = new Set();
  const figures = [];

  for (const { filename } of files) {
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
