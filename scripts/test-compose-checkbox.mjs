// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiCheckbox.kt", "utf8");

assert.match(source, /fun GuiCheckbox\(/);
assert.match(source, /componentId = "checkbox"/);
assert.match(source, /GuiCheckboxState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /if \(indeterminate\) add\("indeterminate"\) else if \(checked\) add\("checked"\)/);
assert.match(source, /ToggleableState\.Indeterminate/);
assert.match(source, /ToggleableState\.On/);
assert.match(source, /ToggleableState\.Off/);
assert.match(source, /\.triStateToggleable\(/);
assert.match(source, /state = toggleState/);
assert.match(source, /enabled = enabled/);
assert.match(source, /role = Role\.Checkbox/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /onClick = \{ onCheckedChange\(if \(indeterminate\) true else !checked\) \}/);
assert.match(source, /indeterminate -> "−"/);
assert.match(source, /checked -> "✓"/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);

console.log("Compose Basic Checkbox source contract tests passed with native tri-state semantics.");
