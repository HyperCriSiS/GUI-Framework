// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiNavigation.kt", "utf8");

assert.match(source, /data class GuiNavigationItem\(/);
assert.match(source, /fun GuiNavigation\(/);
assert.match(source, /GuiNavigationVariant = GuiNavigationVariant\.HORIZONTAL/);
assert.match(source, /GuiNavigationSize = GuiNavigationSize\.MEDIUM/);
assert.match(source, /GuiNavigationContract\.capabilities/);
assert.match(source, /componentId = "navigation"/);
assert.match(source, /resolveGuiVisualRecipe\(/);
assert.match(source, /GuiNavigationState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /selectableGroup\(\)/);
assert.match(source, /role = Role\.Tab/);
assert.match(source, /\.selectable\(/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /collectIsPressedAsState\(\)/);
assert.match(source, /GuiNavigationVariant\.VERTICAL/);
assert.match(source, /Modifier\.fillMaxWidth\(\)/);
assert.match(source, /Modifier\.weight\(1f\)/);
assert.match(source, /if \(!selected\) onValueChange\(item\.value\)/);
assert.match(source, /item\.disabled/);
assert.match(source, /GUI navigation item values must be unique/);
assert.match(source, /requires a label or accessibilityLabel/);
assert.match(source, /guiNavigationIndicator\(indicator, selected, variant\)/);
assert.match(source, /contentDescription = item\.accessibilityLabel/);
assert.doesNotMatch(source, /androidx\.compose\.material|androidx\.compose\.material3/);
assert.doesNotMatch(source, /animate|Animated/);

console.log("Compose Basic Navigation adapter source contract passed.");
