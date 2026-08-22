// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("examples/compose-desktop/src/main/kotlin/Main.kt", "utf8");

assert.match(source, /Window\(/);
assert.match(source, /GuiTheme\(/);
assert.match(source, /GuiThemeId\.BASIC/);
assert.match(source, /"modern" -> GuiThemeId\.MODERN/);
assert.match(source, /"glass" -> GuiThemeId\.GLASS/);
assert.match(source, /"frosted-glass" -> GuiThemeId\.FROSTED_GLASS/);
assert.match(source, /theme: GuiThemeId = GuiThemeId\.BASIC/);
assert.match(source, /paletteId: String = "reference-dark"/);
assert.match(source, /theme = theme/);
assert.match(source, /paletteId = paletteId/);
assert.match(source, /GuiInput\(/);
assert.match(source, /GuiSwitch\(/);
assert.match(source, /GuiButton\(/);
assert.match(source, /GuiPanel\(/);
assert.match(source, /GuiDialog\(/);
assert.match(source, /ReferenceDensity\.Compact/);
assert.match(source, /GuiButtonSize\.SMALL/);
assert.match(source, /GuiDialogSize\.SMALL/);
assert.match(source, /GuiInputSize\.SMALL/);
assert.match(source, /GuiPanelSize\.SMALL/);
assert.match(source, /GuiSwitchSize\.SMALL/);

console.log("Compose Desktop reference application source contract tests passed with Basic/Modern/Glass/Frosted Glass theme selection.");
