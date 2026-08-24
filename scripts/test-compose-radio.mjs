// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiRadio.kt", "utf8");
assert.match(source, /fun GuiRadioGroup\(/);
assert.match(source, /modifier = modifier\.selectableGroup\(\)/);
assert.match(source, /CompositionLocalProvider\(LocalGuiRadioGroupName provides groupName\)/);
assert.match(source, /fun GuiRadio\(/);
assert.match(source, /groupName: String/);
assert.match(source, /groupName == parentGroupName/);
assert.match(source, /componentId = "radio"/);
assert.match(source, /GuiRadioState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /if \(selected\) add\("selected"\)/);
assert.match(source, /\.selectable\(/);
assert.match(source, /selected = selected/);
assert.match(source, /role = Role\.RadioButton/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /onClick = \{ if \(!selected\) onSelectedChange\(true\) \}/);
assert.match(source, /BasicText\(text = "●"/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);
console.log("Compose Basic Radio source contract tests passed with native selection semantics.");
