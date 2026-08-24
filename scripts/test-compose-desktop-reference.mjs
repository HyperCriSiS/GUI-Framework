// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = "examples/compose-desktop/src/main/kotlin/Main.kt";
const source = await readFile(path, "utf8");

assert.match(source, /fun main\(\) = application \{/);
assert.match(source, /Window\(/);
assert.match(source, /referenceThemeFromSystemProperty\(\)/);
assert.match(source, /"modern" -> GuiThemeId\.MODERN/);
assert.match(source, /"glass" -> GuiThemeId\.GLASS/);
assert.match(source, /"frosted-glass" -> GuiThemeId\.FROSTED_GLASS/);
assert.match(source, /"spacey" -> GuiThemeId\.SPACEY/);
assert.match(source, /"cyberpunk" -> GuiThemeId\.CYBERPUNK/);
assert.match(source, /theme: GuiThemeId = GuiThemeId\.BASIC/);
assert.match(source, /paletteId: String = "reference-dark"/);
assert.match(source, /GuiTheme\(/);
assert.match(source, /theme = theme/);
assert.match(source, /paletteId = paletteId/);
for (const component of ["GuiButton", "GuiCheckbox", "GuiRadio", "GuiRadioGroup", "GuiSelect", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
  assert.match(source, new RegExp(`${component}\\(`), `Desktop reference must exercise ${component}`);
}
assert.match(source, /GuiCheckboxSize\.SMALL/);
assert.match(source, /GuiRadioSize\.SMALL/);
assert.match(source, /GuiSelectSize\.SMALL/);
assert.match(source, /includeExtendedComponents = theme == GuiThemeId\.BASIC/);
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

console.log("Compose Desktop reference application source contract tests passed with Basic Checkbox/Radio/Select coverage and Phase 5 theme selection isolation.");
