// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expectedThemes = [
  "basic",
  "modern",
  "glass",
  "frosted-glass",
  "spacey",
  "cyberpunk",
];

const [
  irSource,
  generatedVisuals,
  sharedProbe,
  desktopProbe,
  androidProbe,
  androidSixThemeRuntime,
] = await Promise.all([
  readFile("build/spec-ir.json", "utf8"),
  readFile("build/compose/GuiVisuals.kt", "utf8"),
  readFile("examples/showcase-shared/src/main/kotlin/gui/framework/examples/showcase/ShowcaseComposeVisualParity.kt", "utf8"),
  readFile("examples/compose-desktop/src/main/kotlin/ComposeVisualParityProbe.kt", "utf8"),
  readFile("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ComposeVisualParityRuntimeTest.kt", "utf8"),
  readFile("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ShowcaseSixThemeRuntimeTest.kt", "utf8"),
]);

const ir = JSON.parse(irSource);
assert.ok(Array.isArray(ir.palettes) && ir.palettes.length >= 2, "Compose parity requires both reference palettes");

for (const palette of ir.palettes) {
  const themeIds = Object.keys(palette.themes ?? {}).sort();
  assert.deepEqual(themeIds, [...expectedThemes].sort(), `${palette.id} must compile all six initial themes`);

  const componentIds = Object.keys(palette.components ?? {}).sort();
  assert.ok(componentIds.length >= 20, `${palette.id} must retain the complete component registry`);
  for (const themeId of expectedThemes) {
    assert.deepEqual(
      Object.keys(palette.themes[themeId]?.components ?? {}).sort(),
      componentIds,
      `${palette.id}/${themeId} must compile a visual recipe for every component`,
    );
  }

  for (const componentId of ["panel", "dialog"]) {
    const glass = palette.themes.glass.components[componentId];
    const frosted = palette.themes["frosted-glass"].components[componentId];
    assert.deepEqual(
      frosted.base,
      glass.base,
      `${palette.id}/${componentId} must preserve the crisp Glass base on Compose`,
    );
    assert.deepEqual(
      frosted.fallbacks?.high?.requires,
      ["backdropBlur"],
      `${palette.id}/${componentId} Frosted high tier must remain gated by backdropBlur`,
    );
  }
}

assert.match(generatedVisuals, /internal fun theme\(paletteId: String, themeId: String\): Map<String, GuiVisualRecipe>\?/);
assert.match(generatedVisuals, /internal object GuiComposeVisualParityMetadata/);
assert.match(generatedVisuals, /fun capabilities\(componentId: String\): GuiComponentCapabilities/);
assert.match(generatedVisuals, /internal object GuiComposeVisualParityBaseline/);
assert.match(generatedVisuals, /fun fingerprint\(paletteId: String, themeId: String\): String\?/);

for (const paletteId of ir.palettes.map(({ id }) => id)) {
  assert.ok(generatedVisuals.includes(`"${paletteId}" to mapOf(`), `Generated parity baseline must include ${paletteId}`);
}
for (const themeId of expectedThemes) {
  assert.ok(generatedVisuals.includes(`"${themeId}" to `), `Generated parity baseline must include ${themeId}`);
}

const hashes = generatedVisuals.match(/"[0-9a-f]{64}"/g) ?? [];
assert.equal(
  hashes.length,
  ir.palettes.length * expectedThemes.length,
  "Generated Compose parity baseline must contain one SHA-256 per palette/theme pair",
);
assert.equal(
  new Set(hashes).size,
  ir.palettes.length * 5,
  "Each palette must retain five effective Compose visual identities because Frosted Glass crisply falls back to Glass",
);

assert.match(sharedProbe, /GuiThemeId\.entries\.map \{ it\.wireValue \}/);
assert.match(sharedProbe, /selectGuiCapabilityFallback\(/);
assert.match(sharedProbe, /resolveGuiCapabilityRecipe\(/);
assert.match(sharedProbe, /availableCapabilities = emptySet\(\)/);
assert.match(sharedProbe, /GuiComposeVisualParityBaseline\.fingerprint\(paletteId, themeId\)/);
assert.match(sharedProbe, /MessageDigest\.getInstance\("SHA-256"\)/);
assert.match(sharedProbe, /value\.toRawBits\(\)\.toULong\(\)\.toString\(16\)/);
assert.match(sharedProbe, /paletteFingerprints\.getValue\("glass"\) == paletteFingerprints\.getValue\("frosted-glass"\)/);
assert.match(sharedProbe, /paletteFingerprints\.values\.toSet\(\)\.size == 5/);
assert.match(sharedProbe, /fingerprints\.size == composeParityPalettes\.size \* composeParityThemeIds\.size/);

assert.match(desktopProbe, /verifyShowcaseComposeVisualParity\(\)/);
assert.match(desktopProbe, /fingerprints\.size == 12/);
assert.match(androidProbe, /verifyShowcaseComposeVisualParity\(\)/);
assert.match(androidProbe, /assertEquals\(12, fingerprints\.size\)/);

for (const theme of ["Basic", "Modern", "Glass", "Frosted Glass", "Spacey", "Cyberpunk"]) {
  assert.ok(androidSixThemeRuntime.includes(`"${theme}"`), `Android runtime traversal must retain ${theme}`);
}
for (const section of ["Components", "Screens", "Compare", "Stress Lab"]) {
  assert.ok(androidSixThemeRuntime.includes(`"${section}"`), `Android six-theme runtime must traverse ${section}`);
}

console.log(
  "Compose six-theme visual parity contract passed: both reference palettes expose complete recipes, " +
    "Desktop and Android share the effective SHA-256 probe, and Frosted Glass resolves to crisp Glass without backdropBlur.",
);
