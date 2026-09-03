// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiSlider.kt", "utf8");

assert.match(source, /fun GuiSlider\(/);
assert.match(source, /value: Double/);
assert.match(source, /onValueChange: \(Double\) -> Unit/);
assert.match(source, /accessibilityLabel: String/);
assert.match(source, /min: Double = 0\.0/);
assert.match(source, /max: Double = 100\.0/);
assert.match(source, /step: Double = 1\.0/);
assert.match(source, /accessibilityValueText: String = ""/);
assert.match(source, /disabled: Boolean = false/);
assert.match(source, /GuiSliderVariant = GuiSliderVariant\.HORIZONTAL/);
assert.match(source, /GuiSliderSize = GuiSliderSize\.MEDIUM/);
assert.match(source, /require\(max > min\)/);
assert.match(source, /require\(step > 0\.0\)/);
assert.match(source, /value in min\.\.max/);
assert.match(source, /componentId = "slider"/);
assert.match(source, /GuiSliderContract\.capabilities/);
assert.match(source, /GuiSliderState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /ProgressBarRangeInfo\(/);
assert.match(source, /progressBarRangeInfo = ProgressBarRangeInfo/);
assert.match(source, /setProgress \{ target ->/);
assert.match(source, /stateDescription = accessibilityValueText/);
assert.match(source, /if \(disabled\) disabled\(\)/);
assert.match(source, /contentDescription = accessibilityLabel/);
assert.match(source, /focusable\(enabled = enabled, interactionSource = source\)/);
assert.match(source, /hoverable\(interactionSource = source, enabled = enabled\)/);
assert.match(source, /onKeyEvent/);
assert.match(source, /Key\.MoveHome/);
assert.match(source, /Key\.MoveEnd/);
assert.match(source, /Key\.DirectionLeft, Key\.DirectionDown/);
assert.match(source, /Key\.DirectionRight, Key\.DirectionUp/);
assert.match(source, /detectTapGestures/);
assert.match(source, /detectDragGestures/);
assert.match(source, /tryAwaitRelease\(\)/);
assert.match(source, /rememberUpdatedState\(value\)/);
assert.match(source, /rememberUpdatedState\(onValueChange\)/);
assert.match(source, /snapSliderValue/);
assert.match(source, /GuiSliderVariant\.VERTICAL/);
assert.match(source, /Canvas\(/);
assert.match(source, /drawRoundRect\(/);
assert.match(source, /track\.fill\?\.toComposeColor\(\)/);
assert.match(source, /fill\.fill\?\.toComposeColor\(\)/);
assert.match(source, /thumb\.fill\?\.toComposeColor\(\)/);
assert.match(source, /thumb\.border/);
assert.match(source, /root\.outline/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /Color\.(?:Blue|Gray|Red|Green|Black|White)|Color\(0x[0-9A-Fa-f]+\)/);

console.log("Compose Basic Slider source contract tests passed.");
