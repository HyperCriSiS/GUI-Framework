// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiButton.kt", "utf8");

assert.match(source, /fun GuiButton\(/);
assert.match(source, /label: String/);
assert.match(source, /onActivate: \(\) -> Unit/);
assert.match(source, /disabled: Boolean = false/);
assert.match(source, /loading: Boolean = false/);
assert.match(source, /collectIsPressedAsState\(\)/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /val enabled = !disabled && !loading/);
assert.match(source, /componentId = "button"/);
assert.match(source, /resolveGuiCapabilityRecipe\(/);
assert.match(source, /if \(hovered && enabled\) add\("hover"\)/);
assert.match(source, /if \(focused && enabled\) add\("focus"\)/);
assert.match(source, /if \(pressed && enabled\) add\("pressed"\)/);
assert.match(source, /if \(!enabled\) add\("disabled"\)/);
assert.match(source, /if \(loading\) add\("loading"\)/);
assert.match(source, /\.clickable\(/);
assert.match(source, /enabled = enabled/);
assert.match(source, /role = Role\.Button/);
assert.match(source, /BasicText\(text = label/);
assert.doesNotMatch(source, /contentDescription = label/, "Visible button text should remain the accessible name without a duplicate content description");
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);

console.log("Compose Basic Button source contract tests passed.");
