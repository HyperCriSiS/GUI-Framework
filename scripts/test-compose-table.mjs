// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiTable.kt", "utf8");

assert.match(source, /data class GuiTableColumn/);
assert.match(source, /data class GuiTableRow/);
assert.match(source, /fun GuiTable\(/);
assert.match(source, /GuiTableVariant = GuiTableVariant\.PLAIN/);
assert.match(source, /GuiTableSize = GuiTableSize\.MEDIUM/);
assert.match(source, /GuiTableContract\.capabilities/);
assert.match(source, /resolveTableRecipe\("table"/);
assert.match(source, /CollectionInfo\(rowCount = rows\.size \+ 1, columnCount = columns\.size\)/);
assert.match(source, /heading\(\)/);
assert.match(source, /GUI table row cell count must match column count/);
assert.match(source, /GuiTableVariant\.GRIDLINED/);
assert.match(source, /guiTableInteriorLines/);
assert.doesNotMatch(source.slice(source.indexOf("fun GuiTable("), source.indexOf("@Composable\nprivate fun GuiDataGridRowContent")), /clickable|selectable|onValueChange|onRowActivate/, "Passive Table must not acquire interactive selection behavior");

assert.match(source, /data class GuiDataGridColumn/);
assert.match(source, /data class GuiDataGridRow/);
assert.match(source, /fun GuiDataGrid\(/);
assert.match(source, /GuiDataGridVariant = GuiDataGridVariant\.ROW_SELECTION/);
assert.match(source, /GuiDataGridSize = GuiDataGridSize\.MEDIUM/);
assert.match(source, /GuiDataGridContract\.capabilities/);
assert.match(source, /resolveTableRecipe\("data-grid"/);
assert.match(source, /GuiDataGridState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /collectIsPressedAsState\(\)/);
assert.match(source, /combinedClickable\(/);
assert.match(source, /focusRequester\(requester\)/);
assert.match(source, /Key\.DirectionDown/);
assert.match(source, /Key\.DirectionUp/);
assert.match(source, /Key\.MoveHome/);
assert.match(source, /Key\.MoveEnd/);
assert.match(source, /Key\.Spacebar/);
assert.match(source, /Key\.Enter, Key\.NumPadEnter/);
assert.match(source, /if \(!isSelected\) onValueChange\(row\.value\)/);
assert.match(source, /onDoubleClick = \{ onRowActivate\(row\.value\) \}/);
assert.match(source, /selected = isSelected/);
assert.match(source, /if \(!enabled\) disabled\(\)/);
assert.match(source, /GUI data-grid row values must be unique/);
assert.match(source, /guiGridSelectionIndicator\(indicator, isSelected\)/);
assert.doesNotMatch(source, /androidx\.compose\.material|androidx\.compose\.material3/);
assert.doesNotMatch(source, /animate|Animated/);

console.log("Compose Basic Table / Data Grid adapter source contract passed.");
