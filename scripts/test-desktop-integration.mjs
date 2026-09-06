// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const host = await readFile("packages/integration-desktop/src/main/kotlin/GuiDesktopHost.kt", "utf8");
const reference = await readFile("examples/compose-desktop-integration/src/main/kotlin/DesktopIntegrationReference.kt", "utf8");
const pom = await readFile("packages/adapter-compose/pom.xml", "utf8");

for (const [symbol, wireValue] of [
  ["APPLICATION", "application"],
  ["SETTINGS", "settings"],
  ["UTILITY", "utility"],
  ["DIALOG", "dialog"],
]) {
  assert.match(host, new RegExp(`${symbol}\\(\\"${wireValue}\\"\\)`));
}

assert.match(host, /data class GuiDesktopHostContext\(/);
assert.match(host, /val surface: GuiDesktopSurface/);
assert.match(host, /val theme: GuiThemeId/);
assert.match(host, /val paletteId: String/);
assert.match(host, /val availableCapabilities: Set<String>/);
assert.match(host, /LocalGuiDesktopHostContext = staticCompositionLocalOf<GuiDesktopHostContext>/);
assert.match(host, /fun GuiDesktopHost\(/);
assert.match(host, /availableCapabilities: Set<String> = emptySet\(\)/);
assert.match(host, /val capabilities = availableCapabilities\.toSet\(\)/);
assert.match(host, /GuiTheme\(/);
assert.match(host, /availableCapabilities = capabilities/);
assert.match(host, /LocalGuiDesktopHostContext provides context/);
assert.doesNotMatch(host, /System\.getProperty|os\.name|OperatingSystem|GraphicsEnvironment|androidx\.compose\.material/);

assert.match(reference, /GuiDesktopHost\(/);
assert.match(reference, /surface = GuiDesktopSurface\.APPLICATION/);
assert.match(reference, /availableCapabilities = emptySet\(\)/);
assert.match(reference, /LocalGuiDesktopHostContext\.current\.surface == GuiDesktopSurface\.APPLICATION/);
assert.match(reference, /GuiButton\(/);
assert.match(reference, /accessibilityLabel = "Desktop integration action"/);
assert.match(pom, /\.\.\/integration-desktop\/src\/main\/kotlin/);
assert.match(pom, /\.\.\/\.\.\/examples\/compose-desktop-integration\/src\/main\/kotlin/);

console.log("Compose Desktop integration kit source/reference contract tests passed.");
