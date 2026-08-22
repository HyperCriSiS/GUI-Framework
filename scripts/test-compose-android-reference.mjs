// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [rootBuild, appBuild, settings, manifest, source, runtimeTest] = await Promise.all([
  readFile("examples/compose-android/build.gradle.kts", "utf8"),
  readFile("examples/compose-android/app/build.gradle.kts", "utf8"),
  readFile("examples/compose-android/settings.gradle.kts", "utf8"),
  readFile("examples/compose-android/app/src/main/AndroidManifest.xml", "utf8"),
  readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt", "utf8"),
  readFile("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt", "utf8"),
]);

assert.match(rootBuild, /id\("com\.android\.application"\) version "9\.3\.0"/);
assert.match(rootBuild, /kotlin-gradle-plugin:2\.4\.10/);
assert.match(rootBuild, /id\("org\.jetbrains\.kotlin\.plugin\.compose"\) version "2\.4\.10"/);
assert.doesNotMatch(rootBuild, /org\.jetbrains\.kotlin\.android|kotlin-android/, "AGP 9 reference must use built-in Kotlin");

assert.match(settings, /google\(\)/);
assert.match(settings, /mavenCentral\(\)/);
assert.match(settings, /include\(":app"\)/);

assert.match(appBuild, /compileSdk = 37/);
assert.match(appBuild, /minSdk = 23/);
assert.match(appBuild, /targetSdk = 37/);
assert.match(appBuild, /testInstrumentationRunner = "androidx\.test\.runner\.AndroidJUnitRunner"/);
assert.match(appBuild, /compose = true/);
assert.match(appBuild, /JavaVersion\.VERSION_17/);
assert.match(appBuild, /sourceSets\.named\("main"\)/);
assert.match(appBuild, /kotlin\.directories \+= "\.\.\/\.\.\/\.\.\/packages\/adapter-compose\/src\/main\/kotlin"/);
assert.match(appBuild, /kotlin\.directories \+= "\.\.\/\.\.\/\.\.\/build\/compose"/);
assert.match(appBuild, /androidx\.compose:compose-bom:2026\.06\.01/);
assert.match(appBuild, /androidx\.activity:activity-compose:1\.13\.0/);
assert.match(appBuild, /androidx\.compose\.ui:ui-test-junit4/);
assert.match(appBuild, /androidx\.test\.ext:junit:1\.3\.0/);
assert.match(appBuild, /androidx\.test:runner:1\.7\.0/);
assert.match(appBuild, /androidx\.compose\.ui:ui-test-manifest/);
assert.doesNotMatch(appBuild, /androidx\.compose\.material/);

assert.match(manifest, /android:name="\.MainActivity"/);
assert.match(manifest, /android:exported="true"/);
assert.match(manifest, /android\.intent\.action\.MAIN/);

assert.match(source, /class MainActivity : ComponentActivity\(\)/);
assert.match(source, /setContent \{/);
assert.match(source, /referenceTheme by mutableStateOf\(GuiThemeId\.BASIC\)/);
assert.match(source, /applyReferenceTheme\(theme: GuiThemeId\)/);
assert.match(source, /theme = referenceTheme/);
assert.match(source, /paletteId = "reference-dark"/);
assert.match(source, /ReferenceDensity\.Compact/);
assert.match(source, /applyReferenceDensity\(density: ReferenceDensity\)/);
for (const sizeType of ["GuiButtonSize", "GuiDialogSize", "GuiInputSize", "GuiPanelSize", "GuiSwitchSize"]) {
  assert.match(
    source,
    new RegExp(`${sizeType}\\.SMALL`),
    `Android compact reference must map ${sizeType} to SMALL`,
  );
}
for (const component of ["GuiButton", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
  assert.match(source, new RegExp(`${component}\\(`), `Android reference must exercise ${component}`);
}
assert.match(source, /mutableStateOf/);
assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/);
assert.doesNotMatch(source, /androidx\.compose\.material/);

assert.match(runtimeTest, /createAndroidComposeRule<MainActivity>\(\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Scaled reference"\)/);
assert.match(runtimeTest, /compactReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceDensity\(ReferenceDensity\.Compact\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Compact reference"\)/);
assert.match(runtimeTest, /modernReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.MODERN\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Modern reference"\)/);
assert.match(runtimeTest, /glassReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.GLASS\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Glass reference"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Reference name"\)/);
assert.match(runtimeTest, /performTextReplacement\(replacement\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Reference switch"\)/);
assert.match(runtimeTest, /performClick\(\)/);
assert.match(runtimeTest, /onNodeWithText\("Open dialog"\)/);
assert.match(runtimeTest, /onNodeWithText\("Close"\)/);
assert.match(runtimeTest, /assertDoesNotExist\(\)/);

console.log("Compose Android reference application source/build/runtime contract tests passed with Basic/Modern/Glass theme selection.");
