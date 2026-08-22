// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const first = "build/spec-ir-test-a.json";
const second = "build/spec-ir-test-b.json";

function compile(output) {
  const result = spawnSync(
    process.execPath,
    ["packages/compiler/src/index.mjs", "--output", output],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  compile(first);
  compile(second);

  const [a, b] = await Promise.all([readFile(first, "utf8"), readFile(second, "utf8")]);
  assert.equal(a, b, "The compiler must produce byte-identical output for identical inputs");

  const ir = JSON.parse(a);
  assert.deepEqual(
    ir.themes.map((theme) => theme.id),
    ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"],
    "The initial theme registry must remain stable",
  );
  assert.deepEqual(
    ir.palettes.map((palette) => palette.id),
    ["reference-dark", "reference-light"],
    "The reference palette variants must remain registered",
  );

  const expectedComponentIds = ["button", "dialog", "input", "panel", "switch"];
  for (const palette of ir.palettes) {
    assert.deepEqual(
      Object.keys(palette.components),
      expectedComponentIds,
      `Palette ${palette.id} must compile the complete reference component registry`,
    );
  }

  const dark = ir.palettes.find((palette) => palette.id === "reference-dark");
  const light = ir.palettes.find((palette) => palette.id === "reference-light");
  assert.ok(dark && light, "Both reference palettes must compile");
  assert.equal(dark.familyId, light.familyId, "Palette variants must remain in one family");
  assert.notEqual(dark.variantId, light.variantId, "Palette variants must remain distinguishable");

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
      expectedComponentIds,
      "Every available theme must resolve the complete reference component set",
    );
  }

  assert.equal(darkBasic.button.variants.primary.base.root.fill.reference, "{semantic.color.accent}");
  assert.equal(lightBasic.button.variants.primary.base.root.fill.reference, "{semantic.color.accent}");
  assert.notDeepEqual(
    darkBasic.button.variants.primary.base.root.fill.value,
    lightBasic.button.variants.primary.base.root.fill.value,
    "Palette switching must alter semantic colors when variants differ",
  );

  assert.equal(darkModern.button.base.root.radius.reference, "{radius.lg}");
  assert.equal(lightModern.button.base.root.radius.reference, "{radius.lg}");
  assert.deepEqual(
    darkModern.button.variants.primary.base.root.fill.value,
    darkBasic.button.variants.primary.base.root.fill.value,
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
    "Glass geometry must remain palette-neutral",
  );

  for (const componentId of ["button", "input", "switch"]) {
    assert.deepEqual(
      darkFrosted[componentId],
      darkGlass[componentId],
      `Frosted Glass ${componentId} must remain identical to Glass`,
    );
    assert.deepEqual(lightFrosted[componentId], lightGlass[componentId]);
  }

  for (const componentId of ["panel", "dialog"]) {
    for (const [frostedComponent, glassComponent] of [
      [darkFrosted[componentId], darkGlass[componentId]],
      [lightFrosted[componentId], lightGlass[componentId]],
    ]) {
      const { fallbacks, ...frostedBase } = frostedComponent;
      assert.deepEqual(
        frostedBase,
        glassComponent,
        `Frosted Glass ${componentId} must preserve the complete crisp Glass base`,
      );
      assert.deepEqual(fallbacks.high.requires, ["backdropBlur"]);
      assert.equal(fallbacks.high.recipe.base.root.backdropBlur.reference, "{effect.blur.frosted}");
      assert.deepEqual(fallbacks.high.recipe.base.root.backdropBlur.value, { value: 24, unit: "px" });
    }
  }

  for (const [cyberpunk, basic] of [
    [darkCyberpunk, darkBasic],
    [lightCyberpunk, lightBasic],
  ]) {
    assert.equal(cyberpunk.button.base.root.radius.reference, "{radius.sm}");
    assert.equal(cyberpunk.input.base.root.border.color.reference, "{semantic.color.accent}");
    assert.equal(cyberpunk.switch.base.root.border.color.reference, "{semantic.color.accent}");
    assert.equal(cyberpunk.panel.base.root.shadow.reference, "{elevation.shadow.low}");
    assert.equal(cyberpunk.dialog.base.root.shadow.reference, "{elevation.shadow.medium}");
    assert.deepEqual(
      cyberpunk.button.variants.primary.base.root.fill.value,
      basic.button.variants.primary.base.root.fill.value,
      "Cyberpunk must keep Basic semantic fills and derive color from the selected palette",
    );
  }
  assert.deepEqual(
    darkCyberpunk.button.base.root.radius.value,
    lightCyberpunk.button.base.root.radius.value,
    "Cyberpunk geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    darkCyberpunk.input.base.root.border.color.value,
    lightCyberpunk.input.base.root.border.color.value,
    "Cyberpunk signal frames must resolve through the selected semantic palette",
  );

  console.log("Compiler determinism, registry, palette/theme resolution, Frosted fallback and Cyberpunk inheritance tests passed.");
} finally {
  await Promise.all([rm(first, { force: true }), rm(second, { force: true })]);
}
