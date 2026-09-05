// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiScrollContainer.kt", "utf8");

assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.match(source, /GuiScrollContainerContract/);
assert.match(source, /GuiScrollContainerVariant/);
assert.match(source, /GuiScrollContainerSize/);
assert.match(source, /GuiScrollContainerState/);
assert.match(source, /fun GuiScrollContainer\(/);
assert.match(source, /verticalScrollState: ScrollState = rememberScrollState\(\)/);
assert.match(source, /horizontalScrollState: ScrollState = rememberScrollState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /focusable\([\s\S]*enabled = keyboardFocusable/);
assert.match(source, /if \(focused && keyboardFocusable\) add\("focus"\)/);
assert.match(source, /statePriority = GuiScrollContainerState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /GuiScrollContainerVariant\.VERTICAL -> viewportModifier\.verticalScroll\(verticalScrollState\)/);
assert.match(source, /GuiScrollContainerVariant\.HORIZONTAL -> viewportModifier\.horizontalScroll\(horizontalScrollState\)/);
assert.match(source, /GuiScrollContainerVariant\.BOTH -> viewportModifier[\s\S]*verticalScroll\(verticalScrollState\)[\s\S]*horizontalScroll\(horizontalScrollState\)/);
assert.match(source, /if \(accessibilityLabel\.isNotBlank\(\)\) contentDescription = accessibilityLabel/);
assert.match(source, /isTraversalGroup = true/);
assert.match(source, /contentStyle\.paddingHorizontal/);
assert.match(source, /contentStyle\.paddingVertical/);
assert.match(source, /guiScrollFocusOutline\(root\.outline, radius\)/);
assert.doesNotMatch(source, /animateScrollTo|scrollTo\s*\(/);
assert.doesNotMatch(source, /LazyColumn|LazyRow|LazyVerticalGrid|LazyHorizontalGrid/);

console.log("Compose Basic Scroll Container source contract tests passed.");
