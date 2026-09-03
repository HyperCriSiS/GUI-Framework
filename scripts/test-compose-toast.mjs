// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiToast.kt", "utf8");

assert.match(source, /fun GuiToast\(/);
assert.match(source, /open: Boolean/);
assert.match(source, /message: String/);
assert.match(source, /onOpenChange: \(Boolean\) -> Unit/);
assert.match(source, /title: String = ""/);
assert.match(source, /actionLabel: String = ""/);
assert.match(source, /actionValue: String = ""/);
assert.match(source, /dismissible: Boolean = true/);
assert.match(source, /durationMs: Long = 5000L/);
assert.match(source, /accessibilityLabel: String = ""/);
assert.match(source, /onActivate: \(String\) -> Unit = \{\}/);
assert.match(source, /GuiToastVariant = GuiToastVariant\.INFO/);
assert.match(source, /GuiToastSize = GuiToastSize\.MEDIUM/);
assert.match(source, /require\(message\.isNotBlank\(\)\)/);
assert.match(source, /require\(durationMs >= 0L\)/);
assert.match(source, /componentId = "toast"/);
assert.match(source, /GuiToastContract\.capabilities/);
assert.match(source, /GuiToastState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /collectIsHoveredAsState\(\)/);
assert.match(source, /collectIsFocusedAsState\(\)/);
assert.match(source, /collectIsPressedAsState\(\)/);
assert.match(source, /LaunchedEffect\(open, durationMs, interactionPaused\)/);
assert.match(source, /delay\(durationMs\)/);
assert.match(source, /durationMs > 0L/);
assert.match(source, /Popup\(/);
assert.match(source, /Alignment\.BottomEnd/);
assert.match(source, /PopupProperties\(focusable = hasInteractiveControls\)/);
assert.match(source, /if \(dismissible\) onOpenChange\(false\)/);
assert.match(source, /LiveRegionMode\.Assertive/);
assert.match(source, /LiveRegionMode\.Polite/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /accessibilityLabel = "Dismiss notification"/);
assert.match(source, /onActivate\(actionValue\)/);
assert.match(source, /\.focusable\(interactionSource = interactionSource\)/);
assert.match(source, /\.hoverable\(interactionSource = interactionSource\)/);
assert.match(source, /indication = null/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /animate|AnimatedVisibility|fadeIn|fadeOut/);

console.log("Compose Basic Toast / Notification source contract tests passed.");
