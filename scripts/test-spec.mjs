// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const outputPath = "build/spec-ir-test.json";

function compile() {
  const result = spawnSync(
    process.execPath,
    ["packages/compiler/src/index.mjs", "--output", outputPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  compile();
  const a = await readFile(outputPath, "utf8");
  compile();
  const b = await readFile(outputPath, "utf8");

  assert.equal(a, b, "The compiler must produce byte-identical output for identical inputs");

  const ir = JSON.parse(a);
  const dark = ir.palettes.find((palette) => palette.id === "reference-dark");
  const light = ir.palettes.find((palette) => palette.id === "reference-light");
  assert.ok(dark, "Reference dark palette must exist");
  assert.ok(light, "Reference light palette must exist");
  assert.deepEqual(dark.inheritance, ["basic"]);
  assert.deepEqual(dark.themes.modern.inheritance, ["basic", "modern"]);
  assert.deepEqual(dark.themes.glass.inheritance, ["basic", "modern", "glass"]);
  assert.deepEqual(dark.themes["frosted-glass"].inheritance, ["basic", "modern", "glass", "frosted-glass"]);
  assert.deepEqual(dark.themes.spacey.inheritance, ["basic", "spacey"]);
  assert.deepEqual(dark.themes.cyberpunk.inheritance, ["basic", "cyberpunk"]);
  assert.equal(ir.defaultPalette, "reference-dark");
  assert.deepEqual(ir.paletteFamilies.reference, ["reference-dark", "reference-light"]);

  const expectedContractComponentIds = ["button", "checkbox", "dialog", "input", "panel", "radio", "select", "switch"];
  const expectedReferenceVisualIds = ["button", "checkbox", "dialog", "input", "panel", "radio", "select", "switch"];
  assert.deepEqual(Object.keys(ir.componentContracts), expectedContractComponentIds);
  for (const palette of [dark, light]) {
    assert.deepEqual(
      Object.keys(palette.components),
      expectedReferenceVisualIds,
      `${palette.id} must compile the complete Basic visual foundation including completed Phase 6 controls`,
    );
  }
  assert.equal(ir.componentContracts.button.semantics.role, "button");
  assert.deepEqual(ir.componentContracts.button.capabilities.fallbackOrder, ["standard", "minimal"]);
  assert.deepEqual(ir.componentContracts.dialog.capabilities.fallbackOrder, ["high", "standard", "minimal"]);
  assert.deepEqual(ir.componentContracts.panel.capabilities.fallbackOrder, ["high", "standard", "minimal"]);

  const darkBasic = dark.themes.basic.components;
  const lightBasic = light.themes.basic.components;
  const darkModern = dark.themes.modern.components;
  const lightModern = light.themes.modern.components;
  const darkGlass = dark.themes.glass.components;
  const lightGlass = light.themes.glass.components;
  const darkFrosted = dark.themes["frosted-glass"].components;
  const lightFrosted = light.themes["frosted-glass"].components;
  const darkSpacey = dark.themes.spacey.components;
  const lightSpacey = light.themes.spacey.components;
  const darkCyberpunk = dark.themes.cyberpunk.components;
  const lightCyberpunk = light.themes.cyberpunk.components;

  for (const components of [darkBasic, lightBasic, darkModern, lightModern, darkGlass, lightGlass, darkFrosted, lightFrosted, darkSpacey, lightSpacey, darkCyberpunk, lightCyberpunk]) {
    assert.deepEqual(
      Object.keys(components),
      expectedReferenceVisualIds,
      "Every resolved theme must expose the complete Basic visual component set",
    );
  }

  assert.equal(dark.tokens["semantic.color.accent"].reference, "{palette.accent500}");
  assert.equal(dark.tokens["semantic.color.accent"].value.hex, "#2563EB");
  assert.equal(light.tokens["semantic.color.accent"].value.hex, "#1D4ED8");
  assert.equal(dark.tokens["semantic.color.surfaceTranslucent"].reference, "{palette.neutral900Translucent}");
  assert.equal(dark.tokens["semantic.color.surfaceTranslucent"].value.hex, "#171A21");
  assert.equal(dark.tokens["semantic.color.surfaceTranslucent"].value.alpha, 0.72);
  assert.equal(light.tokens["semantic.color.surfaceTranslucent"].value.hex, "#FFFFFF");
  assert.equal(light.tokens["semantic.color.surfaceTranslucent"].value.alpha, 0.72);
  assert.equal(dark.tokens["semantic.color.surfaceElevatedTranslucent"].reference, "{palette.neutral800Translucent}");
  assert.equal(dark.tokens["semantic.color.surfaceElevatedTranslucent"].value.alpha, 0.82);
  assert.equal(light.tokens["semantic.color.surfaceElevatedTranslucent"].value.alpha, 0.82);
  assert.deepEqual(dark.tokens["elevation.shadow.low"].value, light.tokens["elevation.shadow.low"].value);
  assert.equal(dark.tokens["elevation.shadow.low"].value.color.alpha, 0.12);
  assert.equal(dark.tokens["elevation.shadow.medium"].value.color.alpha, 0.18);
  assert.equal(dark.tokens["elevation.shadow.high"].value.color.alpha, 0.24);
  assert.deepEqual(dark.tokens["motion.interaction.fast"].value, {
    duration: { value: 120, unit: "ms" },
    delay: { value: 0, unit: "ms" },
    timingFunction: [0.2, 0, 0, 1],
  });
  assert.notDeepEqual(
    dark.tokens["semantic.color.textPrimary"].value,
    light.tokens["semantic.color.textPrimary"].value,
    "Palette switching must alter semantic colors when variants differ",
  );
  assert.deepEqual(
    darkModern.button.base.root.radius.value,
    lightModern.button.base.root.radius.value,
    "Modern geometry must remain palette-neutral",
  );
  assert.equal(darkModern.panel.base.root.shadow.reference, "{elevation.shadow.low}");
  assert.deepEqual(
    darkModern.panel.base.root.shadow.value,
    lightModern.panel.base.root.shadow.value,
    "Modern elevation must remain palette-neutral",
  );
  assert.notDeepEqual(
    darkModern.button.variants.primary.base.root.fill.value,
    lightModern.button.variants.primary.base.root.fill.value,
    "Modern must reuse the selected palette rather than fork it",
  );

  assert.equal(darkGlass.panel.base.root.fill.reference, "{semantic.color.surfaceTranslucent}");
  assert.equal(darkGlass.dialog.base.root.fill.reference, "{semantic.color.surfaceElevatedTranslucent}");
  assert.equal(darkGlass.panel.base.root.fill.value.alpha, 0.72);
  assert.equal(lightGlass.panel.base.root.fill.value.alpha, 0.72);
  assert.equal(darkGlass.dialog.base.root.fill.value.alpha, 0.82);
  assert.equal(lightGlass.dialog.base.root.fill.value.alpha, 0.82);
  assert.deepEqual(
    darkGlass.panel.base.root.radius.value,
    lightGlass.panel.base.root.radius.value,
    "Glass geometry must remain palette-neutral through Modern inheritance",
  );
  for (const componentId of ["button", "input", "switch"]) {
    assert.deepEqual(
      darkGlass[componentId],
      darkModern[componentId],
      `Glass ${componentId} must inherit the Modern recipe unchanged`,
    );
  }
  assert.equal(darkGlass.panel.base.root.backdropBlur, undefined, "Glass must stay crisp without backdrop blur");
  assert.equal(darkGlass.dialog.base.root.backdropBlur, undefined, "Glass Dialog must stay crisp without backdrop blur");

  for (const componentId of ["panel", "dialog"]) {
    assert.equal(
      darkFrosted[componentId].base.root.fill.reference,
      darkGlass[componentId].base.root.fill.reference,
      `Frosted ${componentId} must inherit the Glass surface before capability fallback selection`,
    );
    assert.equal(
      darkFrosted[componentId].fallbacks.high.requires[0],
      "backdropBlur",
      `Frosted ${componentId} high-tier fallback must require native backdrop blur`,
    );
    assert.equal(
      darkFrosted[componentId].fallbacks.high.recipe.base.root.backdropBlur.reference,
      "{effect.blur.frosted}",
      `Frosted ${componentId} high-tier fallback must bind the neutral Frosted blur token`,
    );
    assert.equal(
      darkFrosted[componentId].fallbacks.high.recipe.base.root.backdropBlur.value.value,
      24,
      `Frosted ${componentId} high-tier fallback must compile to the bounded 24 px blur token`,
    );
  }
  for (const componentId of ["button", "input", "switch"]) {
    assert.equal(
      darkFrosted[componentId].fallbacks?.high,
      undefined,
      `Frosted ${componentId} must not gain a blur fallback`,
    );
  }

  assert.equal(darkSpacey.button.base.root.radius.reference, "{radius.pill}");
  assert.equal(lightSpacey.button.base.root.radius.reference, "{radius.pill}");
  assert.equal(darkSpacey.input.base.root.fill.reference, "{semantic.color.surface}");
  assert.equal(lightSpacey.input.base.root.fill.reference, "{semantic.color.surface}");
  assert.equal(darkSpacey.panel.base.root.radius.reference, "{radius.sm}");
  assert.equal(lightSpacey.panel.base.root.radius.reference, "{radius.sm}");
  assert.equal(darkSpacey.panel.base.root.border.color.reference, "{semantic.color.borderStrong}");
  assert.equal(lightSpacey.panel.base.root.border.color.reference, "{semantic.color.borderStrong}");
  assert.equal(darkSpacey.panel.base.root.shadow, undefined);
  assert.equal(lightSpacey.panel.base.root.shadow, undefined);
  assert.deepEqual(
    darkSpacey.panel.base.root.radius.value,
    lightSpacey.panel.base.root.radius.value,
    "Spacey geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    darkSpacey.panel.base.root.border.color.value,
    lightSpacey.panel.base.root.border.color.value,
    "Spacey instrument frames must continue to follow semantic palette roles",
  );

  assert.equal(darkCyberpunk.button.base.root.radius.reference, "{radius.sm}");
  assert.equal(lightCyberpunk.button.base.root.radius.reference, "{radius.sm}");
  assert.equal(darkCyberpunk.input.base.root.border.color.reference, "{semantic.color.accent}");
  assert.equal(lightCyberpunk.input.base.root.border.color.reference, "{semantic.color.accent}");
  assert.equal(darkCyberpunk.panel.base.root.shadow.reference, "{elevation.shadow.low}");
  assert.equal(lightCyberpunk.panel.base.root.shadow.reference, "{elevation.shadow.low}");
  assert.equal(darkCyberpunk.dialog.base.root.shadow.reference, "{elevation.shadow.medium}");
  assert.equal(lightCyberpunk.dialog.base.root.shadow.reference, "{elevation.shadow.medium}");
  assert.equal(darkCyberpunk.panel.base.root.backdropBlur, undefined);
  assert.equal(lightCyberpunk.panel.base.root.backdropBlur, undefined);
  assert.deepEqual(
    darkCyberpunk.panel.base.root.radius.value,
    lightCyberpunk.panel.base.root.radius.value,
    "Cyberpunk geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    darkCyberpunk.input.base.root.border.color.value,
    lightCyberpunk.input.base.root.border.color.value,
    "Cyberpunk signal frames must continue to follow semantic palette roles",
  );

  assert.equal(ir.assets["reference-check"].kind, "svg");
  assert.equal(ir.assets["reference-check"].portableProfile, "path");
  assert.equal(ir.assets["reference-check"].normalized.viewBox.width, 24);
  assert.equal(ir.assets["reference-check"].normalized.pathCount, 1);

  console.log("Spec compiler output is deterministic, inheritance-aware and palette/theme separation is preserved.");
} finally {
  await rm(outputPath, { force: true });
}
