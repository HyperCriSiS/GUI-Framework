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
const spacey = resolvedThemes.find((theme) => theme.id === "spacey");

assert.ok(spaceyEntry, "The Spacey theme must remain registered");
assert.ok(spacey, "The Spacey theme must resolve");
assert.equal(spaceyEntry.definition.theme, "spacey");
assert.equal(spaceyEntry.definition.extends, "basic", "Spacey must build directly on the low-cost Basic contract");
assert.deepEqual(spacey.inheritance, ["basic", "spacey"]);

const componentIds = manifest.components.map((entry) => entry.id).sort();
assert.deepEqual(
  Object.keys(spacey.components).sort(),
  componentIds,
  "Spacey must retain every registered reference component through inheritance",
);

const expectedFoundation = {
  button: {
    root: { radius: "{radius.pill}" },
  },
  input: {
    root: {
      fill: "{semantic.color.surface}",
      radius: "{radius.pill}",
      border: {
        color: "{semantic.color.borderStrong}",
        width: "{border.width.standard}",
      },
    },
  },
  switch: {
    root: {
      radius: "{radius.pill}",
      border: {
        color: "{semantic.color.borderStrong}",
        width: "{border.width.standard}",
      },
    },
    thumb: { radius: "{radius.pill}" },
  },
  panel: {
    root: {
      fill: "{semantic.color.surface}",
      radius: "{radius.sm}",
      border: {
        color: "{semantic.color.borderStrong}",
        width: "{border.width.standard}",
      },
    },
  },
  dialog: {
    root: {
      radius: "{radius.sm}",
      border: {
        color: "{semantic.color.borderStrong}",
        width: "{border.width.standard}",
      },
    },
  },
};

for (const [componentId, parts] of Object.entries(expectedFoundation)) {
  const directBase = spaceyEntry.definition.components[componentId]?.base;
  assert.ok(directBase, `Spacey ${componentId} must define its direct instrumentation override`);
  assert.deepEqual(directBase, parts, `Spacey ${componentId} foundation must remain deterministic`);

  for (const [partId, expectedStyle] of Object.entries(parts)) {
    const resolvedPart = spacey.components[componentId].base[partId];
    if (expectedStyle.radius) assert.equal(resolvedPart.radius, expectedStyle.radius);
    if (expectedStyle.fill) assert.equal(resolvedPart.fill, expectedStyle.fill);
    if (expectedStyle.border) assert.deepEqual(resolvedPart.border, expectedStyle.border);
  }
}

assert.deepEqual(
  spaceyEntry.definition.components.switch.states?.checked?.root?.border,
  { color: "{semantic.color.borderStrong}" },
  "Spacey checked Switch must keep the instrument frame while inheriting the active Accent fill",
);

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

const borderStrongPaths = collectKeys(
  spaceyEntry.definition.components,
  (key, value) => key === "color" && value === "{semantic.color.borderStrong}",
);
assert.deepEqual(
  borderStrongPaths.sort(),
  [
    "spacey.dialog.base.root.border.color",
    "spacey.input.base.root.border.color",
    "spacey.panel.base.root.border.color",
    "spacey.switch.base.root.border.color",
    "spacey.switch.states.checked.root.border.color",
  ],
  "Spacey strong instrumentation outlines must stay limited to the intended surfaces and preserve the checked switch frame",
);

for (const entry of manifest.components) {
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = spacey.components[entry.id];

  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Spacey ${entry.id} must inherit declared ${size} sizing`);
  }

  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Spacey ${entry.id} must retain styling for declared state ${state}`,
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
    assert.equal(components.panel.base.root.border.color.reference, "{semantic.color.borderStrong}");
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
} finally {
  await rm(irPath, { force: true });
}

console.log(
  "Spacey inherits the complete Basic contract and establishes a flat, palette-neutral aerospace instrumentation geometry using only native low-cost visual properties.",
);
