// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-web-contract-test.json";
const contractsPath = "build/web/contracts-test.ts";

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  run(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(process.execPath, ["packages/adapter-web/src/generate-contracts.mjs", irPath, contractsPath], "Web contract generator");

  const source = await readFile(contractsPath, "utf8");
  assert.match(source, /export const guiRegisteredThemeIds = \["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"\] as const;/);
  assert.match(source, /export type GuiRegisteredThemeId = \(typeof guiRegisteredThemeIds\)\[number\];/);
  assert.match(source, /export const guiThemeIds = \["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"\] as const;/);
  assert.match(source, /export type GuiThemeId = \(typeof guiThemeIds\)\[number\];/);
  assert.match(source, /export const guiComponentIds = \["button", "checkbox", "dialog", "input", "panel", "radio", "select", "switch", "tabs", "tooltip"\] as const;/);

  assert.match(source, /export type GuiButtonVariant = \(typeof guiButtonContract\.variants\)\[number\];/);
  assert.match(source, /variants: \["primary", "secondary", "ghost", "danger"\] as const,/);
  assert.match(source, /states: \["default", "hover", "focus", "pressed", "disabled", "loading"\] as const,/);
  assert.match(source, /"id": "activate"/);
  assert.match(source, /"id": "disabled"/);
  assert.match(source, /"kind": "text"/);

  assert.match(source, /export const guiCheckboxContract = \{/);
  assert.match(source, /export type GuiCheckboxVariant = \(typeof guiCheckboxContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiCheckboxSize = \(typeof guiCheckboxContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiCheckboxState = \(typeof guiCheckboxContract\.states\)\[number\];/);
  assert.match(source, /export const guiRadioContract = \{/);
  assert.match(source, /export type GuiRadioVariant = \(typeof guiRadioContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiRadioSize = \(typeof guiRadioContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiRadioState = \(typeof guiRadioContract\.states\)\[number\];/);
  assert.match(source, /states: \["default", "hover", "focus", "pressed", "selected", "disabled"\] as const,/);
  assert.match(source, /"id": "selected"/);
  assert.match(source, /"id": "groupName"/);
  assert.match(source, /"id": "selectedChange"/);
  assert.match(source, /"role": "radio"/);
  assert.match(source, /export const guiSelectContract = \{/);
  assert.match(source, /export type GuiSelectVariant = \(typeof guiSelectContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiSelectSize = \(typeof guiSelectContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiSelectState = \(typeof guiSelectContract\.states\)\[number\];/);
  assert.match(source, /states: \["default", "hover", "focus", "expanded", "disabled", "error"\] as const,/);
  assert.match(source, /"id": "editable"/);
  assert.match(source, /"id": "query"/);
  assert.match(source, /"id": "expandedChange"/);
  assert.match(source, /"id": "options"/);
  assert.match(source, /"role": "combobox"/);
  assert.match(source, /export const guiTabsContract = \{/);
  assert.match(source, /export type GuiTabsVariant = \(typeof guiTabsContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiTabsSize = \(typeof guiTabsContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiTabsState = \(typeof guiTabsContract\.states\)\[number\];/);
  assert.match(source, /states: \["default", "hover", "focus", "pressed", "selected", "disabled"\] as const,/);
  assert.match(source, /"id": "value"/);
  assert.match(source, /"id": "valueChange"/);
  assert.match(source, /"id": "tab"/);
  assert.match(source, /"id": "panel"/);
  assert.match(source, /"role": "tablist"/);
  assert.match(source, /export const guiTooltipContract = \{/);
  assert.match(source, /export type GuiTooltipVariant = \(typeof guiTooltipContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiTooltipSize = \(typeof guiTooltipContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiTooltipState = \(typeof guiTooltipContract\.states\)\[number\];/);
  assert.match(source, /"id": "open"/);
  assert.match(source, /"id": "placement"/);
  assert.match(source, /"id": "openChange"/);
  assert.match(source, /"id": "trigger"/);
  assert.match(source, /"id": "content"/);
  assert.match(source, /"role": "tooltip"/);
  assert.match(source, /states: \["default", "hover", "focus", "pressed", "checked", "indeterminate", "disabled"\] as const,/);
  assert.match(source, /"id": "indeterminate"/);
  assert.match(source, /"role": "checkbox"/);

  assert.match(source, /export const guiDialogContract = \{/);
  assert.match(source, /export type GuiDialogVariant = \(typeof guiDialogContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiDialogSize = \(typeof guiDialogContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiDialogState = \(typeof guiDialogContract\.states\)\[number\];/);
  assert.match(source, /states: \["default"\] as const,/);
  assert.match(source, /"id": "open"/);
  assert.match(source, /"id": "accessibilityLabel"/);
  assert.match(source, /"id": "dismissible"/);
  assert.match(source, /"id": "dismissRequest"/);
  assert.match(source, /"payload": "none"/);
  assert.match(source, /"id": "children"/);
  assert.match(source, /"kind": "children"/);
  assert.match(source, /"role": "dialog"/);

  assert.match(source, /export const guiInputContract = \{/);
  assert.match(source, /export type GuiInputVariant = \(typeof guiInputContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiInputSize = \(typeof guiInputContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiInputState = \(typeof guiInputContract\.states\)\[number\];/);
  assert.match(source, /variants: \["standard"\] as const,/);
  assert.match(source, /states: \["default", "hover", "focus", "disabled", "error"\] as const,/);
  assert.match(source, /"id": "value"/);
  assert.match(source, /"id": "placeholder"/);
  assert.match(source, /"id": "readOnly"/);
  assert.match(source, /"id": "error"/);
  assert.match(source, /"id": "valueChange"/);
  assert.match(source, /"payload": "string"/);
  assert.match(source, /"role": "textbox"/);

  assert.match(source, /export const guiSwitchContract = \{/);
  assert.match(source, /export type GuiSwitchVariant = \(typeof guiSwitchContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiSwitchSize = \(typeof guiSwitchContract\.sizes\)\[number\];/);
  assert.match(source, /export type GuiSwitchState = \(typeof guiSwitchContract\.states\)\[number\];/);
  assert.match(source, /states: \["default", "hover", "focus", "pressed", "checked", "disabled"\] as const,/);
  assert.match(source, /"id": "checked"/);
  assert.match(source, /"id": "accessibilityLabel"/);
  assert.match(source, /"id": "checkedChange"/);
  assert.match(source, /"payload": "boolean"/);
  assert.match(source, /"role": "switch"/);

  assert.match(source, /export const guiPanelContract = \{/);
  assert.match(source, /export type GuiPanelVariant = \(typeof guiPanelContract\.variants\)\[number\];/);
  assert.match(source, /export type GuiPanelSize = \(typeof guiPanelContract\.sizes\)\[number\];/);
  assert.match(source, /states: \["default"\] as const,/);
  assert.match(source, /"id": "accessibilityLabel"/);
  assert.match(source, /"id": "children"/);
  assert.match(source, /"kind": "children"/);
  assert.match(source, /"role": "container"/);

  assert.match(source, /export const guiCapabilityProfiles = \{/);
  assert.match(source, /"basic": \{/);
  assert.match(source, /"modern": \{/);
  assert.match(source, /"glass": \{/);
  assert.match(source, /"frosted-glass": \{/);
  assert.match(source, /"spacey": \{/);
  assert.match(source, /"cyberpunk": \{/);
  assert.match(source, /"button": \{/);
  assert.match(source, /"optional": \[/);
  assert.match(source, /"advancedBlendModes"/);
  assert.match(source, /"shaderEffects"/);
  assert.match(source, /"fallbackOrder": \[/);
  assert.match(source, /"standard"/);
  assert.match(source, /"minimal"/);
  assert.match(source, /"fallbacks": \{\}/);
  assert.match(source, /export type GuiCapabilityProfiles = typeof guiCapabilityProfiles;/);

  assert.doesNotMatch(source, /reference-dark|reference-light/, "Development palette IDs must not become public Web component contract types");

  console.log("Web TypeScript contract generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(contractsPath, { force: true })]);
}
