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
const cyberpunkEntry = definitions.find((theme) => theme.id === "cyberpunk");
const basic = resolvedThemes.find((theme) => theme.id === "basic");
const cyberpunk = resolvedThemes.find((theme) => theme.id === "cyberpunk");

assert.ok(cyberpunkEntry, "The Cyberpunk theme must remain registered");
assert.ok(basic, "The Basic theme must resolve before validating Cyberpunk inheritance");
assert.ok(cyberpunk, "The Cyberpunk theme must resolve");
assert.equal(cyberpunkEntry.definition.theme, "cyberpunk");
assert.equal(cyberpunkEntry.definition.extends, "basic", "Cyberpunk must build directly on the portable Basic contract");
assert.deepEqual(cyberpunk.inheritance, ["basic", "cyberpunk"]);

const visualComponentIds = Object.keys(basic.components).sort();
assert.deepEqual(
  Object.keys(cyberpunk.components).sort(),
  visualComponentIds,
  "Cyberpunk must retain every Basic visual component through inheritance",
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
  Object.keys(cyberpunkEntry.definition.components).sort(),
  directComponentIds,
  "Cyberpunk production styling must cover every visible control/surface family that benefits from signal-frame geometry",
);

for (const componentId of ["form-layout", "scroll-container"]) {
  assert.deepEqual(
    cyberpunk.components[componentId],
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
const directLeafPaths = leafPaths(cyberpunkEntry.definition.components);
assert.deepEqual(
  directLeafPaths.filter((path) => !basicLeafPaths.has(path)).sort(),
  ["dialog.base.root.shadow", "panel.base.root.shadow"],
  "Cyberpunk maturity may grow the Basic graph only by the two deliberately budgeted elevation shadows",
);

for (const componentId of directComponentIds) {
  const direct = cyberpunkEntry.definition.components[componentId];
  const before = basic.components[componentId];
  const after = cyberpunk.components[componentId];
  assert.notDeepEqual(after, before, `Cyberpunk ${componentId} must produce at least one real visual delta`);
  assert.ok(Object.keys(direct).length > 0, `Cyberpunk ${componentId} direct override must not be empty`);
}

function at(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

for (const path of [
  "button.base.root.radius",
  "data-grid.base.root.radius",
  "dialog.base.root.radius",
  "input.base.root.radius",
  "navigation.base.list.radius",
  "navigation.base.item.radius",
  "panel.base.root.radius",
  "select.base.root.radius",
  "switch.base.root.radius",
  "switch.base.thumb.radius",
  "table.base.root.radius",
  "tree.base.root.radius",
  "tree.base.item.radius",
]) {
  assert.equal(at(cyberpunk, `components.${path}`), "{radius.sm}", `${path} must use Cyberpunk's sharp technical radius`);
}

for (const path of [
  "checkbox.base.root.border.color",
  "data-grid.base.root.border.color",
  "input.base.root.border.color",
  "menu.base.popup.border.color",
  "navigation.base.list.border.color",
  "panel.base.root.border.color",
  "radio.base.root.border.color",
  "select.base.root.border.color",
  "slider.base.track.border.color",
  "switch.base.root.border.color",
  "table.base.root.border.color",
  "tree.base.root.border.color",
]) {
  assert.equal(at(cyberpunk, `components.${path}`), "{semantic.color.accent}", `${path} must use the primary Cyberpunk signal frame`);
}

for (const path of [
  "dialog.base.root.border.color",
  "input.states.hover.root.border.color",
  "progress.variants.circular.base.track.border.color",
  "select.states.hover.root.border.color",
  "slider.base.thumb.border.color",
  "switch.states.hover.root.border.color",
  "switch.states.pressed.root.border.color",
  "switch.states.checked.root.border.color",
  "tabs.base.tabList.border.color",
  "tooltip.base.popup.border.color",
]) {
  assert.equal(at(cyberpunk, `components.${path}`), "{semantic.color.focus}", `${path} must use the hot Cyberpunk signal frame`);
}
assert.equal(cyberpunk.components.menu.base.separator.fill, "{semantic.color.focus}");

for (const path of [
  "checkbox.base.root.fill",
  "input.base.root.fill",
  "panel.base.root.fill",
  "radio.base.root.fill",
  "select.base.root.fill",
  "slider.base.track.fill",
  "slider.base.thumb.fill",
  "switch.base.root.fill",
  "table.base.root.fill",
]) {
  assert.equal(at(cyberpunk, `components.${path}`), "{semantic.color.surface}", `${path} must use the flat Cyberpunk instrument surface`);
}
assert.equal(cyberpunk.components.dialog.base.root.fill, "{semantic.color.surfaceElevated}");
assert.equal(cyberpunk.components.table.base.header.fill, "{semantic.color.surfaceElevated}");
assert.equal(cyberpunk.components.toast.base.root.fill, "{semantic.color.background}");
assert.equal(cyberpunk.components.tooltip.base.popup.fill, "{semantic.color.background}");

for (const path of [
  "data-grid.base.root.fill",
  "menu.base.popup.fill",
  "navigation.base.list.fill",
  "tree.base.root.fill",
]) {
  assert.equal(
    at(cyberpunk, `components.${path}`),
    at(basic, `components.${path}`),
    `${path} must preserve Basic's elevated host surface so inherited hover/selection states remain legible`,
  );
}

function collectKeys(value, predicate, path = "cyberpunk") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...collectKeys(child, predicate, nextPath));
  }
  return findings;
}

const hardCodedColors = collectKeys(
  cyberpunkEntry.definition.components,
  (_key, value) => typeof value === "string" && /^(?:#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(value),
);
assert.deepEqual(hardCodedColors, [], "Cyberpunk must use semantic palette roles instead of hard-coded neon colors");

const forbiddenEffectKeys = new Set(["blur", "backdropBlur", "glow"]);
assert.deepEqual(
  collectKeys(cyberpunk.components, (key) => forbiddenEffectKeys.has(key)),
  [],
  "Cyberpunk must not introduce blur, backdrop blur or glow effects",
);

const shadowPaths = collectKeys(cyberpunk.components, (key) => key === "shadow");
assert.deepEqual(
  shadowPaths.sort(),
  ["cyberpunk.dialog.base.root.shadow", "cyberpunk.panel.base.root.shadow"],
  "Cyberpunk elevation must stay limited to Panel/Card and Dialog",
);
assert.equal(cyberpunk.components.panel.base.root.shadow, "{elevation.shadow.low}");
assert.equal(cyberpunk.components.dialog.base.root.shadow, "{elevation.shadow.medium}");

for (const componentId of visualComponentIds) {
  const entry = manifest.components.find((candidate) => candidate.id === componentId);
  assert.ok(entry, `Cyberpunk visual component ${componentId} must remain backed by a registered component contract`);
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = cyberpunk.components[componentId];

  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Cyberpunk ${componentId} must retain declared ${size} sizing`);
  }

  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Cyberpunk ${componentId} must retain styling for declared state ${state}`,
    );
  }

  assert.equal(
    Object.keys(visual.fallbacks ?? {}).length,
    0,
    `Cyberpunk ${componentId} must not need capability fallbacks for its native signal-frame language`,
  );
}

const irPath = "build/spec-ir-cyberpunk-theme-test.json";
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
    const components = palette.themes?.cyberpunk?.components;
    assert.ok(components?.panel, `${paletteId} must compile the Cyberpunk theme`);
    assert.equal(components.button.base.root.radius.reference, "{radius.sm}");
    assert.equal(components.input.base.root.border.color.reference, "{semantic.color.accent}");
    assert.equal(components.input.states.hover.root.border.color.reference, "{semantic.color.focus}");
    assert.equal(components.select.states.hover.root.border.color.reference, "{semantic.color.focus}");
    assert.equal(components.panel.base.root.shadow.reference, "{elevation.shadow.low}");
    assert.equal(components.dialog.base.root.shadow.reference, "{elevation.shadow.medium}");
    assert.equal(components.tooltip.base.popup.fill.reference, "{semantic.color.background}");
    assert.equal(components.panel.base.root.backdropBlur, undefined);
    compiled[paletteId] = components;
  }

  assert.deepEqual(
    compiled["reference-dark"].panel.base.root.radius.value,
    compiled["reference-light"].panel.base.root.radius.value,
    "Cyberpunk geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    compiled["reference-dark"].input.base.root.border.color.value,
    compiled["reference-light"].input.base.root.border.color.value,
    "Cyberpunk Accent signal frames must follow the active palette",
  );
  assert.notDeepEqual(
    compiled["reference-dark"].tooltip.base.popup.border.color.value,
    compiled["reference-light"].tooltip.base.popup.border.color.value,
    "Cyberpunk Focus signal frames must follow the active palette",
  );
} finally {
  await rm(irPath, { force: true });
}

console.log(
  "Cyberpunk production visual language covers 18 component families with sharp palette-driven signal frames, two bounded elevation shadows, neutral layout primitives and no blur/glow effects.",
);
