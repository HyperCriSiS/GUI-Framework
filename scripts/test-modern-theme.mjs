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
const modernEntry = definitions.find((theme) => theme.id === "modern");
const basic = resolvedThemes.find((theme) => theme.id === "basic");
const modern = resolvedThemes.find((theme) => theme.id === "modern");

assert.ok(modernEntry, "The Modern theme must remain registered");
assert.ok(basic, "The Basic theme must resolve before validating Modern inheritance");
assert.ok(modern, "The Modern theme must resolve");
assert.equal(modernEntry.definition.theme, "modern");
assert.equal(modernEntry.definition.extends, "basic", "Modern must build on the validated Basic contract");
assert.deepEqual(modern.inheritance, ["basic", "modern"]);

const visualComponentIds = Object.keys(basic.components).sort();
assert.deepEqual(
  Object.keys(modern.components).sort(),
  visualComponentIds,
  "Modern must retain every Basic visual component through inheritance without claiming newly registered contracts before their visuals exist",
);

const expectedDirectGeometry = {
  button: { root: { radius: "{radius.lg}" } },
  checkbox: { root: { radius: "{radius.md}" } },
  "data-grid": { root: { radius: "{radius.xl}" } },
  dialog: { root: { radius: "{radius.xl}", shadow: "{elevation.shadow.medium}" } },
  input: { root: { radius: "{radius.lg}" } },
  menu: { popup: { radius: "{radius.xl}" } },
  navigation: {
    list: { radius: "{radius.xl}" },
    item: { radius: "{radius.lg}" },
  },
  panel: { root: { radius: "{radius.xl}", shadow: "{elevation.shadow.low}" } },
  select: { root: { radius: "{radius.lg}" } },
  switch: {
    root: { radius: "{radius.pill}" },
    thumb: { radius: "{radius.pill}" },
  },
  table: { root: { radius: "{radius.xl}" } },
  toast: { root: { radius: "{radius.xl}" } },
  tooltip: { popup: { radius: "{radius.lg}" } },
  tree: {
    root: { radius: "{radius.xl}" },
    item: { radius: "{radius.lg}" },
  },
};

const intentionallyInheritedGeometry = [
  "form-layout",
  "progress",
  "radio",
  "scroll-container",
  "slider",
  "tabs",
];

assert.deepEqual(
  Object.keys(modernEntry.definition.components).sort(),
  Object.keys(expectedDirectGeometry).sort(),
  "Modern must directly style every surface-bearing component family whose geometry can be refined by replacing existing visual properties in its production geometry layer",
);
assert.deepEqual(
  [...Object.keys(expectedDirectGeometry), ...intentionallyInheritedGeometry].sort(),
  visualComponentIds,
  "Every Modern component family must be either intentionally restyled or explicitly inherited when Basic already matches the Modern geometry contract",
);

for (const [componentId, parts] of Object.entries(expectedDirectGeometry)) {
  const directBase = modernEntry.definition.components[componentId]?.base;
  assert.ok(directBase, `Modern ${componentId} must define its direct production geometry override`);

  for (const [partId, expectedStyle] of Object.entries(parts)) {
    assert.deepEqual(
      directBase[partId],
      expectedStyle,
      `Modern ${componentId}.${partId} geometry must remain deterministic`,
    );
    for (const [property, expectedToken] of Object.entries(expectedStyle)) {
      assert.equal(
        modern.components[componentId].base[partId][property],
        expectedToken,
        `Modern ${componentId}.${partId}.${property} must survive theme resolution`,
      );
    }
  }
}

const unsupportedEffectKeys = new Set(["blur", "backdropBlur", "glow"]);
function collectKeys(value, predicate, path = "modern") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...collectKeys(child, predicate, nextPath));
  }
  return findings;
}

assert.deepEqual(
  collectKeys(modernEntry.definition.components, (key) => unsupportedEffectKeys.has(key)),
  [],
  "Modern must not introduce effects that the reference adapters cannot map yet",
);
assert.deepEqual(
  collectKeys(
    modernEntry.definition.components,
    (_key, value) => typeof value === "string" && value.startsWith("{semantic.color."),
  ),
  [],
  "Modern geometry must remain independent from palette selection",
);

for (const componentId of visualComponentIds) {
  const entry = manifest.components.find((candidate) => candidate.id === componentId);
  assert.ok(entry, `Modern visual component ${componentId} must remain backed by a registered component contract`);
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = modern.components[componentId];

  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Modern ${componentId} must inherit declared ${size} sizing`);
  }

  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Modern ${componentId} must retain styling for declared state ${state}`,
    );
  }
}

const irPath = "build/spec-ir-modern-theme-test.json";
function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  const ir = JSON.parse(await readFile(irPath, "utf8"));
  for (const paletteId of ["reference-dark", "reference-light"]) {
    const palette = ir.palettes.find((entry) => entry.id === paletteId);
    assert.ok(palette, `Compiled IR must contain ${paletteId}`);
    assert.ok(palette.themes?.basic?.components?.panel, `${paletteId} must compile the Basic theme`);
    assert.ok(palette.themes?.modern?.components?.panel, `${paletteId} must compile the Modern theme`);
    assert.equal(
      palette.themes.modern.components.panel.base.root.shadow.reference,
      "{elevation.shadow.low}",
      `${paletteId} must reuse Modern elevation without a palette-specific theme fork`,
    );
  }
} finally {
  await rm(irPath, { force: true });
}

console.log(
  "Modern theme inherits the complete Basic contract and intentionally restyles surface-bearing component families with zero-growth, palette-neutral geometry overrides while preserving deterministic low-cost elevation and explicit inheritance for primitives that already match the Modern shape language.",
);
