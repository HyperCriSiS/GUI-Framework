// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const components = {
  button: {
    source: "packages/adapter-compose/src/main/kotlin/GuiButton.kt",
    role: "button",
    nativePatterns: [/\.clickable\(/, /role = Role\.Button/, /BasicText\(text = label/],
    interactionPatterns: [
      /collectIsHoveredAsState\(\)/,
      /collectIsFocusedAsState\(\)/,
      /collectIsPressedAsState\(\)/,
      /if \(hovered && enabled\) add\("hover"\)/,
      /if \(focused && enabled\) add\("focus"\)/,
      /if \(pressed && enabled\) add\("pressed"\)/,
    ],
  },
  input: {
    source: "packages/adapter-compose/src/main/kotlin/GuiInput.kt",
    role: "textbox",
    nativePatterns: [/BasicTextField\(/, /enabled = enabled/, /readOnly = readOnly/, /contentDescription = accessibilityLabel/],
    interactionPatterns: [
      /collectIsHoveredAsState\(\)/,
      /collectIsFocusedAsState\(\)/,
      /if \(hovered && enabled\) add\("hover"\)/,
      /if \(focused && enabled\) add\("focus"\)/,
    ],
  },
  switch: {
    source: "packages/adapter-compose/src/main/kotlin/GuiSwitch.kt",
    role: "switch",
    nativePatterns: [/\.toggleable\(/, /role = Role\.Switch/, /contentDescription = accessibilityLabel/, /value = checked/],
    interactionPatterns: [
      /collectIsHoveredAsState\(\)/,
      /collectIsFocusedAsState\(\)/,
      /collectIsPressedAsState\(\)/,
      /if \(hovered && enabled\) add\("hover"\)/,
      /if \(focused && enabled\) add\("focus"\)/,
      /if \(pressed && enabled\) add\("pressed"\)/,
    ],
  },
  panel: {
    source: "packages/adapter-compose/src/main/kotlin/GuiPanel.kt",
    role: "container",
    nativePatterns: [/Box\(/, /contentDescription = accessibilityLabel/],
    interactionPatterns: [],
  },
  dialog: {
    source: "packages/adapter-compose/src/main/kotlin/GuiDialog.kt",
    role: "dialog",
    nativePatterns: [
      /Dialog\(/,
      /paneTitle = accessibilityLabel/,
      /dismissOnBackPress = dismissible/,
      /dismissOnClickOutside = dismissible/,
    ],
    interactionPatterns: [],
  },
};

function propertyById(recipe, id) {
  return recipe.properties.find((property) => property.id === id);
}

for (const [componentId, expected] of Object.entries(components)) {
  const [recipeSource, adapterSource] = await Promise.all([
    readFile(`spec/components/${componentId}.recipe.json`, "utf8"),
    readFile(expected.source, "utf8"),
  ]);
  const recipe = JSON.parse(recipeSource);

  assert.equal(recipe.component, componentId);
  assert.equal(recipe.semantics.role, expected.role, `${componentId} neutral semantic role changed without Compose mapping review`);
  assert.equal(recipe.semantics.preferNativePrimitive, true, `${componentId} must continue preferring a native Compose primitive`);

  for (const pattern of expected.nativePatterns) {
    assert.match(adapterSource, pattern, `${componentId} must preserve its native semantic mapping: ${pattern}`);
  }
  for (const pattern of expected.interactionPatterns) {
    assert.match(adapterSource, pattern, `${componentId} must preserve functional interaction feedback: ${pattern}`);
  }

  for (const property of recipe.properties.filter((entry) => entry.state)) {
    assert.match(
      adapterSource,
      new RegExp(`add\\(\\"${property.state}\\"\\)`),
      `${componentId}.${property.id} must continue driving neutral state ${property.state}`,
    );
  }

  if (propertyById(recipe, "accessibilityLabel")) {
    assert.match(adapterSource, /accessibilityLabel/, `${componentId} exposes accessibilityLabel but the Compose adapter does not consume it`);
  }

  assert.doesNotMatch(adapterSource, /androidx\.compose\.material/, `${componentId} must not gain implicit Material semantics/styling`);
  assert.doesNotMatch(adapterSource, /animate[A-Z]|Animated/, `${componentId} must not add decorative animation to baseline interactions`);
}

assert.match(
  await readFile("packages/adapter-compose/src/main/kotlin/GuiButton.kt", "utf8"),
  /val enabled = !disabled && !loading/,
  "Button loading must remain non-interactive as required by the neutral loading state",
);
assert.match(
  await readFile("packages/adapter-compose/src/main/kotlin/GuiInput.kt", "utf8"),
  /if \(error\) add\("error"\)/,
  "Input error must remain represented in the neutral visual state even when the platform has no standalone localized error message",
);
assert.match(
  await readFile("packages/adapter-compose/src/main/kotlin/GuiDialog.kt", "utf8"),
  /if \(!open\) return/,
  "Closed dialogs must not remain in the Compose semantics tree",
);

console.log("Compose semantic, focus and functional interaction mappings match the neutral reference-component contracts.");
