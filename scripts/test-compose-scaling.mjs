// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const composeDir = "packages/adapter-compose/src/main/kotlin";
const componentFiles = [
  "GuiButton.kt",
  "GuiInput.kt",
  "GuiSwitch.kt",
  "GuiPanel.kt",
  "GuiDialog.kt",
];

const [mappings, theme, ...componentSources] = await Promise.all([
  readFile(join(composeDir, "ComposeTokenMappings.kt"), "utf8"),
  readFile(join(composeDir, "GuiTheme.kt"), "utf8"),
  ...componentFiles.map((file) => readFile(join(composeDir, file), "utf8")),
]);

assert.match(
  mappings,
  /internal fun GuiDimensionValue\.toComposeDp\(\): Dp[\s\S]*return value\.toFloat\(\)\.dp/,
  "neutral layout dimensions must map to density-independent dp",
);
assert.match(
  mappings,
  /internal fun GuiDimensionValue\.toComposeSp\(\): TextUnit[\s\S]*return value\.toFloat\(\)\.sp/,
  "neutral typography dimensions must map to user-scaled sp",
);
assert.match(
  mappings,
  /require\(unit == "px"\)[\s\S]*Unsupported neutral dimension unit for Compose Dp mapping/,
  "unsupported neutral units must fail rather than silently becoming physical pixels",
);
assert.match(
  theme,
  /availableCapabilities: Set<String> = emptySet\(\)/,
  "the Compose host must default to the minimum-capability profile",
);
assert.match(
  theme,
  /LocalGuiAvailableCapabilities provides availableCapabilities\.toSet\(\)/,
  "capabilities must be supplied once at the theme host instead of hard-coded per component",
);

componentSources.forEach((source, index) => {
  const file = componentFiles[index];
  assert.match(
    source,
    /\.toComposeDp\(\)/,
    `${file} must consume neutral layout dimensions through the dp mapping`,
  );
  assert.match(
    source,
    /LocalGuiAvailableCapabilities/,
    `${file} must use the theme-scoped capability profile`,
  );
  assert.match(
    source,
    /resolveGuiCapabilityRecipe/,
    `${file} must pass through deterministic capability fallback resolution`,
  );
  assert.doesNotMatch(
    source,
    /\bandroid\.(graphics|view)\./,
    `${file} must not depend on Android physical-pixel/view APIs`,
  );
  assert.doesNotMatch(
    source,
    /GuiDimensionValue\s*\.\s*value|GuiDimensionValue[\s\S]{0,80}\.value/,
    `${file} must not bypass the central neutral-dimension mapping`,
  );
});

for (const file of ["GuiButton.kt", "GuiInput.kt"]) {
  const source = componentSources[componentFiles.indexOf(file)];
  assert.match(
    source,
    /\.toComposeSp\(\)/,
    `${file} must map its explicit typography dimensions through sp`,
  );
}

for (const file of ["GuiButton.kt", "GuiInput.kt"]) {
  const source = componentSources[componentFiles.indexOf(file)];
  if (source.includes(".toPx()")) {
    assert.match(
      source,
      /toComposeDp\(\)\.toPx\(\)/,
      `${file} may enter DrawScope pixels only after neutral dimensions were mapped through dp`,
    );
  }
}

console.log("Compose scaling and minimum-capability contract tests passed.");
