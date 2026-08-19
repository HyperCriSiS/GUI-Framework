// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiDialog.kt", "utf8");

assert.match(source, /fun GuiDialog\(/);
assert.match(source, /open: Boolean/);
assert.match(source, /accessibilityLabel: String/);
assert.match(source, /dismissible: Boolean = true/);
assert.match(source, /onDismissRequest: \(\) -> Unit/);
assert.match(source, /content: @Composable BoxScope\.\(\) -> Unit/);
assert.match(source, /require\(accessibilityLabel\.isNotBlank\(\)\)/);
assert.match(source, /if \(!open\) return/);
assert.match(source, /componentId = "dialog"/);
assert.match(source, /GuiDialogVariant = GuiDialogVariant\.STANDARD/);
assert.match(source, /GuiDialogSize = GuiDialogSize\.MEDIUM/);
assert.match(source, /GuiDialogState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /activeStates = emptySet<String>\(\)/);
assert.match(source, /Dialog\(/);
assert.match(source, /DialogProperties\(/);
assert.match(source, /dismissOnBackPress = dismissible/);
assert.match(source, /dismissOnClickOutside = dismissible/);
assert.match(source, /if \(dismissible\) onDismissRequest\(\)/);
assert.match(source, /paneTitle = accessibilityLabel/);
assert.match(source, /\.background\(/);
assert.match(source, /\.border\(/);
assert.match(source, /\.padding\(/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /\.clickable\(|\.toggleable\(|\.hoverable\(/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);
assert.doesNotMatch(source, /windowTitle|securePolicy|decorFitsSystemWindows|windowType|windowToken/);

console.log("Compose Basic Dialog source contract tests passed.");
