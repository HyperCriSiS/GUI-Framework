// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiTabs.kt", "utf8");

assert.match(source, /data class GuiTabItem\(/);
assert.match(source, /fun GuiTabs\(/);
assert.match(source, /GuiTabsVariant = GuiTabsVariant\.STANDARD/);
assert.match(source, /GuiTabsSize = GuiTabsSize\.MEDIUM/);
assert.match(source, /GuiTabsContract\.capabilities/);
assert.match(source, /componentId = "tabs"/);
assert.match(source, /resolveGuiVisualRecipe\(/);
assert.match(source, /GuiTabsState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /selectableGroup\(\)/);
assert.match(source, /role = Role\.Tab/);
assert.match(source, /\.selectable\(/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /collectIsPressedAsState\(\)/);
assert.match(source, /Key\.DirectionRight/);
assert.match(source, /Key\.DirectionLeft/);
assert.match(source, /Key\.MoveHome/);
assert.match(source, /Key\.MoveEnd/);
assert.match(source, /focusRequesters\[target\]\.requestFocus\(\)/);
assert.match(source, /onClick = \{ if \(!selected\) onValueChange\(item\.value\) \}/);
assert.match(source, /item\.disabled/);
assert.match(source, /GUI tab values must be unique/);
assert.match(source, /panelContent\(selectedItem\)/);
assert.match(source, /guiTabsIndicator\(indicator, selected\)/);
assert.doesNotMatch(source, /androidx\.compose\.material|androidx\.compose\.material3/);
assert.doesNotMatch(source, /animate|Animated/);

console.log("Compose Basic Tabs adapter source contract passed.");
