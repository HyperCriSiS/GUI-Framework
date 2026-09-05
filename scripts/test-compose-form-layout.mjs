// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("packages/adapter-compose/src/main/kotlin/GuiFormLayout.kt", "utf8");

assert.doesNotMatch(source, /androidx\.compose\.material/);
assert.match(source, /GuiFormLayoutContract/);
assert.match(source, /GuiFormLayoutVariant/);
assert.match(source, /GuiFormLayoutSize/);
assert.match(source, /GuiFormLayoutState/);
assert.match(source, /fun GuiFormLayout\(/);
assert.match(source, /fun GuiFormLayoutSection\(/);
assert.match(source, /fun GuiFormField\(/);
assert.match(source, /fun GuiFormActions\(/);
assert.match(source, /require\(columns > 0\)/);
assert.match(source, /BoxWithConstraints/);
assert.match(source, /maxWidth < 480\.dp/);
assert.match(source, /val effectiveColumns = if \(compact\) 1 else columns/);
assert.match(source, /private fun GuiFormGrid\(/);
assert.match(source, /layoutId\(GuiFormLayoutSpan\.FULL\)/);
assert.match(source, /layoutId\(GuiFormLayoutSpan\.FIELD\)/);
assert.match(source, /isTraversalGroup = true/);
assert.match(source, /if \(accessibilityLabel\.isNotBlank\(\)\) contentDescription = accessibilityLabel/);
assert.match(source, /if \(errorMessage\.isNotBlank\(\)\) error\(errorMessage\)/);
assert.match(source, /if \(disabled\) disabled\(\)/);
assert.match(source, /context\.variant == GuiFormLayoutVariant\.INLINE && !context\.compact/);
assert.match(source, /FlowRow\(/);
assert.match(source, /Actions wrap instead of forcing horizontal overflow/);
assert.doesNotMatch(source, /control\s*=\s*false|control\s*=\s*disabled|enabled\s*=\s*!disabled/);

console.log("Compose Basic Form Layout source contract tests passed.");
