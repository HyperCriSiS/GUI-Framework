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
  assert.equal(a, b, "compiler output must be deterministic");

  const ir = JSON.parse(a);
  assert.equal(ir.schemaVersion, 1);
  assert.equal(ir.specVersion, "0.1.0");
  assert.deepEqual(
    ir.themes.map((theme) => theme.id),
    ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"],
  );
  assert.deepEqual(
    ir.palettes.map((palette) => palette.id),
    ["reference-dark", "reference-light"],
  );
  assert.deepEqual(
    ir.components.map((component) => component.id),
    ["button", "input", "switch", "panel", "dialog"],
  );
  assert.deepEqual(ir.assets.map((asset) => asset.id), ["reference-check"]);

  const darkPalette = ir.palettes.find((palette) => palette.id === "reference-dark");
  const lightPalette = ir.palettes.find((palette) => palette.id === "reference-light");
  assert.ok(darkPalette && lightPalette, "Both reference palettes must compile");
  assert.equal(darkPalette.provenance.source, "palettes/reference-dark.tokens.json");
  assert.equal(darkPalette.tokens.semantic.color.accent.reference, "{palette.color.accent}");
  assert.deepEqual(darkPalette.tokens.semantic.color.accent.value, {
    colorSpace: "srgb",
    components: [0.3255, 0.6039, 1],
  });
  assert.equal(darkPalette.tokens.component.button.radius.reference, "{radius.md}");
  assert.deepEqual(darkPalette.tokens.component.button.radius.value, { value: 8, unit: "px" });
  assert.equal(darkPalette.tokens.effect.blur.frosted.reference, "{effect.blur.strong}");
  assert.deepEqual(darkPalette.tokens.effect.blur.frosted.value, { value: 24, unit: "px" });
  assert.equal(darkPalette.tokens.asset.referenceCheck.reference, "reference-check");
  assert.equal(darkPalette.tokens.asset.referenceCheck.value, "reference-check");

  const buttonContract = ir.components.find((component) => component.id === "button");
  assert.ok(buttonContract, "Button contract must compile");
  assert.equal(buttonContract.provenance.source, "components/button.recipe.json");
  assert.deepEqual(buttonContract.anatomy.map((part) => part.id), ["root", "leading", "label", "trailing"]);
  assert.deepEqual(buttonContract.variants, ["primary", "secondary", "ghost", "danger"]);
  assert.deepEqual(buttonContract.states, ["default", "hover", "focus", "pressed", "disabled"]);
  assert.deepEqual(buttonContract.events.map((event) => event.id), ["press"]);
  assert.deepEqual(buttonContract.assets, ["reference-check"]);
  assert.deepEqual(buttonContract.capabilities.optional, ["advancedBlendModes", "shaderEffects"]);

  const inputContract = ir.components.find((component) => component.id === "input");
  assert.ok(inputContract, "Input contract must compile");
  assert.deepEqual(inputContract.properties, [
    { id: "value", type: "string", required: true },
    { id: "placeholder", type: "string", required: false, default: "" },
    { id: "disabled", type: "boolean", required: false, default: false },
    { id: "readOnly", type: "boolean", required: false, default: false },
    { id: "accessibilityLabel", type: "string", required: true },
  ]);
  assert.deepEqual(inputContract.events, [
    { id: "valueChange", payload: "string" },
    { id: "focusChange", payload: "boolean" },
  ]);

  const switchContract = ir.components.find((component) => component.id === "switch");
  assert.ok(switchContract, "Switch contract must compile");
  assert.deepEqual(switchContract.properties, [
    { id: "checked", type: "boolean", required: true },
    { id: "disabled", type: "boolean", required: false, default: false },
    { id: "accessibilityLabel", type: "string", required: true },
  ]);
  assert.deepEqual(switchContract.events, [{ id: "checkedChange", payload: "boolean" }]);

  const panelContract = ir.components.find((component) => component.id === "panel");
  assert.ok(panelContract, "Panel contract must compile");
  assert.deepEqual(panelContract.properties, [
    { id: "accessibilityLabel", type: "string", required: false, default: "" },
  ]);

  const dialogContract = ir.components.find((component) => component.id === "dialog");
  assert.ok(dialogContract, "Dialog contract must compile");
  assert.deepEqual(dialogContract.properties, [
    { id: "open", type: "boolean", required: true },
    { id: "accessibilityLabel", type: "string", required: true },
    { id: "dismissible", type: "boolean", required: false, default: true },
  ]);
  assert.deepEqual(dialogContract.events, [{ id: "dismissRequest", payload: "none" }]);

  assert.equal(containsReference(ir), false, "compiled IR must not contain unresolved token references");

  assert.equal(darkPalette.components.button.provenance.source, "components/button.recipe.json");
  assert.equal(darkPalette.components.button.tokens.surface.reference, "{semantic.color.surface}");
  assert.deepEqual(darkPalette.components.button.tokens.surface.value, darkPalette.tokens.semantic.color.surface.value);

  const darkBasicButton = darkPalette.themes.basic.components.button;
  const lightBasicButton = lightPalette.themes.basic.components.button;
  const darkBasicDialog = darkPalette.themes.basic.components.dialog;
  const lightBasicDialog = lightPalette.themes.basic.components.dialog;
  assert.equal(darkBasicButton.base.root.fill.reference, "{semantic.color.surface}");
  assert.deepEqual(
    darkBasicButton.base.root.fill.value,
    darkPalette.tokens.semantic.color.surface.value,
    "Theme recipes must resolve semantic token values through the selected palette",
  );
  assert.equal(darkBasicButton.base.root.radius.reference, "{radius.md}");
  assert.deepEqual(darkBasicButton.base.root.radius.value, { value: 8, unit: "px" });
  assert.equal(darkBasicButton.sizes.large.root.minHeight.reference, "{control.height.lg}");
  assert.equal(darkBasicButton.states.disabled.root.opacity.value, 0.5);
  assert.equal(darkBasicButton.variants.primary.states.hover.root.fill.reference, "{semantic.color.accentHover}");
  assert.equal(darkBasicButton.variants.primary.states.pressed.root.fill.reference, "{semantic.color.accentPressed}");
  assert.equal(darkBasicButton.variants.primary.states.focus.root.outline.color.reference, "{semantic.color.focus}");
  assert.equal(darkBasicDialog.base.root.fill.reference, "{semantic.color.surfaceElevated}");
  assert.deepEqual(
    darkBasicDialog.base.root.fill.value,
    darkPalette.tokens.semantic.color.surfaceElevated.value,
  );
  assert.notDeepEqual(
    darkBasicDialog.base.root.fill.value,
    lightBasicDialog.base.root.fill.value,
    "Palette changes must alter resolved Basic dialog surfaces without forking the theme recipe",
  );
  assert.notDeepEqual(
    darkBasicButton.variants.primary.base.root.fill.value,
    lightBasicButton.variants.primary.base.root.fill.value,
    "The same Basic primary button must resolve through the light palette without forking the theme recipe",
  );

  const darkModernButton = darkPalette.themes.modern.components.button;
  const lightModernButton = lightPalette.themes.modern.components.button;
  const darkModernPanel = darkPalette.themes.modern.components.panel;
  const darkModernSwitch = darkPalette.themes.modern.components.switch;
  assert.ok(darkModernButton && lightModernButton && darkModernPanel && darkModernSwitch, "Modern must compile the inherited reference-component visuals for every palette");
  assert.equal(darkModernButton.base.root.radius.reference, "{radius.lg}");
  assert.equal(darkModernPanel.base.root.radius.reference, "{radius.xl}");
  assert.equal(darkModernSwitch.base.root.radius.reference, "{radius.pill}");
  assert.equal(darkModernSwitch.base.thumb.radius.reference, "{radius.pill}");
  assert.ok(
    darkModernButton.variants,
    "Modern must retain Basic button variant behavior while changing geometry",
  );
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
  assert.deepEqual(
    darkFrosted,
    darkPalette.themes.glass.components,
    "Frosted Glass foundation must inherit the complete dark-palette Glass contract before blur is introduced",
  );
  assert.deepEqual(
    lightFrosted,
    lightPalette.themes.glass.components,
    "Frosted Glass foundation must inherit the complete light-palette Glass contract before blur is introduced",
  );

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
