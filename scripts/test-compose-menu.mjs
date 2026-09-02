// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiMenu.kt", "utf8");

assert.match(source, /data class GuiMenuItem\(/);
assert.match(source, /data class GuiMenuContextOffset\(/);
assert.match(source, /fun GuiMenu\(/);
assert.match(source, /open: Boolean/);
assert.match(source, /items: List<GuiMenuItem>/);
assert.match(source, /onOpenChange: \(Boolean\) -> Unit/);
assert.match(source, /onActivate: \(String\) -> Unit/);
assert.match(source, /GuiMenuVariant = GuiMenuVariant\.STANDARD/);
assert.match(source, /GuiMenuSize = GuiMenuSize\.MEDIUM/);
assert.match(source, /GuiMenuContract\.capabilities/);
assert.match(source, /componentId = "menu"/);
assert.match(source, /GuiMenuState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /PopupProperties\(focusable = true\)/);
assert.match(source, /GuiMenuPopupPositionProvider/);
assert.match(source, /contextOffset: GuiMenuContextOffset\? = null/);
assert.match(source, /FocusRequester/);
assert.match(source, /focusRequesters\[activeIndex\]\.requestFocus\(\)/);
assert.match(source, /Key\.DirectionDown/);
assert.match(source, /Key\.DirectionUp/);
assert.match(source, /Key\.MoveHome/);
assert.match(source, /Key\.MoveEnd/);
assert.match(source, /Key\.Escape/);
assert.match(source, /Key\.Enter/);
assert.match(source, /Key\.Spacebar/);
assert.match(source, /items\.filterNot \{ it\.disabled \}/);
assert.match(source, /onActivate\(item\.value\)/);
assert.match(source, /onOpenChange\(false\)/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /\.focusable\(enabled = !item\.disabled/);
assert.match(source, /\.clickable\(/);
assert.match(source, /disabled\(\)/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /AnimatedVisibility|animate[A-Z]|Transition\(/);

console.log("Compose Basic Menu / Context Menu source contract tests passed.");
