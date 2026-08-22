// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const first = "build/spec-ir-test-a.json";
const second = "build/spec-ir-test-b.json";

function compile(output) {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", output], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function findComponent(palette, id) {
  const component = palette.components[id];
  assert.ok(component, `Missing compiled component ${id}`);
  return component;
}

try {
  compile(first);
  compile(second);

  const [firstSource, secondSource] = await Promise.all([
    readFile(first, "utf8"),
    readFile(second, "utf8"),
  ]);
  assert.equal(firstSource, secondSource, "Compiler output must be deterministic");

  const ir = JSON.parse(firstSource);
  assert.equal(ir.specVersion, "0.1.0");
  assert.deepEqual(
    ir.themes.map((theme) => theme.id),
    ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"],
  );
  assert.deepEqual(
    ir.palettes.map((palette) => palette.id),
    ["reference-dark", "reference-light"],
  );
  assert.equal(ir.assets.length, 1);
  assert.equal(ir.assets[0].id, "icon.close");
  assert.equal(ir.assets[0].format, "svg");
  assert.equal(ir.assets[0].usage, "icon");
  assert.equal(ir.assets[0].renderMode, "mask");
  assert.equal(ir.assets[0].source, "assets/icons/close.svg");
  assert.equal(ir.assets[0].viewBox, "0 0 24 24");
  assert.equal(ir.assets[0].sha256, "f8d2c1aacba211d18a9d49bffda9ca6ca5ee1cf0d15843361623837c376481ed");

  const darkPalette = ir.palettes.find((palette) => palette.id === "reference-dark");
  const lightPalette = ir.palettes.find((palette) => palette.id === "reference-light");
  assert.ok(darkPalette && lightPalette);
  assert.deepEqual(
    Object.keys(darkPalette.components),
    ["button", "dialog", "input", "panel", "switch"],
  );
  assert.deepEqual(
    Object.keys(darkPalette.themes),
    ["basic", "cyberpunk", "frosted-glass", "glass", "modern", "spacey"],
  );

  const button = findComponent(darkPalette, "button");
  assert.equal(button.id, "button");
  assert.equal(button.contentModel, "text");
  assert.equal(button.properties.find((property) => property.id === "disabled")?.type, "boolean");
  assert.equal(button.properties.find((property) => property.id === "loading")?.state, "loading");
  assert.equal(button.events.find((event) => event.id === "activate")?.payload, "void");
  assert.deepEqual(button.variants, ["primary", "secondary", "ghost", "danger"]);
  assert.deepEqual(button.sizes, ["small", "medium", "large"]);
  assert.deepEqual(button.states, ["default", "hover", "focus", "pressed", "disabled", "loading"]);
  assert.equal(button.semantics.preferNativePrimitive, true);
  assert.deepEqual(button.capabilities.required, []);
  assert.deepEqual(button.capabilities.fallbackOrder, ["standard", "minimal"]);
  assert.equal(button.accessibility.minimumTargetSizePx, 24);
  assert.equal(button.accessibility.recommendedTargetSizePx, 44);
  assert.equal(button.accessibility.keyboardActivationRequired, true);
  assert.equal(button.accessibility.focusVisibleRequired, true);
  assert.deepEqual(button.accessibility.allowedRoles, ["button"]);
  assert.deepEqual(button.accessibility.requiredStates, ["disabled"]);
  assert.deepEqual(button.accessibility.requiredProperties, ["name"]);
  assert.deepEqual(button.accessibility.prohibitedStates, ["checked"]);
  assert.equal(button.accessibility.nameRequired, true);
  assert.deepEqual(button.interaction.hoverFeedback, {
    required: true,
    mode: "immediate",
    transition: "{motion.interaction.fast}",
  });
  assert.deepEqual(button.interaction.pressFeedback, {
    required: true,
    mode: "immediate",
    transition: "{motion.interaction.fast}",
  });
  assert.deepEqual(button.interaction.focusFeedback, {
    required: true,
    mode: "immediate",
    transition: "{motion.interaction.fast}",
  });
  assert.equal(button.interaction.decorativeMotionAllowed, false);

  const dialog = findComponent(darkPalette, "dialog");
  assert.equal(dialog.contentModel, "container");
  assert.equal(dialog.properties.find((property) => property.id === "open")?.type, "boolean");
  assert.equal(dialog.events.find((event) => event.id === "dismissRequest")?.payload, "void");
  assert.deepEqual(dialog.variants, ["standard"]);
  assert.deepEqual(dialog.sizes, ["small", "medium", "large"]);
  assert.deepEqual(dialog.states, ["default"]);
  assert.equal(dialog.semantics.role, "dialog");
  assert.equal(dialog.accessibility.focusVisibleRequired, false);

  const input = findComponent(darkPalette, "input");
  assert.equal(input.contentModel, "text");
  assert.equal(input.properties.find((property) => property.id === "value")?.type, "string");
  assert.equal(input.properties.find((property) => property.id === "placeholder")?.type, "string");
  assert.equal(input.properties.find((property) => property.id === "disabled")?.state, "disabled");
  assert.equal(input.properties.find((property) => property.id === "invalid")?.state, "error");
  assert.equal(input.events.find((event) => event.id === "valueChange")?.payload, "string");
  assert.deepEqual(input.variants, ["standard"]);
  assert.deepEqual(input.sizes, ["small", "medium", "large"]);
  assert.deepEqual(input.states, ["default", "hover", "focus", "disabled", "error"]);
  assert.equal(input.semantics.preferNativePrimitive, true);
  assert.equal(input.accessibility.minimumTargetSizePx, 24);
  assert.equal(input.accessibility.focusVisibleRequired, true);

  const panel = findComponent(darkPalette, "panel");
  assert.equal(panel.contentModel, "container");
  assert.equal(panel.semantics.role, "group");
  assert.deepEqual(panel.variants, ["standard"]);
  assert.deepEqual(panel.sizes, ["small", "medium", "large"]);
  assert.deepEqual(panel.states, ["default"]);

  const guiSwitch = findComponent(darkPalette, "switch");
  assert.equal(guiSwitch.contentModel, "none");
  assert.equal(guiSwitch.properties.find((property) => property.id === "checked")?.state, "checked");
  assert.equal(guiSwitch.events.find((event) => event.id === "checkedChange")?.payload, "boolean");
  assert.deepEqual(guiSwitch.variants, ["standard"]);
  assert.deepEqual(guiSwitch.sizes, ["small", "medium", "large"]);
  assert.deepEqual(guiSwitch.states, ["default", "hover", "focus", "pressed", "checked", "disabled"]);
  assert.equal(guiSwitch.semantics.role, "switch");
  assert.equal(guiSwitch.accessibility.minimumTargetSizePx, 24);
  assert.equal(guiSwitch.accessibility.keyboardActivationRequired, true);
  assert.deepEqual(guiSwitch.accessibility.requiredStates, ["checked", "disabled"]);
  assert.deepEqual(guiSwitch.accessibility.requiredProperties, ["name"]);

  const darkBasicButton = darkPalette.themes.basic.components.button;
  const lightBasicButton = lightPalette.themes.basic.components.button;
  assert.ok(darkBasicButton && lightBasicButton);
  assert.equal(darkBasicButton.variants.primary.base.root.fill.reference, "{semantic.color.accent}");
  assert.equal(darkBasicButton.variants.primary.base.root.fill.value.hex, "#2563EB");
  assert.equal(lightBasicButton.variants.primary.base.root.fill.value.hex, "#684DE2");
  assert.deepEqual(
    darkBasicButton.base.root.minHeight.value,
    lightBasicButton.base.root.minHeight.value,
    "Palette switching must not alter geometry",
  );
  assert.notDeepEqual(
    darkBasicButton.variants.primary.base.root.fill.value,
    lightBasicButton.variants.primary.base.root.fill.value,
    "Palette switching must change semantic colors when the palette differs",
  );

  const darkModernButton = darkPalette.themes.modern.components.button;
  const lightModernButton = lightPalette.themes.modern.components.button;
  assert.ok(darkModernButton && lightModernButton, "Modern must compile its inherited Button visual for every palette");
  assert.equal(darkModernButton.base.root.radius.reference, "{radius.lg}");
  assert.equal(lightModernButton.base.root.radius.reference, "{radius.lg}");
  assert.deepEqual(
    darkModernButton.variants.primary.base.root.fill.value,
    darkBasicButton.variants.primary.base.root.fill.value,
    "One palette must be reusable across Basic and Modern without palette-specific theme forks",
  );
  assert.deepEqual(
    darkModernButton.base.root.radius.value,
    lightModernButton.base.root.radius.value,
    "Modern geometry must remain stable when the palette changes",
  );
  assert.notDeepEqual(
    darkModernButton.variants.primary.base.root.fill.value,
    lightModernButton.variants.primary.base.root.fill.value,
    "Modern must inherit semantic palette changes without forking its geometry recipe",
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
    "Glass geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    darkGlassPanel.base.root.fill.value.components,
    lightGlassPanel.base.root.fill.value.components,
    "Glass translucent surfaces must inherit palette-specific semantic color values",
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
      assert.equal(
        fallbacks.high.recipe.base.root.backdropBlur.reference,
        "{effect.blur.frosted}",
      );
      assert.deepEqual(
        fallbacks.high.recipe.base.root.backdropBlur.value,
        { value: 24, unit: "px" },
      );
    }
  }

  for (const themeId of ["cyberpunk", "spacey"]) {
    assert.deepEqual(
      darkPalette.themes[themeId].components,
      {},
      `${themeId} visual IR must remain intentionally empty until that theme is deliberately designed`,
    );
  }

  console.log("Specification compiler determinism, provenance, runtime contracts, composite resolution and palette-independence tests passed.");
} finally {
  await Promise.all([rm(first, { force: true }), rm(second, { force: true })]);
}
