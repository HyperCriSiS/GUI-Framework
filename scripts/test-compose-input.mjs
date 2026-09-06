// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiInput.kt", "utf8");

assert.match(source, /fun GuiInput\(/);
assert.match(source, /value: String/);
assert.match(source, /onValueChange: \(String\) -> Unit/);
assert.match(source, /accessibilityLabel: String = ""/);
assert.match(source, /disabled: Boolean = false/);
assert.match(source, /readOnly: Boolean = false/);
assert.match(source, /error: Boolean = false/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /componentId = "input"/);
assert.match(source, /resolveGuiCapabilityRecipe\(/);
assert.match(source, /if \(hovered && enabled\) add\("hover"\)/);
assert.match(source, /if \(focused && enabled\) add\("focus"\)/);
assert.match(source, /if \(!enabled\) add\("disabled"\)/);
assert.match(source, /if \(error\) add\("error"\)/);
assert.match(source, /if \(accessibilityLabel\.isNotBlank\(\)\)/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /TextFieldValue\(text = value\)/);
assert.match(source, /SideEffect \{/);
assert.match(source, /if \(textFieldValue\.text != value\)/);
assert.match(source, /composition = null/);
assert.match(source, /value = textFieldValue/);
assert.match(source, /textFieldValue = nextValue/);
assert.match(source, /if \(nextValue\.text != value\) onValueChange\(nextValue\.text\)/);
assert.match(source, /BasicTextField\(/);
assert.match(source, /enabled = enabled/);
assert.match(source, /readOnly = readOnly/);
assert.match(source, /singleLine = true/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);

console.log("Compose Basic Input source contract tests passed.");
