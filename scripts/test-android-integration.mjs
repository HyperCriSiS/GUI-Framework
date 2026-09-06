// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const host = await readFile("packages/integration-android/src/main/kotlin/GuiAndroidHost.kt", "utf8");
const reference = await readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/AndroidIntegrationReferenceActivity.kt", "utf8");
const runtime = await readFile("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/AndroidIntegrationRuntimeTest.kt", "utf8");
const manifest = await readFile("examples/compose-android/app/src/main/AndroidManifest.xml", "utf8");
const gradle = await readFile("examples/compose-android/app/build.gradle.kts", "utf8");

for (const [symbol, wireValue] of [
  ["APPLICATION", "application"],
  ["SETTINGS", "settings"],
  ["DIALOG", "dialog"],
  ["OVERLAY", "overlay"],
]) {
  assert.match(host, new RegExp(`${symbol}\\(\\"${wireValue}\\"\\)`));
}

assert.match(host, /data class GuiAndroidHostContext\(/);
assert.match(host, /val surface: GuiAndroidSurface/);
assert.match(host, /val theme: GuiThemeId/);
assert.match(host, /val paletteId: String/);
assert.match(host, /val availableCapabilities: Set<String>/);
assert.match(host, /LocalGuiAndroidHostContext = staticCompositionLocalOf<GuiAndroidHostContext>/);
assert.match(host, /fun GuiAndroidHost\(/);
assert.match(host, /availableCapabilities: Set<String> = emptySet\(\)/);
assert.match(host, /val capabilities = availableCapabilities\.toSet\(\)/);
assert.match(host, /GuiTheme\(/);
assert.match(host, /availableCapabilities = capabilities/);
assert.match(host, /LocalGuiAndroidHostContext provides context/);
assert.doesNotMatch(host, /Build\.VERSION|Build\.MANUFACTURER|LocalConfiguration|WindowMetrics|androidx\.compose\.material/);

assert.match(reference, /class AndroidIntegrationReferenceActivity : ComponentActivity\(\)/);
assert.match(reference, /GuiAndroidHost\(/);
assert.match(reference, /surface = GuiAndroidSurface\.APPLICATION/);
assert.match(reference, /availableCapabilities = emptySet\(\)/);
assert.match(reference, /LocalGuiAndroidHostContext\.current\.surface == GuiAndroidSurface\.APPLICATION/);
assert.match(reference, /GuiButton\(/);
assert.match(reference, /onActivate = \{ activations \+= 1 \}/);

assert.match(runtime, /createAndroidComposeRule<AndroidIntegrationReferenceActivity>\(\)/);
assert.match(runtime, /onNodeWithText\("Integration action"\)/);
assert.match(runtime, /performClick\(\)/);
assert.match(runtime, /onNodeWithText\("Integration activations: 1"\)/);

assert.match(manifest, /android:name="\.AndroidIntegrationReferenceActivity"/);
assert.match(manifest, /AndroidIntegrationReferenceActivity"[\s\S]*android:exported="false"/);
assert.match(gradle, /packages\/integration-android\/src\/main\/kotlin/);

console.log("Android application integration kit source/reference/runtime contract tests passed.");
