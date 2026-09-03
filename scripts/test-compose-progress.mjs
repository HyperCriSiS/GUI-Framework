// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiProgress.kt", "utf8");

assert.match(source, /fun GuiProgress\(/);
assert.match(source, /value: Double = 0\.0/);
assert.match(source, /min: Double = 0\.0/);
assert.match(source, /max: Double = 100\.0/);
assert.match(source, /indeterminate: Boolean = false/);
assert.match(source, /disabled: Boolean = false/);
assert.match(source, /accessibilityLabel: String = ""/);
assert.match(source, /label: String = ""/);
assert.match(source, /GuiProgressVariant = GuiProgressVariant\.LINEAR/);
assert.match(source, /GuiProgressSize = GuiProgressSize\.MEDIUM/);
assert.match(source, /require\(max > min\)/);
assert.match(source, /value in min\.\.max/);
assert.match(source, /componentId = "progress"/);
assert.match(source, /GuiProgressContract\.capabilities/);
assert.match(source, /GuiProgressState\.entries\.map \{ it\.wireValue \}/);
assert.match(source, /ProgressBarRangeInfo\.Indeterminate/);
assert.match(source, /ProgressBarRangeInfo\(/);
assert.match(source, /progressBarRangeInfo = rangeInfo/);
assert.match(source, /if \(disabled\) disabled\(\)/);
assert.match(source, /contentDescription = accessibleName/);
assert.match(source, /GuiPrimitiveTokens\.all\["component\.progress\.indeterminate\.duration"\]/);
assert.match(source, /toKotlinDuration\(\)\.inWholeMilliseconds/);
assert.match(source, /rememberInfiniteTransition/);
assert.match(source, /infiniteRepeatable/);
assert.match(source, /LinearEasing/);
assert.match(source, /Canvas\(/);
assert.match(source, /drawRoundRect\(/);
assert.match(source, /drawArc\(/);
assert.match(source, /StrokeCap\.Round/);
assert.match(source, /GuiProgressVariant\.LINEAR/);
assert.match(source, /GuiProgressVariant\.CIRCULAR/);
assert.match(source, /BasicText\(/);
assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.doesNotMatch(source, /1200|1\.2/);
assert.doesNotMatch(source, /Color\\\.(Blue|Gray|Red|Green)/);

console.log("Compose Basic Progress / Spinner source contract tests passed.");
