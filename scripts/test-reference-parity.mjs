// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [scenario, manifest, web, desktop, android, shared] = await Promise.all([
  readJson("spec/quality/reference-app-scenario.json"),
  readJson("spec/manifest.json"),
  readFile("examples/web-reference/app.mjs", "utf8"),
  readFile("examples/compose-desktop/src/main/kotlin/Main.kt", "utf8"),
  readFile("examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt", "utf8"),
  readFile("examples/compose-reference-shared/src/main/kotlin/gui/framework/examples/reference/ReferenceScreen.kt", "utf8"),
]);

assert.equal(scenario.version, 1);
assert.equal(scenario.theme, "basic");
assert.equal(scenario.palette, "reference-dark");
assert.deepEqual(scenario.components, ["button", "input", "switch", "panel", "dialog"]);
assert.deepEqual(scenario.densityProfiles, {
  standard: {
    controlSize: "medium",
    inputSize: "large",
    primaryPanelSize: "large",
    secondaryPanelSize: "medium",
    dialogSize: "medium",
  },
  compact: {
    controlSize: "small",
    inputSize: "small",
    primaryPanelSize: "small",
    secondaryPanelSize: "small",
    dialogSize: "small",
  },
});

const registered = new Set(manifest.components.map((component) => component.id));
for (const component of scenario.components) {
  assert.ok(registered.has(component), `Scenario component ${component} must be registered`);
}

assert.match(web, /const themes = new Set\(\["basic", "modern", "glass"\]\)/);
assert.match(web, /const theme = options\.theme \?\? "basic"/);
assert.match(web, /if \(!themes\.has\(theme\)\) throw new Error/);
assert.match(web, /root\.dataset\.guiTheme = theme/);
assert.match(web, /options\.palette \?\? "reference-dark"/);
assert.match(web, /options\.density \?\? "standard"/);
assert.match(web, /const compact = density === "compact"/);
assert.match(web, /size: compact \? "small" : "large"/);
assert.match(web, /size: compact \? "small" : "medium"/);
assert.match(web, /state\.name = nextValue/);
assert.match(web, /nameInput\.update\(\{ value: nextValue \}\)/);
assert.match(web, /state\.notifications = nextChecked/);
assert.match(web, /notificationSwitch\.update\(\{ checked: nextChecked \}\)/);
assert.match(web, /state\.palette = state\.palette === "reference-dark" \? "reference-light" : "reference-dark"/);
assert.match(web, /paletteButton\.update\(/);
assert.match(web, /state\.dialogOpen = true/);
assert.match(web, /dialog\.update\(\{ open: true \}\)/);
assert.match(web, /function closeDialog\(\)/);
assert.match(web, /dialog\.update\(\{ open: false \}\)/);
assert.match(web, /onDismissRequest: closeDialog/);
assert.match(web, /label: "Close"[\s\S]*onActivate: closeDialog/);

assert.match(desktop, /theme: GuiThemeId = GuiThemeId\.BASIC/);
assert.match(desktop, /"modern" -> GuiThemeId\.MODERN/);
assert.match(desktop, /theme = theme/);
assert.match(desktop, /paletteId: String = "reference-dark"/);
assert.match(desktop, /paletteId = paletteId/);

assert.match(android, /referenceTheme by mutableStateOf\(GuiThemeId\.BASIC\)/);
assert.match(android, /applyReferenceTheme\(theme: GuiThemeId\)/);
assert.match(android, /theme = referenceTheme/);
assert.match(android, /paletteId = "reference-dark"/);

for (const [name, source] of [["Compose Desktop", desktop], ["Compose Android", android]]) {
  for (const marker of ["GuiButton(", "GuiInput(", "GuiSwitch(", "GuiPanel(", "GuiDialog("]) {
    assert.doesNotMatch(source, new RegExp(escapeRegExp(marker)), `${name} must reuse the shared reference screen instead of duplicating ${marker}`);
  }
}

for (const marker of ["GuiButton(", "GuiInput(", "GuiSwitch(", "GuiPanel(", "GuiDialog("]) {
  assert.match(shared, new RegExp(escapeRegExp(marker)), `Shared Compose reference screen must exercise ${marker}`);
}

console.log("Cross-platform reference application parity tests passed with Basic defaults, Modern cross-platform selection and Glass Web selection.");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
