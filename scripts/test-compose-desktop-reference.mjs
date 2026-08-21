// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const path = "examples/compose-desktop/src/main/kotlin/Main.kt";
const source = await readFile(path, "utf8");

assert.match(source, /fun main\(\) = application \{/);
assert.match(source, /Window\(/);
assert.match(source, /GuiTheme\(/);
assert.match(source, /GuiThemeId\.BASIC/);
assert.match(source, /paletteId = "reference-dark"/);
for (const component of ["GuiButton", "GuiInput", "GuiSwitch", "GuiPanel", "GuiDialog"]) {
  assert.match(source, new RegExp(`${component}\\(`), `Desktop reference must exercise ${component}`);
}
assert.match(source, /mutableStateOf/);
assert.match(source, /onDismissRequest = \{ dialogOpen = false \}/);
assert.doesNotMatch(source, /androidx\.compose\.material/);

console.log("Compose Desktop reference application source contract tests passed.");
