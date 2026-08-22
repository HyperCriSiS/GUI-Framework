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
  assert.equal(darkButton.properties.find((property) => property.id === "disabled")?.state, "disabled");
  assert.equal(darkButton.properties.find((property) => property.id === "loading")?.state, "loading");

  assert.equal(darkButton.tokenBindings.accent.value.hex, "#2563EB");
  assert.equal(lightButton.tokenBindings.accent.value.hex, "#684DE2");
  assert.notDeepEqual(
    darkButton.tokenBindings.accent.value,
    lightButton.tokenBindings.accent.value,
    "Palette swapping must change resolved semantic color values"
  );

  assert.deepEqual(
    darkButton.tokenBindings.accent.trace.map((entry) => entry.token),
    ["semantic.color.accent", "palette.accent500"],
    "Resolved token bindings must preserve provenance"
  );
  assert.equal(darkButton.semantics.preferNativePrimitive, true);

  const transition = darkButton.tokenBindings.interactionTransition;
  assert.equal(transition.type, "transition");
  assert.deepEqual(transition.value.duration, { value: 120, unit: "ms" });
  assert.deepEqual(transition.value.delay, { value: 0, unit: "ms" });
  assert.deepEqual(transition.value.timingFunction, [0.2, 0, 0, 1]);
  assert.equal(containsReference(transition.value), false, "Composite token values must not retain unresolved references in IR");

  assert.ok(darkPalette.tokens["semantic.color.background"], "Semantic tokens must be exported in the public IR");
  assert.ok(darkPalette.tokens["spacing.md"], "Primitive tokens must be exported in the public IR");
  assert.ok(darkPalette.tokens["motion.interaction.fast"], "Composite primitive tokens must be exported in the public IR");
  assert.equal(darkPalette.tokens["palette.accent500"], undefined, "Raw palette tokens must not be exposed as public adapter tokens");
  assert.equal(containsReference(darkPalette.tokens), false, "Public adapter tokens must be fully resolved");

  assert.deepEqual(
    Object.keys(darkPalette.themes),
    ["basic", "cyberpunk", "frosted-glass", "glass", "modern", "spacey"],
    "Every palette must contain compiled visual slots for the six registered themes",
  );

  const darkBasicButton = darkPalette.themes.basic.components.button;
  const lightBasicButton = lightPalette.themes.basic.components.button;
  const darkBasicDialog = darkPalette.themes.basic.components.dialog;
  const lightBasicDialog = lightPalette.themes.basic.components.dialog;
  assert.ok(darkBasicDialog && lightBasicDialog, "Basic must compile a concrete dialog visual recipe for every palette");
  assert.notDeepEqual(
    darkBasicDialog.base.root.fill.value,
    lightBasicDialog.base.root.fill.value,
    "Palette changes must alter resolved Basic dialog surfaces without forking the theme recipe",
  );
  assert.ok(darkBasicButton && lightBasicButton, "Basic must compile a concrete button visual recipe for every palette");
  assert.equal(
    darkBasicButton.variants.primary.base.root.fill.value.hex,
    "#2563EB",
    "The Basic primary button must resolve through the dark palette",
  );
  assert.equal(
    lightBasicButton.variants.primary.base.root.fill.value.hex,
    "#684DE2",
    "The same Basic primary button must resolve through the light palette without forking the theme recipe",
  );
  assert.notDeepEqual(
    darkBasicButton.variants.primary.base.root.fill.value,
    lightBasicButton.variants.primary.base.root.fill.value,
    "Palette changes must alter resolved Basic visuals while preserving one shared theme definition",
  );
  assert.equal(
    darkBasicButton.base.root.radius.reference,
    "{radius.control}",
    "Compiled Basic visuals must retain source-token provenance",
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
  assert.deepEqual(
    darkModernButton.variants,
    darkBasicButton.variants,
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
