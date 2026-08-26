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

assert.match(rootBuild, /plugins \{/);
assert.match(rootBuild, /org\.jetbrains\.kotlin\.android/);
assert.match(rootBuild, /org\.jetbrains\.kotlin\.plugin\.compose/);
assert.match(rootBuild, /com\.android\.application/);
assert.match(settings, /pluginManagement/);
assert.match(settings, /dependencyResolutionManagement/);
assert.match(settings, /google\(\)/);
assert.match(settings, /mavenCentral\(\)/);
assert.match(settings, /include\(":app"\)/);
assert.match(appBuild, /namespace = "gui\.framework\.examples\.android"/);
assert.match(appBuild, /compileSdkPreview = "Baklava"/);
assert.match(appBuild, /targetSdk = 37/);
assert.match(appBuild, /minSdk = 23/);
assert.match(appBuild, /testInstrumentationRunner = "androidx\.test\.runner\.AndroidJUnitRunner"/);
assert.match(appBuild, /androidTestImplementation\("androidx\.compose\.ui:ui-test-junit4/);
assert.match(appBuild, /debugImplementation\("androidx\.compose\.ui:ui-test-manifest/);
assert.match(appBuild, /sourceSets\["main"\]\.java\.srcDirs/);
assert.match(appBuild, /build\/compose/);
assert.match(appBuild, /packages\/adapter-compose\/src\/main\/kotlin/);
assert.match(appBuild, /implementation\("org\.jetbrains\.compose\.foundation:foundation/);
assert.doesNotMatch(appBuild, /androidx\.compose\.material/);
assert.match(manifest, /android:name="\.MainActivity"/);
assert.match(manifest, /android:exported="true"/);
assert.match(manifest, /android\.intent\.action\.MAIN/);
assert.match(manifest, /android\.intent\.category\.LAUNCHER/);

assert.match(source, /class MainActivity : ComponentActivity\(\)/);
assert.match(source, /GuiTheme\(/);
assert.match(source, /referenceTheme by mutableStateOf\(GuiThemeId\.BASIC\)/);
assert.match(source, /applyReferenceTheme\(theme: GuiThemeId\)/);
assert.match(source, /theme = referenceTheme/);
assert.match(source, /paletteId = "reference-dark"/);
assert.match(source, /ReferenceDensity\.Compact/);
for (const sizeType of ["GuiButtonSize", "GuiCheckboxSize", "GuiDialogSize", "GuiInputSize", "GuiPanelSize", "GuiRadioSize", "GuiSelectSize", "GuiSwitchSize"]) {
  assert.match(
    source,
    new RegExp(`${sizeType}\\.SMALL`),
    `Android compact reference must map ${sizeType} to SMALL`,
  );
}
for (const component of ["GuiButton", "GuiCheckbox", "GuiRadio", "GuiRadioGroup", "GuiSelect", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
  assert.match(source, new RegExp(`${component}\\(`), `Android reference must exercise ${component}`);
}
assert.match(source, /includeExtendedComponents = referenceTheme == GuiThemeId\.BASIC/);
assert.match(source, /if \(includeExtendedComponents\) \{/);
assert.match(source, /accessibilityLabel = "Reference checkbox"/);
assert.match(source, /GuiRadioGroup\(groupName = "reference-review-mode"\)/);
assert.match(source, /accessibilityLabel = "Summary review"/);
assert.match(source, /accessibilityLabel = "Detailed review"/);
assert.match(source, /accessibilityLabel = "Delivery channel"/);
assert.match(source, /GuiSelectOption\(value = "legacy", label = "Legacy channel", disabled = true\)/);
assert.match(source, /mutableStateOf/);
assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/);
assert.doesNotMatch(source, /androidx\.compose\.material/);

assert.match(runtimeTest, /createAndroidComposeRule<MainActivity>\(\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Scaled reference", includeExtendedComponents = true\)/);
assert.match(runtimeTest, /compactReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceDensity\(ReferenceDensity\.Compact\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Compact reference", includeExtendedComponents = true\)/);
assert.match(runtimeTest, /modernReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.MODERN\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Modern reference"\)/);
assert.match(runtimeTest, /glassReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.GLASS\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Glass reference"\)/);
assert.match(runtimeTest, /frostedGlassReferenceFallsBackAndRemainsUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.FROSTED_GLASS\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Frosted Glass reference"\)/);
assert.match(runtimeTest, /spaceyReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.SPACEY\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Spacey reference"\)/);
assert.match(runtimeTest, /cyberpunkReferenceControlsRemainUsableAtHostScale/);
assert.match(runtimeTest, /applyReferenceTheme\(GuiThemeId\.CYBERPUNK\)/);
assert.match(runtimeTest, /exerciseReferenceControls\("Cyberpunk reference"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Reference name"\)/);
assert.match(runtimeTest, /performTextReplacement\(replacement\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Reference switch"\)/);
assert.match(runtimeTest, /includeExtendedComponents: Boolean = false/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Reference checkbox"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Summary review"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Detailed review"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Delivery channel"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Legacy channel"\)/);
assert.match(runtimeTest, /assertIsNotEnabled\(\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Push"\)/);
assert.match(runtimeTest, /assertIsSelected\(\)/);
assert.match(runtimeTest, /assertIsNotSelected\(\)/);
assert.match(runtimeTest, /performClick\(\)/);
assert.match(runtimeTest, /onNodeWithText\("Open dialog"\)/);
assert.match(runtimeTest, /onNodeWithText\("Close"\)/);
assert.match(runtimeTest, /assertDoesNotExist\(\)/);

console.log("Compose Android reference application source/build/runtime contract tests passed with Basic Checkbox/Radio/Select coverage and Phase 5 theme selection isolation.");
