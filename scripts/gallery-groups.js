const path = require("node:path");

function validateGalleryGroups(groups, filenames) {
  if (!Array.isArray(groups) || !groups.length) throw new Error("Gallery groups must be a nonempty array");
  const available = new Set(filenames);
  const ids = new Set();
  const assigned = new Set();
  for (const group of groups) {
    if (!group || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.id) || ids.has(group.id)) {
      throw new Error("Invalid or duplicate gallery group id");
    }
    ids.add(group.id);
    if (typeof group.title !== "string" || !group.title.trim() || !Array.isArray(group.images) || !group.images.length) {
      throw new Error(`Invalid gallery group: ${group.id}`);
    }
    for (const filename of group.images) {
      if (typeof filename !== "string" || path.basename(filename) !== filename || !available.has(filename)) {
        throw new Error(`Missing gallery image in ${group.id}: ${filename}`);
      }
      if (assigned.has(filename)) throw new Error(`Duplicate gallery image: ${filename}`);
      assigned.add(filename);
    }
  }
  const unassigned = filenames.filter((filename) => !assigned.has(filename));
  if (unassigned.length) throw new Error(`Unassigned gallery images: ${unassigned.join(", ")}`);
  return groups;
}

module.exports = { validateGalleryGroups };
