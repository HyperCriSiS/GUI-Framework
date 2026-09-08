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

const expectedDirectComponents = [
  "data-grid",
  "dialog",
  "menu",
  "navigation",
  "panel",
  "progress",
  "slider",
  "table",
  "toast",
  "tooltip",
  "tree",
].sort();
assert.deepEqual(
  Object.keys(glassEntry.definition.components).sort(),
  expectedDirectComponents,
  "Glass must intentionally restyle structural surfaces, overlays, data surfaces and passive tracks while keeping primary interaction surfaces opaque and backdrop-independent",
);

const expectedTranslucentFills = new Map([
  ["data-grid.base.root.fill", "{semantic.color.surfaceTranslucent}"],
  ["dialog.base.root.fill", "{semantic.color.surfaceElevatedTranslucent}"],
  ["menu.base.popup.fill", "{semantic.color.surfaceElevatedTranslucent}"],
  ["navigation.base.list.fill", "{semantic.color.surfaceTranslucent}"],
  ["panel.base.root.fill", "{semantic.color.surfaceTranslucent}"],
  ["progress.variants.linear.base.track.fill", "{semantic.color.surfaceTranslucent}"],
  ["slider.base.track.fill", "{semantic.color.surfaceTranslucent}"],
  ["table.base.root.fill", "{semantic.color.surfaceTranslucent}"],
  ["toast.base.root.fill", "{semantic.color.surfaceElevatedTranslucent}"],
  ["tooltip.base.popup.fill", "{semantic.color.surfaceElevatedTranslucent}"],
  ["tree.base.root.fill", "{semantic.color.surfaceTranslucent}"],
]);

function collectLeaves(value, path = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [[path.join("."), value]];
  }
  return Object.entries(value).flatMap(([key, child]) => collectLeaves(child, [...path, key]));
}

function getAtPath(root, path) {
  return path.split(".").reduce((value, key) => value?.[key], root);
}

const directLeaves = collectLeaves(glassEntry.definition.components)
  .map(([path, value]) => [path, value])
  .sort(([left], [right]) => left.localeCompare(right));
assert.deepEqual(
  directLeaves,
  [...expectedTranslucentFills.entries()].sort(([left], [right]) => left.localeCompare(right)),
  "Glass direct overrides must remain fill-only and limited to the intentional translucency map",
);

for (const [path, glassValue] of expectedTranslucentFills) {
  const modernValue = getAtPath(modern.components, path);
  const resolvedGlassValue = getAtPath(glass.components, path);
  assert.notEqual(modernValue, undefined, `Modern must already expose ${path} so Glass replaces an existing recipe leaf rather than adding complexity`);
  assert.notEqual(glassValue, modernValue, `${path} must remain a real Glass visual delta rather than a no-op override`);
  assert.equal(resolvedGlassValue, glassValue, `${path} must resolve to the intended Glass translucency role`);
}

const visualComponentIds = Object.keys(modern.components).sort();
assert.deepEqual(
  Object.keys(glass.components).sort(),
  visualComponentIds,
  "Glass must retain every Modern visual component through inheritance",
);

assert.equal(glass.components.panel.base.root.radius, "{radius.xl}");
assert.equal(glass.components.dialog.base.root.radius, "{radius.xl}");
assert.equal(glass.components.panel.base.root.shadow, "{elevation.shadow.low}");
assert.equal(glass.components.dialog.base.root.shadow, "{elevation.shadow.medium}");

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

const resolvedTranslucentPaths = collectMatchingPaths(
  glass.components,
  (key, child) =>
    key === "fill" &&
    typeof child === "string" &&
    [
      "{semantic.color.surfaceTranslucent}",
      "{semantic.color.surfaceElevatedTranslucent}",
    ].includes(child),
).sort();
assert.deepEqual(
  resolvedTranslucentPaths,
  [...expectedTranslucentFills.keys()].map((path) => `glass.${path}`).sort(),
  "Resolved Glass translucency must cover the complete intentional surface map and no unrelated fill",
);

for (const componentId of ["panel", "dialog"]) {
  assert.deepEqual(
    frosted.components[componentId].base,
    glass.components[componentId].base,
    `${componentId} must preserve the validated crisp Glass base before optional frosting`,
  );

  const componentEntry = manifest.components.find((entry) => entry.id === componentId);
  const component = JSON.parse(await readFile(join("spec", componentEntry.source), "utf8"));
  assert.ok(
    component.capabilities.optional.includes("backdropBlur"),
    `${componentId} must declare backdropBlur as optional before Frosted Glass adds it`,
  );
  assert.equal(
    component.capabilities.fallbackOrder[0],
    "high",
    `${componentId} must prefer the generic high-capability tier for Frosted Glass before standard/minimal fallbacks`,
  );
}

for (const componentId of visualComponentIds.filter((componentId) => !["panel", "dialog"].includes(componentId))) {
  assert.deepEqual(
    frosted.components[componentId],
    glass.components[componentId],
    `${componentId} must flow unchanged from Glass into Frosted Glass`,
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
  assert.ok(expected, `Glass must explicitly cover palette ${entry.id}`);

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
  "Glass now applies crisp, blur-free translucency across structural surfaces, overlays, data surfaces and passive tracks while preserving opaque backdrop-independent interaction controls and Modern geometry.",
);
