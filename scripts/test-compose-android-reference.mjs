// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [settings, rootBuild, appBuild, manifest, source, runtimeTest] = await Promise.all([
  readFile("examples/compose-android/settings.gradle.kts", "utf8"),
  readFile("examples/compose-android/build.gradle.kts", "utf8"),
  readFile("examples/compose-android/app/build.gradle.kts", "utf8"),
  readFile("examples/compose-android/app/src/main/AndroidManifest.xml", "utf8"),
  readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt", "utf8"),
  readFile("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt", "utf8"),
]);

assert.match(settings, /pluginManagement\s*\{/);
assert.match(settings, /dependencyResolutionManagement\s*\{/);
assert.match(settings, /rootProject\.name = "gui-framework-compose-android-reference"/);
assert.match(settings, /include\(":app"\)/);

assert.match(rootBuild, /com\.android\.application/);
assert.match(rootBuild, /org\.jetbrains\.kotlin\.plugin\.compose/);
assert.match(rootBuild, /org\.jetbrains\.compose/);

assert.match(appBuild, /namespace = "gui\.framework\.examples\.android"/);
assert.match(appBuild, /compileSdk = 37/);
assert.match(appBuild, /minSdk = 23/);
assert.match(appBuild, /targetSdk = 36/);
assert.match(appBuild, /testInstrumentationRunner = "androidx\.test\.runner\.AndroidJUnitRunner"/);
assert.match(appBuild, /debugImplementation\("androidx\.compose\.ui:ui-test-manifest:/);
assert.match(appBuild, /androidTestImplementation\("androidx\.compose\.ui:ui-test-junit4:/);
assert.match(appBuild, /implementation\("androidx\.activity:activity-compose:/);
assert.match(appBuild, /implementation\("org\.jetbrains\.compose\.foundation:foundation:/);
assert.match(appBuild, /implementation\("org\.jetbrains\.compose\.runtime:runtime:/);
assert.match(appBuild, /implementation\("org\.jetbrains\.compose\.ui:ui:/);
assert.match(appBuild, /sourceSets\["main"\]/);
assert.match(appBuild, /packages\/adapter-compose\/src\/main\/kotlin/);
assert.match(appBuild, /build\/compose/);
assert.match(appBuild, /timeOutInMs = 600_000/);

assert.match(manifest, /android\.intent\.action\.MAIN/);
assert.match(manifest, /android\.intent\.category\.LAUNCHER/);
assert.match(manifest, /\.MainActivity/);

assert.match(source, /class MainActivity : ComponentActivity\(\)/);
assert.match(source, /setContent\s*\{/);
assert.match(source, /referenceTheme by mutableStateOf\(GuiThemeId\.BASIC\)/);
assert.match(source, /applyReferenceTheme\(theme: GuiThemeId\)/);
assert.match(source, /theme = referenceTheme/);
assert.match(source, /paletteId = "reference-dark"/);
assert.match(source, /GuiInput\(/);
assert.match(source, /GuiSwitch\(/);
assert.match(source, /GuiButton\(/);
assert.match(source, /GuiPanel\(/);
assert.match(source, /GuiDialog\(/);
assert.match(source, /ReferenceDensity\.Compact/);
assert.match(source, /GuiButtonSize\.SMALL/);
assert.match(source, /GuiDialogSize\.SMALL/);
assert.match(source, /GuiInputSize\.SMALL/);
assert.match(source, /GuiPanelSize\.SMALL/);
assert.match(source, /GuiSwitchSize\.SMALL/);

assert.match(runtimeTest, /createAndroidComposeRule<MainActivity>\(\)/);
assert.match(runtimeTest, /referenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /compactReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceDensity\(ReferenceDensity\.Compact\)/);
assert.match(runtimeTest, /modernReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.MODERN\)/);
assert.match(runtimeTest, /glassReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.GLASS\)/);
assert.match(runtimeTest, /frostedGlassReferenceFallsBackAndRemainsUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.FROSTED_GLASS\)/);
assert.match(runtimeTest, /performTextReplacement/);
assert.match(runtimeTest, /performClick/);
assert.match(runtimeTest, /onNodeWithText\("Open dialog"\)/);
assert.match(runtimeTest, /onNodeWithText\("Close"\)/);

console.log("Compose Android reference application source/build/runtime contract tests passed with Basic/Modern/Glass/Frosted Glass theme selection.");
