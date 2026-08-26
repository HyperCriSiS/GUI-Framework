// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiSelect.kt", "utf8");

assert.match(source, /data class GuiSelectOption\(/);
assert.match(source, /fun GuiSelect\(/);
assert.match(source, /options: List<GuiSelectOption>/);
assert.match(source, /value: String/);
assert.match(source, /onValueChange: \(String\) -> Unit/);
assert.match(source, /query: String = ""/);
assert.match(source, /onQueryChange: \(String\) -> Unit = \{\}/);
assert.match(source, /editable: Boolean = false/);
assert.match(source, /expanded: Boolean = false/);
assert.match(source, /onExpandedChange: \(Boolean\) -> Unit = \{\}/);
assert.match(source, /componentId = "select"/);
assert.match(source, /GuiSelectState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /if \(expanded && enabled\) add\("expanded"\)/);
assert.match(source, /BasicTextField\(/);
assert.match(source, /PopupPositionProvider/);
assert.match(source, /Popup\(/);
assert.match(source, /onDismissRequest = \{ onExpandedChange\(false\) \}/);
assert.match(source, /heightIn\(max = 240\.dp\)/);
assert.match(source, /verticalScroll\(rememberScrollState\(\)\)/);
assert.match(source, /readOnly = !editable/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /onPreviewKeyEvent/);
assert.match(source, /Key\.DirectionDown/);
assert.match(source, /Key\.DirectionUp/);
assert.match(source, /Key\.Enter, Key\.NumPadEnter/);
assert.match(source, /Key\.Escape/);
assert.match(source, /onValueChange\(option\.value\)/);
assert.match(source, /onExpandedChange\(false\)/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);

console.log("Compose Basic Select / ComboBox source contract tests passed.");
