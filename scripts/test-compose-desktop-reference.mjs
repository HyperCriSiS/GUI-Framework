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
assert.match(source, /theme: GuiThemeId = GuiThemeId\.BASIC/);
assert.match(source, /paletteId: String = "reference-dark"/);
assert.match(source, /GuiTheme\(/);
assert.match(source, /theme = theme/);
assert.match(source, /paletteId = paletteId/);
for (const component of ["GuiButton", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
  assert.match(source, new RegExp(`${component}\\(`), `Desktop reference must exercise ${component}`);
}
assert.match(source, /mutableStateOf/);
assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/);
assert.doesNotMatch(source, /androidx\.compose\.material/);

console.log("Compose Desktop reference application source contract tests passed with Basic/Modern/Glass theme selection.");
