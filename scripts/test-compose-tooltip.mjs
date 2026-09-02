// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiTooltip.kt", "utf8");

assert.match(source, /enum class GuiTooltipPlacement/);
for (const mapping of ["TOP(\"top\")", "BOTTOM(\"bottom\")", "LEFT(\"left\")", "RIGHT(\"right\")"]) {
  assert.ok(source.includes(mapping), `Compose Tooltip must expose neutral placement ${mapping}`);
}
assert.match(source, /fun GuiTooltip\(/);
assert.match(source, /open: Boolean/);
assert.match(source, /content: String/);
assert.match(source, /onOpenChange: \(Boolean\) -> Unit/);
assert.match(source, /GuiTooltipVariant = GuiTooltipVariant\.STANDARD/);
assert.match(source, /GuiTooltipSize = GuiTooltipSize\.MEDIUM/);
assert.match(source, /trigger: @Composable \(MutableInteractionSource\) -> Unit/);
assert.match(source, /GuiTooltipContract\.capabilities/);
assert.match(source, /componentId = "tooltip"/);
assert.match(source, /resolveGuiCapabilityRecipe\(/);
assert.match(source, /resolveGuiVisualRecipe\(/);
assert.match(source, /GuiTooltipState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /onFocusChanged \{ triggerHasFocus = it\.hasFocus \}/);
assert.match(source, /focusGroup\(\)/);
assert.match(source, /LaunchedEffect\(hovered, triggerHasFocus\)/);
assert.match(source, /interactionActive = hovered \|\| triggerHasFocus/);
assert.match(source, /triggerInteractionObserved = true/);
assert.match(source, /triggerInteractionObserved && open/);
assert.doesNotMatch(source, /interactionInitialized/, "Tooltip must not discard the first real focus or hover interaction");
assert.match(source, /onPreviewKeyEvent/);
assert.match(source, /Key\.Escape/);
assert.match(source, /PopupPositionProvider/);
assert.match(source, /GuiTooltipPlacement\.TOP -> GuiTooltipPlacement\.BOTTOM/);
assert.match(source, /GuiTooltipPlacement\.LEFT -> GuiTooltipPlacement\.RIGHT/);
assert.match(source, /primaryAxisOverflow\(/);
assert.match(source, /preferredOverflow > 0 && oppositeOverflow < preferredOverflow/);
assert.doesNotMatch(source, /private fun fits\(/, "Tooltip placement must resolve on the primary axis before cross-axis clamping");
assert.match(source, /coerceIn\(marginPx, maxX\)/);
assert.match(source, /PopupProperties\(focusable = false\)/);
assert.match(source, /BasicText\(/);
assert.match(source, /require\(content\.isNotBlank\(\)\)/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /AnimatedVisibility|animate[A-Z]|Transition\(/);
assert.doesNotMatch(source, /clickable\(|pointerInput\(/, "Tooltip popup must remain non-interactive");

console.log("Compose Basic Tooltip source contract tests passed.");
