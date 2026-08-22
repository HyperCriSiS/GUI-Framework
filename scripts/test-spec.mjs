// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compileSpecification } from "../packages/compiler/src/index.mjs";

const first = await mkdtemp(join(tmpdir(), "gui-framework-ir-a-"));
const second = await mkdtemp(join(tmpdir(), "gui-framework-ir-b-"));

try {
  const firstResult = await compileSpecification({ outputDir: first });
  const secondResult = await compileSpecification({ outputDir: second });

  assert.equal(firstResult.componentCount, 5);
  assert.equal(firstResult.themeCount, 6);
  assert.equal(firstResult.paletteCount, 2);
  assert.equal(firstResult.assetCount, 1);
  assert.equal(firstResult.tokenFileCount, 3);
  assert.equal(firstResult.artifactCount, 5);

  const firstContents = await Promise.all(
    firstResult.artifacts.map((artifact) => readFile(artifact, "utf8")),
  );
  const secondContents = await Promise.all(
    secondResult.artifacts.map((artifact) => readFile(artifact, "utf8")),
  );
  assert.deepEqual(firstContents, secondContents, "compiler output must be deterministic");

  const manifest = JSON.parse(await readFile(join(first, "manifest.json"), "utf8"));
  assert.equal(manifest.specVersion, "0.1.0");
  assert.deepEqual(
    manifest.themes.map((theme) => theme.id),
    ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"],
  );
  assert.deepEqual(
    manifest.palettes.map((palette) => palette.id),
    ["reference-dark", "reference-light"],
  );
  assert.deepEqual(
    manifest.components.map((component) => component.id),
    ["button", "input", "switch", "panel", "dialog"],
  );
  assert.deepEqual(manifest.assets.map((asset) => asset.id), ["reference-check"]);

  const palette = JSON.parse(await readFile(join(first, "palettes", "reference-dark.json"), "utf8"));
  assert.equal(palette.id, "reference-dark");
  assert.equal(palette.provenance.source, "palettes/reference-dark.tokens.json");
  assert.equal(palette.tokens.semantic.color.accent.reference, "{palette.color.accent}");
  assert.deepEqual(palette.tokens.semantic.color.accent.value, {
    colorSpace: "srgb",
    components: [0.3255, 0.6039, 1],
  });
  assert.equal(palette.tokens.component.button.radius.reference, "{radius.md}");
  assert.equal(palette.tokens.component.button.radius.value, 8);
  assert.equal(palette.tokens.effect.blur.frosted.reference, "{effect.blur.strong}");
  assert.equal(palette.tokens.effect.blur.frosted.value, 24);
  assert.equal(palette.tokens.asset.referenceCheck.reference, "reference-check");
  assert.equal(palette.tokens.asset.referenceCheck.value, "reference-check");

  const buttonContract = JSON.parse(await readFile(join(first, "components", "button.json"), "utf8"));
  assert.equal(buttonContract.component, "button");
  assert.equal(buttonContract.provenance.source, "components/button.recipe.json");
  assert.deepEqual(buttonContract.anatomy.map((part) => part.id), ["root", "leading", "label", "trailing"]);
  assert.deepEqual(buttonContract.variants, ["primary", "secondary", "ghost", "danger"]);
  assert.deepEqual(buttonContract.states, ["default", "hover", "focus", "pressed", "disabled"]);
  assert.deepEqual(buttonContract.events.map((event) => event.id), ["press"]);
  assert.deepEqual(buttonContract.assets, ["reference-check"]);
  assert.deepEqual(buttonContract.capabilities.optional, ["advancedBlendModes", "shaderEffects"]);

  const dialogContract = JSON.parse(await readFile(join(first, "components", "dialog.json"), "utf8"));
  assert.deepEqual(dialogContract.properties, [
    { id: "open", type: "boolean", required: true },
    { id: "accessibilityLabel", type: "string", required: true },
    { id: "dismissible", type: "boolean", required: false, default: true },
  ]);
  assert.deepEqual(dialogContract.events, [{ id: "dismissRequest", payload: "none" }]);
  assert.deepEqual(dialogContract.capabilities.optional, ["backdropBlur", "advancedBlendModes", "shaderEffects"]);
  assert.deepEqual(dialogContract.capabilities.fallbackOrder, ["high", "standard", "minimal"]);

  assert.ok(palette.themes.basic, "Basic theme must compile into palette IR");
  assert.ok(palette.themes.modern, "Modern theme must compile into palette IR");
  assert.ok(palette.themes.glass, "Glass theme must compile into palette IR");
  assert.ok(palette.themes["frosted-glass"], "Frosted Glass theme must compile into palette IR");
  assert.ok(palette.themes.spacey, "Spacey theme must compile into palette IR");
  assert.ok(palette.themes.cyberpunk, "Cyberpunk theme must compile into palette IR");

  const asset = JSON.parse(await readFile(join(first, "assets", "reference-check.json"), "utf8"));
  assert.deepEqual(asset, {
    specVersion: "0.1.0",
    id: "reference-check",
    kind: "icon",
    source: "assets/reference-check.svg",
    sha256: "b0cff52749774c9e99a0e75207824c7a6247e10b75bac684cce0e739578c73e7",
    content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 9.25 17 19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n',
  });

  const darkPalette = JSON.parse(await readFile(join(first, "palettes", "reference-dark.json"), "utf8"));
  const lightPalette = JSON.parse(await readFile(join(first, "palettes", "reference-light.json"), "utf8"));
  assert.deepEqual(
    Object.keys(darkPalette.themes).sort(),
    ["basic", "cyberpunk", "frosted-glass", "glass", "modern", "spacey"],
  );

  const darkBasicButton = darkPalette.themes.basic.components.button;
  const lightBasicButton = lightPalette.themes.basic.components.button;
  const darkBasicDialog = darkPalette.themes.basic.components.dialog;
  const lightBasicDialog = lightPalette.themes.basic.components.dialog;
  assert.ok(darkBasicButton && lightBasicButton && darkBasicDialog && lightBasicDialog);
  assert.notDeepEqual(
    darkBasicDialog.base.root.fill.value,
    lightBasicDialog.base.root.fill.value,
    "Palette changes must alter resolved Basic dialog surfaces without forking the theme recipe",
  );
  assert.equal(
    darkBasicButton.base.root.radius.reference,
    lightBasicButton.base.root.radius.reference,
    "Basic geometry must remain palette-neutral",
  );
  assert.deepEqual(
    darkBasicButton.variants.primary.base.root.fill.reference,
    "{semantic.color.accent}",
  );
  assert.notDeepEqual(
    darkBasicButton.variants.primary.base.root.fill.value,
    lightBasicButton.variants.primary.base.root.fill.value,
    "The same Basic primary button must resolve through the light palette without forking the theme recipe",
  );
  assert.deepEqual(
    darkBasicButton.base.root.radius.value,
    lightBasicButton.base.root.radius.value,
    "Palette changes must alter resolved Basic visuals while preserving one shared theme definition",
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
