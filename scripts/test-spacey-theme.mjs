// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
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
const spaceyEntry = definitions.find((theme) => theme.id === "spacey");
const basic = resolvedThemes.find((theme) => theme.id === "basic");
const spacey = resolvedThemes.find((theme) => theme.id === "spacey");

assert.ok(spaceyEntry, "The Spacey theme must remain registered");
assert.ok(basic, "The Basic theme must resolve before validating Spacey inheritance");
assert.ok(spacey, "The Spacey theme must resolve");
assert.equal(spaceyEntry.definition.theme, "spacey");
assert.equal(spaceyEntry.definition.extends, "basic", "Spacey must build directly on the low-cost Basic contract");
assert.deepEqual(spacey.inheritance, ["basic", "spacey"]);

const visualComponentIds = Object.keys(basic.components).sort();
assert.deepEqual(
  Object.keys(spacey.components).sort(),
  visualComponentIds,
  "Spacey must retain every Basic visual component through inheritance",
);

const directComponentIds = [
  "button",
  "checkbox",
  "data-grid",
  "dialog",
  "input",
  "menu",
  "navigation",
  "panel",
  "progress",
  "radio",
  "select",
  "slider",
  "switch",
  "table",
  "tabs",
  "toast",
  "tooltip",
  "tree",
].sort();
assert.deepEqual(
  Object.keys(spaceyEntry.definition.components).sort(),
  directComponentIds,
  "Spacey production styling must cover every visual surface/control family that benefits from instrumentation geometry",
);

for (const componentId of ["form-layout", "scroll-container"]) {
  assert.deepEqual(
    spacey.components[componentId],
    basic.components[componentId],
    `${componentId} must remain an intentional neutral inheritance instead of gaining decorative framing`,
  );
}

function leafPaths(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) => leafPaths(child, [...path, String(index)]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, [...path, key]));
  }
  return [path.join(".")];
}

const basicLeafPaths = new Set(leafPaths(basic.components));
const directLeafPaths = leafPaths(spaceyEntry.definition.components);
assert.deepEqual(
  directLeafPaths.filter((path) => !basicLeafPaths.has(path)),
  [],
  "Spacey maturity overrides must replace existing Basic visual leaves instead of growing the resolved recipe graph",
);

for (const componentId of directComponentIds) {
  const direct = spaceyEntry.definition.components[componentId];
  const before = basic.components[componentId];
  const after = spacey.components[componentId];
  assert.notDeepEqual(after, before, `Spacey ${componentId} must produce at least one real visual delta`);
  assert.ok(Object.keys(direct).length > 0, `Spacey ${componentId} direct override must not be empty`);
}

function at(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

const expectedPillPaths = [
  "button.base.root.radius",
  "input.base.root.radius",
  "select.base.root.radius",
  "switch.base.root.radius",
  "switch.base.thumb.radius",
];
for (const path of expectedPillPaths) {
  assert.equal(at(spacey, `components.${path}`), "{radius.pill}", `${path} must use Spacey's pill control geometry`);
}

const expectedTechnicalRadiusPaths = [
  "data-grid.base.root.radius",
  "dialog.base.root.radius",
  "navigation.base.list.radius",
  "navigation.base.item.radius",
  "panel.base.root.radius",
  "table.base.root.radius",
  "tree.base.root.radius",
  "tree.base.item.radius",
];
for (const path of expectedTechnicalRadiusPaths) {
  assert.equal(at(spacey, `components.${path}`), "{radius.sm}", `${path} must use the compact technical surface radius`);
}

const expectedStrongBorderPaths = [
  "checkbox.base.root.border.color",
  "data-grid.base.root.border.color",
  "dialog.base.root.border.color",
  "input.base.root.border.color",
  "menu.base.popup.border.color",
  "navigation.base.list.border.color",
  "panel.base.root.border.color",
  "progress.variants.circular.base.track.border.color",
  "radio.base.root.border.color",
  "select.base.root.border.color",
  "slider.base.track.border.color",
  "slider.base.thumb.border.color",
  "switch.base.root.border.color",
  "switch.states.checked.root.border.color",
  "table.base.root.border.color",
  "tabs.base.tabList.border.color",
  "tooltip.base.popup.border.color",
  "tree.base.root.border.color",
];
for (const path of expectedStrongBorderPaths) {
  assert.equal(
    at(spacey, `components.${path}`),
    "{semantic.color.borderStrong}",
    `${path} must use the Spacey instrumentation outline`,
  );
}
assert.equal(spacey.components.menu.base.separator.fill, "{semantic.color.borderStrong}");

for (const path of [
  "checkbox.base.root.fill",
  "input.base.root.fill",
  "panel.base.root.fill",
  "radio.base.root.fill",
  "select.base.root.fill",
  "slider.base.track.fill",
  "slider.base.thumb.fill",
  "table.base.root.fill",
]) {
  assert.equal(at(spacey, `components.${path}`), "{semantic.color.surface}", `${path} must use the flat instrument surface`);
}
assert.equal(spacey.components.table.base.header.fill, "{semantic.color.surfaceElevated}");
assert.equal(spacey.components.toast.base.root.fill, "{semantic.color.background}");
assert.equal(spacey.components.tooltip.base.popup.fill, "{semantic.color.background}");

for (const path of [
  "data-grid.base.root.fill",
  "menu.base.popup.fill",
  "navigation.base.list.fill",
  "tree.base.root.fill",
]) {
  assert.equal(
    at(spacey, `components.${path}`),
    at(basic, `components.${path}`),
    `${path} must preserve Basic's elevated host surface so inherited hover/selection fills remain visible`,
  );
}

function collectKeys(value, predicate, path = "spacey") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...collectKeys(child, predicate, nextPath));
  }
  return findings;
}

const expensiveEffectKeys = new Set(["shadow", "blur", "backdropBlur", "glow"]);
assert.deepEqual(
  collectKeys(spacey.components, (key) => expensiveEffectKeys.has(key)),
  [],
  "Spacey must remain a flat native instrumentation theme without expensive effects",
);

const hardCodedColors = collectKeys(
  spaceyEntry.definition.components,
  (_key, value) => typeof value === "string" && /^(?:#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(value),
);
assert.deepEqual(hardCodedColors, [], "Spacey must use semantic palette roles instead of hard-coded colors");

for (const componentId of visualComponentIds) {
  const entry = manifest.components.find((candidate) => candidate.id === componentId);
  assert.ok(entry, `Spacey visual component ${componentId} must remain backed by a registered component contract`);
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = spacey.components[componentId];

  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Spacey ${componentId} must retain declared ${size} sizing`);
  }

  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Spacey ${componentId} must retain styling for declared state ${state}`,
    );
  }
}

const irPath = "build/spec-ir-spacey-theme-test.json";
function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  const ir = JSON.parse(await readFile(irPath, "utf8"));
  const compiled = {};
  for (const paletteId of ["reference-dark", "reference-light"]) {
    const palette = ir.palettes.find((entry) => entry.id === paletteId);
    assert.ok(palette, `Compiled IR must contain ${paletteId}`);
    const components = palette.themes?.spacey?.components;
    assert.ok(components?.panel, `${paletteId} must compile the Spacey theme`);
    assert.equal(components.button.base.root.radius.reference, "{radius.pill}");
    assert.equal(components.panel.base.root.radius.reference, "{radius.sm}");
    assert.equal(components.navigation.base.list.radius.reference, "{radius.sm}");
    assert.equal(components.select.base.root.radius.reference, "{radius.pill}");
    assert.equal(components.panel.base.root.border.color.reference, "{semantic.color.borderStrong}");
    assert.equal(components.tooltip.base.popup.fill.reference, "{semantic.color.background}");
    assert.equal(components.panel.base.root.shadow, undefined, "Spacey Panel must remain flat");
    compiled[paletteId] = components;
  }

  assert.deepEqual(
    compiled["reference-dark"].panel.base.root.radius.value,
    compiled["reference-light"].panel.base.root.radius.value,
    "Spacey geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    compiled["reference-dark"].panel.base.root.border.color.value,
    compiled["reference-light"].panel.base.root.border.color.value,
    "Spacey semantic instrumentation outlines must follow the active palette",
  );
  assert.notDeepEqual(
    compiled["reference-dark"].tooltip.base.popup.fill.value,
    compiled["reference-light"].tooltip.base.popup.fill.value,
    "Spacey HUD-like overlay surfaces must follow the active palette",
  );
} finally {
  await rm(irPath, { force: true });
}

console.log(
  "Spacey production visual language covers 18 component families through zero-growth Basic overrides while preserving neutral layout primitives, state contrast, semantic palettes and a zero-expensive-effect contract.",
);
