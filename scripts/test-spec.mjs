// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const first = "build/spec-ir-test-a.json";
const second = "build/spec-ir-test-b.json";

function compile(output) {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", output], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function containsReference(value) {
  if (typeof value === "string") return /^\{[^{}]+\}$/.test(value);
  if (Array.isArray(value)) return value.some(containsReference);
  if (value !== null && typeof value === "object") return Object.values(value).some(containsReference);
  return false;
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
    "The initial theme registry must remain stable"
  );

  assert.deepEqual(
    ir.palettes.map((palette) => palette.id),
    ["reference-dark", "reference-light"],
    "Independent development palettes must remain registered"
  );

  const expectedComponentIds = ["button", "dialog", "input", "panel", "switch"];
  for (const palette of ir.palettes) {
    assert.deepEqual(
      Object.keys(palette.components),
      expectedComponentIds,
      `Palette ${palette.id} must compile the complete reference component registry`
    );
  }

  const darkPalette = ir.palettes.find((palette) => palette.id === "reference-dark");
  const lightPalette = ir.palettes.find((palette) => palette.id === "reference-light");
  assert.equal(darkPalette?.familyId, "reference");
  assert.equal(lightPalette?.familyId, "reference");
  assert.equal(darkPalette?.variantId, "dark");
  assert.equal(lightPalette?.variantId, "light");
  assert.notEqual(darkPalette?.variantId, lightPalette?.variantId, "Palette variants in one family must remain distinguishable");
  const darkButton = darkPalette?.components?.button;
  const lightButton = lightPalette?.components?.button;
  assert.ok(darkButton && lightButton, "Every registered palette must compile the same button contract");

  assert.deepEqual(darkButton.anatomy, lightButton.anatomy, "Palette changes must not fork component anatomy");
  assert.deepEqual(darkButton.content, lightButton.content, "Palette changes must not fork component content contracts");
  assert.deepEqual(darkButton.properties, lightButton.properties, "Palette changes must not fork component property contracts");
  assert.deepEqual(darkButton.events, lightButton.events, "Palette changes must not fork component event contracts");
  assert.deepEqual(darkButton.variants, lightButton.variants, "Palette changes must not fork component variants");
  assert.deepEqual(darkButton.states, lightButton.states, "Palette changes must not fork component states");
  assert.deepEqual(darkButton.semantics, lightButton.semantics, "Palette changes must not fork component semantics");
  assert.deepEqual(darkButton.capabilities, lightButton.capabilities, "Palette changes must not fork capability requirements");

  assert.deepEqual(darkButton.content, [
    { id: "label", kind: "text", required: true },
    { id: "leadingIcon", kind: "graphic", required: false },
    { id: "trailingIcon", kind: "graphic", required: false }
  ]);
  assert.deepEqual(darkButton.events, [{ id: "activate", payload: "none" }]);
  assert.deepEqual(darkButton.properties, [
    { id: "disabled", type: "boolean", required: false, default: false, mapsToState: "disabled" },
    { id: "loading", type: "boolean", required: false, default: false, mapsToState: "loading" },
    { id: "accessibilityLabel", type: "string", required: false }
  ]);
  assert.equal(darkButton.semantics.preferNativePrimitive, true);
  assert.deepEqual(darkButton.semantics.allowedRoles, ["button"]);
  assert.deepEqual(darkButton.semantics.requiredProperties, ["name"]);
  assert.deepEqual(darkButton.semantics.requiredStates, ["disabled"]);
  assert.deepEqual(darkButton.semantics.prohibitedStates, ["checked"]);
  assert.deepEqual(darkButton.interaction.hoverFeedback, { required: true, kind: "visual", transition: "{motion.interaction.fast}" });
  assert.deepEqual(darkButton.interaction.pressFeedback, { required: true, kind: "visual", transition: "{motion.interaction.fast}" });
  assert.deepEqual(darkButton.interaction.focusFeedback, { required: true, kind: "visual" });
  assert.equal(darkButton.interaction.decorativeMotionAllowed, false);

  assert.deepEqual(darkButton.capabilities.required, []);
  assert.ok(darkButton.capabilities.optional.includes("advancedBlendModes"));
  assert.ok(darkButton.capabilities.optional.includes("shaderEffects"));
  assert.deepEqual(darkButton.capabilities.fallbackOrder, ["standard", "minimal"]);
  assert.deepEqual(darkButton.capabilities.fallbacks, {});
  assert.equal(darkButton.visual.fallbacks, undefined);

  assert.equal(containsReference(darkButton.visual), false, "Resolved component visuals must not contain unresolved token references");

  const darkBasicButton = darkPalette.themes.basic.components.button;
  const lightBasicButton = lightPalette.themes.basic.components.button;
  assert.ok(darkBasicButton && lightBasicButton, "Basic must compile its inherited Button visual for every palette");
  assert.equal(darkBasicButton.variants.primary.base.root.fill.reference, "{semantic.color.accent}");
  assert.equal(lightBasicButton.variants.primary.base.root.fill.reference, "{semantic.color.accent}");
  assert.deepEqual(
    darkBasicButton.base.root.minHeight.value,
    lightBasicButton.base.root.minHeight.value,
    "Basic geometry must remain palette-neutral"
  );
  assert.notDeepEqual(
    darkBasicButton.variants.primary.base.root.fill.value,
    lightBasicButton.variants.primary.base.root.fill.value,
    "Basic semantic colors must change with the selected palette"
  );

  const darkModernButton = darkPalette.themes.modern.components.button;
  const lightModernButton = lightPalette.themes.modern.components.button;
  assert.ok(darkModernButton && lightModernButton, "Modern must compile its inherited Button visual for every palette");
  assert.equal(darkModernButton.base.root.radius.reference, "{radius.lg}");
  assert.equal(lightModernButton.base.root.radius.reference, "{radius.lg}");
  assert.deepEqual(
    darkModernButton.variants.primary.base.root.fill.value,
    darkBasicButton.variants.primary.base.root.fill.value,
    "One palette must be reusable across Basic and Modern without palette-specific theme forks"
  );
  assert.deepEqual(
    darkModernButton.base.root.radius.value,
    lightModernButton.base.root.radius.value,
    "Modern geometry must remain stable when the palette changes"
  );
  assert.notDeepEqual(
    darkModernButton.variants.primary.base.root.fill.value,
    lightModernButton.variants.primary.base.root.fill.value,
    "Modern must inherit semantic palette changes without forking its geometry recipe"
  );

  const darkGlassPanel = darkPalette.themes.glass.components.panel;
  const lightGlassPanel = lightPalette.themes.glass.components.panel;
  const darkGlassDialog = darkPalette.themes.glass.components.dialog;
  const lightGlassDialog = lightPalette.themes.glass.components.dialog;
  assert.ok(darkGlassPanel && lightGlassPanel && darkGlassDialog && lightGlassDialog, "Glass must compile its inherited Panel/Dialog surface layer for every palette");
  assert.equal(darkGlassPanel.base.root.fill.reference, "{semantic.color.surfaceTranslucent}");
  assert.equal(darkGlassDialog.base.root.fill.reference, "{semantic.color.surfaceElevatedTranslucent}");
  assert.equal(darkGlassPanel.base.root.fill.value.alpha, 0.72);
  assert.equal(lightGlassPanel.base.root.fill.value.alpha, 0.72);
  assert.equal(darkGlassDialog.base.root.fill.value.alpha, 0.82);
  assert.equal(lightGlassDialog.base.root.fill.value.alpha, 0.82);
  assert.deepEqual(
    darkGlassPanel.base.root.radius.value,
    lightGlassPanel.base.root.radius.value,
    "Glass geometry must remain palette-neutral"
  );
  assert.notDeepEqual(
    darkGlassPanel.base.root.fill.value.components,
    lightGlassPanel.base.root.fill.value.components,
    "Glass translucent surfaces must inherit palette-specific semantic color values"
  );

  const darkFrosted = darkPalette.themes["frosted-glass"].components;
  const lightFrosted = lightPalette.themes["frosted-glass"].components;
  for (const componentId of ["button", "input", "switch"]) {
    assert.deepEqual(
      darkFrosted[componentId],
      darkPalette.themes.glass.components[componentId],
      `Frosted Glass ${componentId} must remain identical to Glass on the dark palette`,
    );
    assert.deepEqual(
      lightFrosted[componentId],
      lightPalette.themes.glass.components[componentId],
      `Frosted Glass ${componentId} must remain identical to Glass on the light palette`,
    );
  }
  for (const componentId of ["panel", "dialog"]) {
    for (const [paletteLabel, frostedComponent, glassComponent] of [
      ["dark", darkFrosted[componentId], darkPalette.themes.glass.components[componentId]],
      ["light", lightFrosted[componentId], lightPalette.themes.glass.components[componentId]],
    ]) {
      const { fallbacks, ...frostedBase } = frostedComponent;
      assert.deepEqual(
        frostedBase,
        glassComponent,
        `Frosted Glass ${componentId} must preserve the complete ${paletteLabel}-palette Glass base`,
      );
      assert.deepEqual(fallbacks.high.requires, ["backdropBlur"]);
      assert.equal(fallbacks.high.recipe.base.root.backdropBlur.reference, "{effect.blur.frosted}");
      assert.deepEqual(fallbacks.high.recipe.base.root.backdropBlur.value, { value: 24, unit: "px" });
    }
  }

  for (const themeId of ["cyberpunk", "spacey"]) {
    assert.deepEqual(
      darkPalette.themes[themeId].components,
      {},
      `${themeId} visual IR must remain intentionally empty until that theme is deliberately designed`
    );
  }

  console.log("Specification compiler determinism, provenance, runtime contracts, composite resolution and palette-independence tests passed.");
} finally {
  await Promise.all([rm(first, { force: true }), rm(second, { force: true })]);
}
