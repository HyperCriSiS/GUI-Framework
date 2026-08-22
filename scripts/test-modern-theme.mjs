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
const modern = resolvedThemes.find((theme) => theme.id === "modern");

assert.ok(modernEntry, "The Modern theme must remain registered");
assert.ok(modern, "The Modern theme must resolve");
assert.equal(modernEntry.definition.theme, "modern");
assert.equal(modernEntry.definition.extends, "basic", "Modern must build on the validated Basic contract");
assert.deepEqual(modern.inheritance, ["basic", "modern"]);

const componentIds = manifest.components.map((entry) => entry.id).sort();
assert.deepEqual(
  Object.keys(modern.components).sort(),
  componentIds,
  "Modern must retain every registered reference component through inheritance",
);

const expectedFoundation = {
  button: { root: { radius: "{radius.lg}" } },
  input: { root: { radius: "{radius.lg}" } },
  switch: {
    root: { radius: "{radius.pill}" },
    thumb: { radius: "{radius.pill}" },
  },
  panel: {
    root: { radius: "{radius.xl}", shadow: "{elevation.shadow.low}" },
  },
  dialog: {
    root: { radius: "{radius.xl}", shadow: "{elevation.shadow.medium}" },
  },
};

for (const [componentId, parts] of Object.entries(expectedFoundation)) {
  const directBase = modernEntry.definition.components[componentId]?.base;
  assert.ok(directBase, `Modern ${componentId} must define its direct foundation override`);

  for (const [partId, expectedStyle] of Object.entries(parts)) {
    assert.deepEqual(
      directBase[partId],
      expectedStyle,
      `Modern ${componentId}.${partId} foundation must remain deterministic`,
    );
    assert.equal(
      modern.components[componentId].base[partId].radius,
      expectedStyle.radius,
      `Modern ${componentId}.${partId} radius must survive theme resolution`,
    );
    if (expectedStyle.shadow) {
      assert.equal(
        modern.components[componentId].base[partId].shadow,
        expectedStyle.shadow,
        `Modern ${componentId}.${partId} shadow must survive theme resolution`,
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

for (const entry of manifest.components) {
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = modern.components[entry.id];

  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Modern ${entry.id} must inherit declared ${size} sizing`);
  }

  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Modern ${entry.id} must retain styling for declared state ${state}`,
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
  "Modern theme inherits the complete Basic contract and establishes palette-neutral rounded geometry with deterministic drop-shadow elevation while reusing the same compiled reference palettes.",
);
