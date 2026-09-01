// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiPanel.kt", "utf8");

assert.match(source, /fun GuiPanel\(/);
assert.match(source, /componentId = "panel"/);
assert.match(source, /GuiPanelVariant = GuiPanelVariant\.STANDARD/);
assert.match(source, /GuiPanelSize = GuiPanelSize\.MEDIUM/);
assert.match(source, /accessibilityLabel: String = ""/);
assert.match(source, /content: @Composable BoxScope\.\(\) -> Unit/);
assert.match(source, /GuiPanelState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /activeStates = emptySet<String>\(\)/);
assert.match(source, /\.dropShadow\(/);
assert.match(source, /toComposeShadow\(\)/);
assert.match(source, /root\.shadow\?\.let/);
assert.match(source, /\.background\(/);
assert.match(source, /\.border\(/);
assert.match(source, /\.padding\(/);
assert.match(source, /if \(accessibilityLabel\.isBlank\(\)\)/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /\.clickable\(|\.toggleable\(|\.hoverable\(/);
assert.doesNotMatch(source, /Role\./);
assert.doesNotMatch(source, /animate[A-Z]|Animated/);

console.log("Compose Panel source contract tests passed, including neutral drop-shadow mapping.");
