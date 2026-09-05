// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiTree.kt", "utf8");

assert.match(source, /data class GuiTreeItem\(/);
assert.match(source, /val expanded: Boolean = false/);
assert.match(source, /val branch: Boolean = false/);
assert.match(source, /val children: List<GuiTreeItem> = emptyList\(\)/);
assert.match(source, /fun GuiTree\(/);
assert.match(source, /GuiTreeVariant = GuiTreeVariant\.STANDARD/);
assert.match(source, /GuiTreeSize = GuiTreeSize\.MEDIUM/);
assert.match(source, /GuiTreeContract\.capabilities/);
assert.match(source, /componentId = "tree"/);
assert.match(source, /GuiTreeState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /flattenVisibleTree\(/);
assert.match(source, /focusProperties \{ canFocus = enabled && rovingValue == item\.value \}/);
assert.match(source, /Key\.DirectionDown/);
assert.match(source, /Key\.DirectionUp/);
assert.match(source, /Key\.MoveHome/);
assert.match(source, /Key\.MoveEnd/);
assert.match(source, /Key\.DirectionRight/);
assert.match(source, /Key\.DirectionLeft/);
assert.match(source, /Key\.Spacebar/);
assert.match(source, /Key\.Enter, Key\.NumPadEnter/);
assert.match(source, /onExpandedChange\(item\.value\)/);
assert.match(source, /onNodeActivate\(item\.value\)/);
assert.match(source, /collapse\(action = \{ onExpandedChange\(item\.value\); true \}\)/);
assert.match(source, /expand\(action = \{ onExpandedChange\(item\.value\); true \}\)/);
assert.match(source, /selected = isSelected/);
assert.match(source, /collectionInfo = CollectionInfo\(rowCount = visibleNodes\.size, columnCount = 1\)/);
assert.match(source, /collectionItemInfo = CollectionItemInfo\(/);
assert.match(source, /GUI tree item values must be unique/);
assert.match(source, /GuiTreeClickTracker/);
assert.match(source, /doubleTapTimeoutMillis/);
assert.match(source, /if \(activate\) onNodeActivate\(itemValue\)/);
assert.doesNotMatch(source, /androidx\.compose\.material|androidx\.compose\.material3/);
assert.doesNotMatch(source, /animate|Animated/);

console.log("Compose Basic Tree / Hierarchy adapter source contract passed.");
