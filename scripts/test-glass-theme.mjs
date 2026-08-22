// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const resolvedThemes = resolveThemeDefinitions(definitions);
const glassEntry = definitions.find((theme) => theme.id === "glass");
const glass = resolvedThemes.find((theme) => theme.id === "glass");

assert.ok(glassEntry, "The Glass theme must remain registered");
assert.ok(glass, "The Glass theme must resolve");
assert.equal(glassEntry.definition.theme, "glass");
assert.equal(glassEntry.definition.extends, "modern", "Glass must build on the validated Modern contract");
assert.deepEqual(glass.inheritance, ["basic", "modern", "glass"]);

const componentIds = manifest.components.map((entry) => entry.id).sort();
assert.deepEqual(
  Object.keys(glass.components).sort(),
  componentIds,
  "Glass must retain every registered reference component through inheritance",
);

assert.deepEqual(
  Object.keys(glassEntry.definition.components).sort(),
  ["dialog", "panel"],
  "Glass must stay a focused surface layer rather than forking ordinary controls",
);
assert.deepEqual(
  glassEntry.definition.components.panel,
  { base: { root: { fill: "{semantic.color.surfaceTranslucent}" } } },
  "Glass Panel must use the neutral translucent surface role",
);
assert.deepEqual(
  glassEntry.definition.components.dialog,
  { base: { root: { fill: "{semantic.color.surfaceElevatedTranslucent}" } } },
  "Glass Dialog must use the elevated neutral translucent surface role",
);

assert.equal(glass.components.panel.base.root.radius, "{radius.xl}");
assert.equal(glass.components.dialog.base.root.radius, "{radius.xl}");
assert.equal(glass.components.panel.base.root.shadow, "{elevation.shadow.low}");
assert.equal(glass.components.dialog.base.root.shadow, "{elevation.shadow.medium}");
assert.equal(glass.components.panel.base.root.fill, "{semantic.color.surfaceTranslucent}");
assert.equal(glass.components.dialog.base.root.fill, "{semantic.color.surfaceElevatedTranslucent}");

function collectMatchingPaths(value, predicate, path = "glass") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...collectMatchingPaths(child, predicate, nextPath));
  }
  return findings;
}

assert.deepEqual(
  collectMatchingPaths(
    glassEntry.definition.components,
    (key) => ["blur", "backdropBlur", "glow", "opacity"].includes(key),
  ),
  [],
  "Glass must provide crisp translucency without blur, glow or whole-component opacity",
);

const paletteExpectations = {
  "reference-dark": {
    surface: { alpha: 0.72, components: [0.0902, 0.102, 0.1294] },
    elevated: { alpha: 0.82, components: [0.1255, 0.1412, 0.1765] },
  },
  "reference-light": {
    surface: { alpha: 0.72, components: [1, 1, 1] },
    elevated: { alpha: 0.82, components: [0.9569, 0.9686, 0.9843] },
  },
};

for (const entry of manifest.palettes) {
  const paletteSource = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const expected = paletteExpectations[entry.id];
  assert.ok(expected, `Glass foundation must explicitly cover palette ${entry.id}`);

  const surface = paletteSource.semantic?.color?.surfaceTranslucent?.$value;
  const elevated = paletteSource.semantic?.color?.surfaceElevatedTranslucent?.$value;
  assert.equal(surface?.colorSpace, "srgb");
  assert.equal(elevated?.colorSpace, "srgb");
  assert.equal(surface?.alpha, expected.surface.alpha);
  assert.equal(elevated?.alpha, expected.elevated.alpha);
  assert.deepEqual(surface?.components, expected.surface.components);
  assert.deepEqual(elevated?.components, expected.elevated.components);
}

console.log(
  "Glass inherits Modern and defines palette-neutral crisp translucent Panel/Dialog surfaces without backdrop blur.",
);
