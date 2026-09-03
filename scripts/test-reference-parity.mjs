// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, desktop, android] = await Promise.all([
  readFile("examples/reference-scenarios.json", "utf8").then(JSON.parse),
  readFile("spec/manifest.json", "utf8").then(JSON.parse),
  readFile("examples/web-reference/app.mjs", "utf8"),
  readFile("examples/web-reference/select-reference.mjs", "utf8"),
  readFile("examples/web-reference/tooltip-reference.mjs", "utf8"),
  readFile("examples/web-reference/toast-reference.mjs", "utf8"),
  readFile("examples/web-reference/progress-reference.mjs", "utf8"),
  readFile("examples/web-reference/slider-reference.mjs", "utf8"),
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
assert.ok((web.match(/size: compact \? "small" :/g) ?? []).length >= 8, "Web compact reference must route its reference components through the existing small size");
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
assert.match(webSelect, /createGuiSelect\(/, "Web Select reference must exercise createGuiSelect");
assert.match(webSelect, /accessibilityLabel: editable \? "Find delivery channel" : "Delivery channel"/);
assert.match(webSelect, /size: density === "compact" \? "small" : "medium"/);
assert.match(webSelect, /onValueChange\(nextValue\) \{/);
assert.match(webSelect, /onQueryChange\(nextQuery\) \{/);
assert.match(webSelect, /onExpandedChange\(nextExpanded\) \{/);
assert.match(webTooltip, /createGuiTooltip\(/, "Web Tooltip reference must exercise createGuiTooltip");
assert.match(webTooltip, /onOpenChange: setOpen/);
assert.match(webTooltip, /content: "Reload the current workspace data\."/);
assert.match(webToast, /createGuiToast\(/, "Web Toast reference must exercise createGuiToast");
assert.match(webToast, /title: "Workspace updated"/);
assert.match(webToast, /message: "Your changes were saved\."/);
assert.match(webToast, /actionLabel: "Undo"/);
assert.match(webToast, /actionValue: "undo"/);
assert.match(webToast, /onOpenChange: setOpen/);
assert.match(webProgress, /createGuiProgress\(/, "Web Progress reference must exercise createGuiProgress");
assert.match(webProgress, /accessibilityLabel: "Workspace sync progress"/);
assert.match(webProgress, /label: "Sync progress: 68%"/);
assert.match(webProgress, /indeterminate: true/);
assert.match(webProgress, /accessibilityLabel: "Workspace sync activity"/);
assert.match(webProgress, /label: "Syncing workspace"/);
assert.match(webProgress, /variant: "circular"/);
assert.match(webSlider, /createGuiSlider\(/, "Web Slider reference must exercise createGuiSlider");
assert.match(webSlider, /let value = 40/);
assert.match(webSlider, /accessibilityLabel: "Workspace zoom"/);
assert.match(webSlider, /accessibilityValueText: "40 percent"/);
assert.match(webSlider, /density === "compact" \? "small" : "medium"/);
assert.match(webSlider, /onValueChange\(nextValue\) \{/);
assert.match(webSlider, /variant: "vertical"/);
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
  for (const sizeType of ["GuiButtonSize", "GuiCheckboxSize", "GuiDialogSize", "GuiInputSize", "GuiMenuSize", "GuiPanelSize", "GuiProgressSize", "GuiSliderSize", "GuiRadioSize", "GuiSelectSize", "GuiSwitchSize", "GuiTabsSize", "GuiToastSize", "GuiTooltipSize"]) {
    assert.match(source, new RegExp(`${sizeType}\\.SMALL`), `${name} compact reference must map ${sizeType} to its existing SMALL size`);
  }
  for (const component of ["GuiButton", "GuiCheckbox", "GuiInput", "GuiRadio", "GuiSelect", "GuiTabs", "GuiTooltip", "GuiToast", "GuiProgress", "GuiSlider", "GuiMenu", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
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
  assert.match(source, /accessibilityLabel = "Delivery channel"/, `${name} must expose the Select accessibility label`);
  assert.match(source, /onValueChange = \{ deliveryChannel = it \}/, `${name} must expose the controlled Select value flow`);
  assert.match(source, /accessibilityLabel = "Reference tabs"/, `${name} must expose the Tabs accessibility label`);
  assert.match(source, /GuiTabItem\(value = "metrics", label = "Metrics", disabled = true\)/, `${name} must expose a disabled Tabs item`);
  assert.match(source, /onValueChange = \{ activeSection = it \}/, `${name} must expose the controlled Tabs value flow`);
  assert.match(source, /content = "Reload the current workspace data\."/, `${name} must expose Tooltip content`);
  assert.match(source, /onOpenChange = \{ tooltipOpen = it \}/, `${name} must expose the controlled Tooltip open flow`);
  assert.match(source, /interactionSource = interactionSource/, `${name} must share the Tooltip trigger interaction source`);
  assert.match(source, /accessibilityLabel = "Workspace actions"/, `${name} must expose the Menu accessibility label`);
  assert.match(source, /GuiMenuItem\(value = "locked", label = "Locked action", disabled = true\)/, `${name} must expose a disabled Menu item`);
  assert.match(source, /onOpenChange = \{ menuOpen = it \}/, `${name} must expose the controlled Menu open flow`);
  assert.match(source, /onActivate = \{ lastMenuAction = it \}/, `${name} must expose the Menu activation flow`);
  assert.match(source, /label = "Show notification"/, `${name} must expose the Toast open flow`);
  assert.match(source, /title = "Workspace updated"/, `${name} must expose Toast title content`);
  assert.match(source, /message = "Your changes were saved\."/, `${name} must expose Toast message content`);
  assert.match(source, /onOpenChange = \{ toastOpen = it \}/, `${name} must expose the controlled Toast open flow`);
  assert.match(source, /actionLabel = "Undo"/, `${name} must expose the Toast action label`);
  assert.match(source, /actionValue = "undo"/, `${name} must expose the Toast action value`);
  assert.match(source, /durationMs = 0L/, `${name} must keep the reference Toast deterministic`);
  assert.match(source, /onActivate = \{ lastToastAction = it \}/, `${name} must expose the Toast activation flow`);
  assert.match(source, /value = 68\.0/, `${name} must expose determinate Progress value`);
  assert.match(source, /accessibilityLabel = "Workspace sync progress"/, `${name} must expose determinate Progress semantics`);
  assert.match(source, /label = "Sync progress: 68%"/, `${name} must expose determinate Progress label`);
  assert.match(source, /indeterminate = true/, `${name} must expose indeterminate Progress state`);
  assert.match(source, /accessibilityLabel = "Workspace sync activity"/, `${name} must expose indeterminate Progress semantics`);
  assert.match(source, /label = "Syncing workspace"/, `${name} must expose indeterminate Progress label`);
  assert.match(source, /variant = GuiProgressVariant\.CIRCULAR/, `${name} must expose circular Progress variant`);
  assert.match(source, /var sliderValue by remember \{ mutableStateOf\(40\.0\) \}/, `${name} must expose the shared Slider initial value`);
  assert.match(source, /accessibilityLabel = "Workspace zoom"/, `${name} must expose Slider semantics`);
  assert.match(source, /accessibilityValueText = "\$\{sliderValue\.toInt\(\)\} percent"/, `${name} must expose Slider value text`);
  assert.match(source, /onValueChange = \{ sliderValue = it \}/, `${name} must expose the controlled Slider value flow`);
}

assert.deepEqual(Object.keys(scenario.platformExtensions).sort(), ["composeAndroid", "composeDesktop", "web"]);

console.log("Cross-platform reference application parity tests passed with Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Menu extensions and validated Modern/Glass/Frosted/Spacey/Cyberpunk selection paths.");
