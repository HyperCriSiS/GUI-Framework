// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  resolveComponentVisualForCapabilities,
  resolveThemeDefinitions,
} from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const resolvedThemes = resolveThemeDefinitions(definitions);
const glass = resolvedThemes.find((theme) => theme.id === "glass");
const frostedEntry = definitions.find((theme) => theme.id === "frosted-glass");
const frosted = resolvedThemes.find((theme) => theme.id === "frosted-glass");

assert.ok(glass, "Glass must resolve before Frosted Glass");
assert.ok(frostedEntry, "Frosted Glass must remain registered");
assert.ok(frosted, "Frosted Glass must resolve");
assert.equal(frostedEntry.definition.extends, "glass");
assert.deepEqual(frosted.inheritance, ["basic", "modern", "glass", "frosted-glass"]);
assert.deepEqual(
  Object.keys(frostedEntry.definition.components).sort(),
  ["dialog", "panel"],
  "Frosted Glass must remain a focused surface effect layer",
);

for (const componentId of ["panel", "dialog"]) {
  const direct = frostedEntry.definition.components[componentId];
  assert.deepEqual(
    Object.keys(direct),
    ["fallbacks"],
    `${componentId} must not fork the inherited Glass base recipe`,
  );
  assert.deepEqual(direct.fallbacks, {
    high: {
      requires: ["backdropBlur"],
      recipe: {
        base: {
          root: {
            backdropBlur: "{effect.blur.frosted}",
          },
        },
      },
    },
  });

  assert.deepEqual(
    frosted.components[componentId].base,
    glass.components[componentId].base,
    `${componentId} must preserve the complete crisp Glass base`,
  );

  const componentEntry = manifest.components.find((entry) => entry.id === componentId);
  const component = JSON.parse(await readFile(join("spec", componentEntry.source), "utf8"));

  const crisp = resolveComponentVisualForCapabilities(
    frosted.components[componentId],
    component.capabilities,
    {
      statePriority: component.states,
      availableCapabilities: [],
    },
  );
  assert.equal(crisp.selectedFallback, null);
  assert.equal(crisp.visual.root.backdropBlur, undefined);
  assert.equal(crisp.visual.root.fill, glass.components[componentId].base.root.fill);
  assert.equal(crisp.visual.root.radius, glass.components[componentId].base.root.radius);
  assert.equal(crisp.visual.root.shadow, glass.components[componentId].base.root.shadow);

  const blurred = resolveComponentVisualForCapabilities(
    frosted.components[componentId],
    component.capabilities,
    {
      statePriority: component.states,
      availableCapabilities: ["backdropBlur"],
    },
  );
  assert.equal(blurred.selectedFallback, "high");
  assert.equal(blurred.visual.root.backdropBlur, "{effect.blur.frosted}");
  assert.equal(blurred.visual.root.fill, glass.components[componentId].base.root.fill);
  assert.equal(blurred.visual.root.radius, glass.components[componentId].base.root.radius);
  assert.equal(blurred.visual.root.shadow, glass.components[componentId].base.root.shadow);
}

for (const componentId of ["button", "input", "switch"]) {
  assert.deepEqual(
    frosted.components[componentId],
    glass.components[componentId],
    `${componentId} must remain identical to Glass`,
  );
}

const effects = JSON.parse(await readFile("spec/tokens/visual-effects.tokens.json", "utf8"));
assert.deepEqual(
  effects.effect.blur.frosted.$value,
  { value: 24, unit: "px" },
  "Frosted Glass must use the existing neutral frosted blur token",
);

console.log("Frosted Glass capability layering and crisp fallback contract passed.");
