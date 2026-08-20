// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { groupPaletteFamilies, validatePaletteRegistry } from "../packages/compiler/src/palette-model.mjs";

const arbitraryVariants = [
  { id: "reference-calm", familyId: "reference", variantId: "calm" },
  { id: "reference-high-contrast", familyId: "reference", variantId: "high-contrast" },
  { id: "night-oled", familyId: "night", variantId: "oled" },
];

assert.doesNotThrow(() => validatePaletteRegistry(arbitraryVariants));
const families = groupPaletteFamilies(arbitraryVariants);
assert.deepEqual(families.get("reference")?.map((entry) => entry.variantId), ["calm", "high-contrast"]);
assert.deepEqual(families.get("night")?.map((entry) => entry.variantId), ["oled"]);

assert.throws(
  () => validatePaletteRegistry([
    { id: "one", familyId: "reference", variantId: "calm" },
    { id: "two", familyId: "reference", variantId: "calm" },
  ]),
  /Duplicate palette variant reference\/calm/,
);
assert.throws(
  () => validatePaletteRegistry([
    { id: "same", familyId: "reference", variantId: "calm" },
    { id: "same", familyId: "reference", variantId: "contrast" },
  ]),
  /Duplicate palette id same/,
);

console.log("Palette family/variant model accepts arbitrary variant identities and rejects duplicate registry keys.");
