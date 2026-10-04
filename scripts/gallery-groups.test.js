const test = require("node:test");
const assert = require("node:assert/strict");
const { validateGalleryGroups } = require("./gallery-groups");

const group = (images) => [{ id: "tea-1", title: "絶アレキサンダー", images }];

test("preserves explicit ordering instead of filename order", () => {
  const input = group(["b.png", "a.png"]);
  assert.deepEqual(validateGalleryGroups(input, ["a.png", "b.png"])[0].images, ["b.png", "a.png"]);
});

test("rejects duplicate, missing and unassigned images", () => {
  assert.throws(() => validateGalleryGroups(group(["a.png", "a.png"]), ["a.png"]), /Duplicate gallery image/);
  assert.throws(() => validateGalleryGroups(group(["missing.png"]), ["a.png"]), /Missing gallery image/);
  assert.throws(() => validateGalleryGroups(group(["a.png"]), ["a.png", "b.png"]), /Unassigned gallery images/);
});

test("rejects ambiguous identifiers and empty groups", () => {
  assert.throws(() => validateGalleryGroups([...group(["a.png"]), ...group(["b.png"])], ["a.png", "b.png"]), /duplicate gallery group id/);
  assert.throws(() => validateGalleryGroups(group([]), []), /Invalid gallery group/);
  assert.throws(() => validateGalleryGroups([{id:'bad"id', title:'title', images:['a.png']}], ['a.png']), /Invalid or duplicate/);
});
