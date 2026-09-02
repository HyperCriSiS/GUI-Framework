// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiTooltip.kt", "utf8");

assert.match(source, /enum class GuiTooltipPlacement/);
assert.match(source, /fun GuiTooltip\(/);
assert.match(source, /GuiTooltipVariant = GuiTooltipVariant\.STANDARD/);
assert.match(source, /GuiTooltipSize = GuiTooltipSize\.MEDIUM/);
assert.match(source, /GuiTooltipContract\.capabilities/);
assert.match(source, /componentId = "tooltip"/);
assert.match(source, /GuiTooltipState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /PopupPositionProvider/);
assert.match(source, /GuiTooltipPositionProvider/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /LaunchedEffect\(hovered\)/);
assert.match(source, /onOpenChange\(false\)/);
assert.match(source, /Key\.Escape/);
assert.match(source, /BasicText\(text = content/);
assert.doesNotMatch(source, /androidx\.compose\.material|androidx\.compose\.material3/);
assert.doesNotMatch(source, /animate|Animated/);

console.log("Compose Basic Tooltip adapter source contract passed.");
