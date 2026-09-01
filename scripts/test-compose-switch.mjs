// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiSwitch.kt", "utf8");

assert.match(source, /fun GuiSwitch\(/);
assert.match(source, /componentId = "switch"/);
assert.match(source, /GuiSwitchState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /if \(checked\) add\("checked"\)/);
assert.match(source, /\.toggleable\(/);
assert.match(source, /value = checked/);
assert.match(source, /role = Role\.Switch/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /Alignment\.CenterEnd/);
assert.match(source, /Alignment\.CenterStart/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);

console.log("Compose Basic Switch source contract tests passed.");
