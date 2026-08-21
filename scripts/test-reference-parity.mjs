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

assert.match(web, /root\.dataset\.guiTheme = "basic"/);
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
assert.match(web, /onValueChange\(nextValue\)/);
assert.match(web, /onCheckedChange\(nextChecked\)/);
assert.match(web, /state\.dialogOpen = true;[\s\S]*dialog\.update\(\{ open: true \}\)/);
assert.match(web, /onDismissRequest: closeDialog/);
assert.match(web, /label: "Close"[\s\S]*onActivate: closeDialog/);

for (const [name, source] of [["Compose Desktop", desktop], ["Compose Android", android]]) {
  assert.match(source, /theme = GuiThemeId\.BASIC/);
  assert.match(source, /paletteId = "reference-dark"/);
  assert.match(source, /ReferenceDensity\.Compact/);
  for (const sizeType of ["GuiButtonSize", "GuiDialogSize", "GuiInputSize", "GuiPanelSize", "GuiSwitchSize"]) {
    assert.match(
      source,
      new RegExp(`${sizeType}\\.SMALL`),
      `${name} compact reference must map ${sizeType} to its existing SMALL size`,
    );
  }
  for (const component of ["GuiButton", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
    assert.match(source, new RegExp(`\\b${component}\\(`), `${name} reference must exercise ${component}`);
  }
  assert.match(source, /onValueChange = \{ [a-zA-Z]+ = it \}/, `${name} must expose the input edit flow`);
  assert.match(source, /onCheckedChange = \{ enabled = it \}/, `${name} must expose the switch toggle flow`);
  assert.match(source, /onActivate = \{ dialogOpen = true \}/, `${name} must expose the dialog open flow`);
  assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/, `${name} must expose the dialog dismiss flow`);
  assert.match(source, /label = "Close"[\s\S]*onActivate = \{ dialogOpen = false \}/, `${name} must expose the explicit close action`);
}

assert.deepEqual(Object.keys(scenario.platformExtensions).sort(), ["composeAndroid", "composeDesktop", "web"]);

console.log("Cross-platform reference application parity tests passed.");
