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
const modern = resolvedThemes.find((theme) => theme.id === "modern");
const glass = resolvedThemes.find((theme) => theme.id === "glass");
const frostedEntry = definitions.find((theme) => theme.id === "frosted-glass");
const frosted = resolvedThemes.find((theme) => theme.id === "frosted-glass");

assert.ok(glassEntry, "The Glass theme must remain registered");
assert.ok(modern, "The Modern theme must resolve before validating Glass inheritance");
assert.ok(glass, "The Glass theme must resolve");
assert.equal(glassEntry.definition.theme, "glass");
assert.equal(glassEntry.definition.extends, "modern", "Glass must build on the validated Modern contract");
assert.deepEqual(glass.inheritance, ["basic", "modern", "glass"]);

assert.ok(frostedEntry, "The Frosted Glass theme must remain registered");
assert.ok(frosted, "The Frosted Glass theme must resolve");
assert.equal(frostedEntry.definition.extends, "glass", "Frosted Glass must build on the validated Glass contract");
assert.deepEqual(frosted.inheritance, ["basic", "modern", "glass", "frosted-glass"]);
for (const componentId of ["button", "input", "switch"]) {
  assert.deepEqual(
    frosted.components[componentId],
    glass.components[componentId],
    `${componentId} must remain identical between Glass and Frosted Glass`,
  );
}
for (const componentId of ["panel", "dialog"]) {
  assert.deepEqual(
    frosted.components[componentId].base,
    glass.components[componentId].base,
    `${componentId} must preserve the validated crisp Glass base before optional frosting`,
  );
}

const visualComponentIds = Object.keys(modern.components).sort();
assert.deepEqual(
  Object.keys(glass.components).sort(),
  visualComponentIds,
  "Glass must retain every Modern visual component through inheritance without claiming newly registered contracts before their visuals exist",
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

for (const componentId of ["panel", "dialog"]) {
  const componentEntry = manifest.components.find((entry) => entry.id === componentId);
  const component = JSON.parse(await readFile(join("spec", componentEntry.source), "utf8"));
  assert.ok(
    component.capabilities.optional.includes("backdropBlur"),
    `${componentId} must declare backdropBlur as optional before Frosted Glass adds it`,
  );
  assert.equal(
    component.capabilities.fallbackOrder[0],
    "high",
    `${componentId} must prefer the generic high-capability tier for the future Frosted Glass path before standard/minimal fallbacks`,
  );
}

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
  "Glass remains crisp and blur-free while Frosted Glass layers optional backdrop blur over the same validated base.",
);
