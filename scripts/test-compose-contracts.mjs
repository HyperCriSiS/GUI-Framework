// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-compose-contract-test.json";
const kotlinPath = "build/compose/GuiContracts-test.kt";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-compose/src/generate-contracts.mjs", irPath, kotlinPath], "Compose contract generator");

  const source = await readFile(kotlinPath, "utf8");
  assert.match(source, /enum class GuiRegisteredThemeId/);
  assert.match(source, /BASIC\("basic"\)/);
  assert.match(source, /MODERN\("modern"\)/);
  assert.match(source, /GLASS\("glass"\)/);
  assert.match(source, /FROSTED_GLASS\("frosted-glass"\)/);
  assert.match(source, /SPACEY\("spacey"\)/);
  assert.match(source, /CYBERPUNK\("cyberpunk"\)/);
  assert.match(source, /enum class GuiThemeId/);
  assert.match(source, /enum class GuiComponentId/);

  assert.match(source, /enum class GuiButtonVariant/);
  assert.match(source, /PRIMARY\("primary"\)/);
  assert.match(source, /data class GuiButtonProperties\(/);
  assert.match(source, /val disabled: Boolean = false/);
  assert.match(source, /val loading: Boolean = false/);
  assert.match(source, /GuiEventContract\("activate", "none"\)/);
  assert.match(source, /GuiContentSlot\("label", "text", true\)/);
  assert.match(source, /GuiComponentSemantics\("button", true\)/);

  assert.match(source, /enum class GuiCheckboxVariant/);
  assert.match(source, /enum class GuiCheckboxSize/);
  assert.match(source, /enum class GuiCheckboxState/);
  assert.match(source, /INDETERMINATE\("indeterminate"\)/);
  assert.match(source, /data class GuiCheckboxProperties\(/);
  assert.match(source, /val checked: Boolean/);
  assert.match(source, /val indeterminate: Boolean = false/);
  assert.match(source, /val accessibilityLabel: String/);
  assert.match(source, /GuiEventContract\("checkedChange", "boolean"\)/);
  assert.match(source, /GuiComponentSemantics\("checkbox", true\)/);

  assert.match(source, /enum class GuiRadioVariant/);
  assert.match(source, /enum class GuiRadioSize/);
  assert.match(source, /enum class GuiRadioState/);
  assert.match(source, /SELECTED\("selected"\)/);
  assert.match(source, /data class GuiRadioProperties\(/);
  assert.match(source, /val selected: Boolean/);
  assert.match(source, /val accessibilityLabel: String/);
  assert.match(source, /val groupName: String/);
  assert.match(source, /GuiEventContract\("selectedChange", "boolean"\)/);
  assert.match(source, /GuiComponentSemantics\("radio", true\)/);

  assert.match(source, /enum class GuiSelectVariant/);
  assert.match(source, /enum class GuiSelectSize/);
  assert.match(source, /enum class GuiSelectState/);
  assert.match(source, /EXPANDED\("expanded"\)/);
  assert.match(source, /data class GuiSelectProperties\(/);
  assert.match(source, /val value: String/);
  assert.match(source, /val query: String = ""/);
  assert.match(source, /val editable: Boolean = false/);
  assert.match(source, /val expanded: Boolean = false/);
  assert.match(source, /GuiEventContract\("expandedChange", "boolean"\)/);
  assert.match(source, /GuiContentSlot\("options", "children", true\)/);
  assert.match(source, /GuiComponentSemantics\("combobox", true\)/);
  assert.match(source, /enum class GuiTabsVariant/);
  assert.match(source, /enum class GuiTabsSize/);
  assert.match(source, /enum class GuiTabsState/);
  assert.match(source, /SELECTED\("selected"\)/);
  assert.match(source, /data class GuiTabsProperties\(/);
  assert.match(source, /val value: String/);
  assert.match(source, /val accessibilityLabel: String = ""/);
  assert.match(source, /val disabled: Boolean = false/);
  assert.match(source, /GuiEventContract\("valueChange", "string"\)/);
  assert.match(source, /GuiContentSlot\("tab", "children", true\)/);
  assert.match(source, /GuiContentSlot\("panel", "children", true\)/);
  assert.match(source, /GuiComponentSemantics\("tablist", true\)/);
  assert.match(source, /enum class GuiTooltipVariant/);
  assert.match(source, /enum class GuiTooltipSize/);
  assert.match(source, /enum class GuiTooltipState/);
  assert.match(source, /data class GuiTooltipProperties\(/);
  assert.match(source, /val open: Boolean/);
  assert.match(source, /val placement: String = "top"/);
  assert.match(source, /GuiEventContract\("openChange", "boolean"\)/);
  assert.match(source, /GuiContentSlot\("trigger", "children", true\)/);
  assert.match(source, /GuiContentSlot\("content", "text", true\)/);
  assert.match(source, /GuiComponentSemantics\("tooltip", false\)/);
  assert.match(source, /enum class GuiMenuVariant/);
  assert.match(source, /enum class GuiMenuSize/);
  assert.match(source, /enum class GuiMenuState/);
  assert.match(source, /EXPANDED\("expanded"\)/);
  assert.match(source, /data class GuiMenuProperties\(/);
  assert.match(source, /val open: Boolean/);
  assert.match(source, /val accessibilityLabel: String = ""/);
  assert.match(source, /val disabled: Boolean = false/);
  assert.match(source, /GuiEventContract\("openChange", "boolean"\)/);
  assert.match(source, /GuiEventContract\("activate", "string"\)/);
  assert.match(source, /GuiContentSlot\("trigger", "children", false\)/);
  assert.match(source, /GuiContentSlot\("item", "children", true\)/);
  assert.match(source, /GuiComponentSemantics\("menu", false\)/);

  assert.match(source, /enum class GuiDialogVariant/);
  assert.match(source, /enum class GuiDialogSize/);
  assert.match(source, /enum class GuiDialogState/);
  assert.match(source, /data class GuiDialogProperties\(/);
  assert.match(source, /val open: Boolean/);
  assert.match(source, /val accessibilityLabel: String/);
  assert.match(source, /val dismissible: Boolean = true/);
  assert.match(source, /GuiEventContract\("dismissRequest", "none"\)/);
  assert.match(source, /GuiContentSlot\("children", "children", true\)/);
  assert.match(source, /GuiComponentSemantics\("dialog", true\)/);

  assert.match(source, /enum class GuiInputVariant/);
  assert.match(source, /STANDARD\("standard"\)/);
  assert.match(source, /enum class GuiInputSize/);
  assert.match(source, /enum class GuiInputState/);
  assert.match(source, /ERROR\("error"\)/);
  assert.match(source, /data class GuiInputProperties\(/);
  assert.match(source, /val value: String/);
  assert.match(source, /val placeholder: String = ""/);
  assert.match(source, /val accessibilityLabel: String = ""/);
  assert.match(source, /val disabled: Boolean = false/);
  assert.match(source, /val readOnly: Boolean = false/);
  assert.match(source, /val error: Boolean = false/);
  assert.match(source, /GuiEventContract\("valueChange", "string"\)/);
  assert.match(source, /GuiComponentSemantics\("textbox", true\)/);

  assert.match(source, /enum class GuiSwitchVariant/);
  assert.match(source, /enum class GuiSwitchSize/);
  assert.match(source, /enum class GuiSwitchState/);
  assert.match(source, /CHECKED\("checked"\)/);
  assert.match(source, /data class GuiSwitchProperties\(/);
  assert.match(source, /val checked: Boolean/);
  assert.match(source, /val accessibilityLabel: String/);
  assert.match(source, /GuiEventContract\("checkedChange", "boolean"\)/);
  assert.match(source, /GuiComponentSemantics\("switch", true\)/);

  assert.match(source, /enum class GuiPanelVariant/);
  assert.match(source, /enum class GuiPanelSize/);
  assert.match(source, /enum class GuiPanelState/);
  assert.match(source, /data class GuiPanelProperties\(/);
  assert.match(source, /val accessibilityLabel: String = ""/);
  assert.match(source, /GuiContentSlot\("children", "children", true\)/);
  assert.match(source, /GuiComponentSemantics\("container", true\)/);

  assert.doesNotMatch(source, /reference-dark|reference-light/, "Development palette IDs must not leak into Kotlin component contracts");
  assert.doesNotMatch(source, /HTMLElement|document\.|onClick|Composable|Modifier/, "Neutral Kotlin contracts must not contain Web or Compose implementation APIs");

  console.log("Kotlin contract generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(kotlinPath, { force: true })]);
}
