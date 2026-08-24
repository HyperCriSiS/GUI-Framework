// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [scenario, manifest, web, desktop, android] = await Promise.all([
  readFile("examples/reference-scenarios.json", "utf8").then(JSON.parse),
  readFile("spec/manifest.json", "utf8").then(JSON.parse),
  readFile("examples/web-reference/app.mjs", "utf8"),
  readFile("examples/compose-desktop/src/main/kotlin/Main.kt", "utf8"),
  readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt", "utf8"),
]);

assert.equal(scenario.version, 1);
assert.equal(scenario.theme, "basic");
assert.equal(scenario.palette, "reference-dark");
assert.deepEqual(scenario.components, ["button", "input", "switch", "panel", "dialog"]);
assert.deepEqual(scenario.densityProfiles, {
  standard: { usesComponentDefaults: true },
  compact: { componentSize: "small", minimumViewportWidth: 320 },
});
assert.deepEqual(scenario.flows.map(({ id }) => id), [
  "edit-primary-input",
  "toggle-switch",
  "open-dialog",
  "dismiss-dialog",
  "close-dialog-action",
]);

const registered = new Set(manifest.components.map((entry) => entry.id));
for (const component of scenario.components) {
  assert.ok(registered.has(component), `Scenario component ${component} must be registered`);
}

assert.match(web, /const themes = new Set\(\["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"\]\)/);
assert.match(web, /const theme = options\.theme \?\? "basic"/);
assert.match(web, /if \(!themes\.has\(theme\)\) throw new Error/);
assert.match(web, /root\.dataset\.guiTheme = theme/);
assert.match(web, /configureWebComponentCapabilities\(/);
assert.match(web, /fetch\("\.\.\/\.\.\/build\/spec-ir\.json"/);
assert.match(web, /options\.palette \?\? "reference-dark"/);
assert.match(web, /options\.density \?\? "standard"/);
assert.match(web, /const compact = density === "compact"/);
assert.ok(
  (web.match(/size: compact \? "small" :/g) ?? []).length >= 8,
  "Web compact reference must route its reference components through the existing small size",
);
for (const factory of ["createGuiButton", "createGuiInput", "createGuiSwitch", "createGuiPanel", "createGuiDialog"]) {
  assert.match(web, new RegExp(`\\b${factory}\\(`), `Web reference must exercise ${factory}`);
}
for (const factory of ["createGuiCheckbox", "createGuiRadio"]) {
  assert.match(web, new RegExp(`\\b${factory}\\(`), `Web Basic extension must exercise ${factory}`);
}
assert.match(web, /new Set\(\["checkbox", "radio"\]\)/);
assert.match(web, /extendedComponent !== null && theme !== "basic"/);
assert.match(web, /role", "radiogroup"/);
assert.match(web, /accessibilityLabel: "Summary review"/);
assert.match(web, /accessibilityLabel: "Detailed review"/);
assert.match(web, /onValueChange\(nextValue\)/);
assert.match(web, /onCheckedChange\(nextChecked\)/);
assert.match(web, /state\.dialogOpen = true;[\s\S]*dialog\.update\(\{ open: true \}\)/);
assert.match(web, /onDismissRequest: closeDialog/);
assert.match(web, /label: "Close"[\s\S]*onActivate: closeDialog/);

assert.match(desktop, /theme: GuiThemeId = GuiThemeId\.BASIC/);
assert.match(desktop, /"modern" -> GuiThemeId\.MODERN/);
assert.match(desktop, /"glass" -> GuiThemeId\.GLASS/);
assert.match(desktop, /"frosted-glass" -> GuiThemeId\.FROSTED_GLASS/);
assert.match(desktop, /"spacey" -> GuiThemeId\.SPACEY/);
assert.match(desktop, /"cyberpunk" -> GuiThemeId\.CYBERPUNK/);
assert.match(desktop, /theme = theme/);
assert.match(desktop, /paletteId: String = "reference-dark"/);
assert.match(desktop, /paletteId = paletteId/);

assert.match(android, /referenceTheme by mutableStateOf\(GuiThemeId\.BASIC\)/);
assert.match(android, /applyReferenceTheme\(theme: GuiThemeId\)/);
assert.match(android, /theme = referenceTheme/);
assert.match(android, /paletteId = "reference-dark"/);

for (const [name, source] of [["Compose Desktop", desktop], ["Compose Android", android]]) {
  assert.match(source, /ReferenceDensity\.Compact/);
  for (const sizeType of ["GuiButtonSize", "GuiCheckboxSize", "GuiDialogSize", "GuiInputSize", "GuiPanelSize", "GuiRadioSize", "GuiSwitchSize"]) {
    assert.match(
      source,
      new RegExp(`${sizeType}\\.SMALL`),
      `${name} compact reference must map ${sizeType} to its existing SMALL size`,
    );
  }
  for (const component of ["GuiButton", "GuiCheckbox", "GuiInput", "GuiRadio", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
    assert.match(source, new RegExp(`\\b${component}\\(`), `${name} reference must exercise ${component}`);
  }
  assert.match(source, /onValueChange = \{ [a-zA-Z]+ = it \}/, `${name} must expose the input edit flow`);
  assert.match(source, /onCheckedChange = \{ enabled = it \}/, `${name} must expose the switch toggle flow`);
  assert.match(source, /onActivate = \{ dialogOpen = true \}/, `${name} must expose the dialog open flow`);
  assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/, `${name} must expose the dialog dismiss flow`);
  assert.match(source, /label = "Close"[\s\S]*onActivate = \{ dialogOpen = false \}/, `${name} must expose the explicit close action`);
  assert.match(source, /includeExtendedComponents/, `${name} must isolate Phase 6 reference extensions`);
  assert.match(source, /GuiRadioGroup\(groupName = "reference-review-mode"\)/, `${name} must expose a semantic Radio group`);
  assert.match(source, /accessibilityLabel = "Summary review"/, `${name} must expose the summary Radio option`);
  assert.match(source, /accessibilityLabel = "Detailed review"/, `${name} must expose the detailed Radio option`);
}

assert.deepEqual(Object.keys(scenario.platformExtensions).sort(), ["composeAndroid", "composeDesktop", "web"]);

console.log("Cross-platform reference application parity tests passed with Basic Checkbox/Radio extensions and validated Modern/Glass/Frosted/Spacey/Cyberpunk selection paths.");
