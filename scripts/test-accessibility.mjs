// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolveComponentVisualRecipe } from "../packages/compiler/src/theme-resolution.mjs";

const irPath = "build/spec-ir-accessibility-test.json";
const contrastPolicyPath = "spec/accessibility/contrast-policy.json";
const MIN_TEXT_CONTRAST = 4.5;
const MIN_NON_TEXT_CONTRAST = 3;
const MIN_TARGET_SIZE_PX = 24;

function compile() {
  const result = spawnSync(
    process.execPath,
    ["packages/compiler/src/index.mjs", "--output", irPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function colorComponents(token, label) {
  assert.equal(token?.type, "color", `${label} must be a compiled color`);
  assert.equal(token.value?.colorSpace, "srgb", `${label} must use sRGB`);
  assert.deepEqual(token.value?.components?.length, 3, `${label} must have three channels`);
  assert.equal(token.value?.alpha ?? 1, 1, `${label} must be opaque for contrast evaluation`);
  return token.value.components;
}

function linearize(channel) {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  const [red, green, blue] = color.map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(leftToken, rightToken, label) {
  const left = luminance(colorComponents(leftToken, `${label} foreground`));
  const right = luminance(colorComponents(rightToken, `${label} background`));
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function assertContrast(left, right, minimum, label) {
  const ratio = contrast(left, right, label);
  assert.ok(
    ratio >= minimum,
    `${label} contrast ${ratio.toFixed(3)}:1 is below ${minimum}:1`,
  );
}

function resolve(recipe, contract, { variant, size = "medium", state } = {}) {
  return resolveComponentVisualRecipe(recipe, {
    variant,
    size,
    activeStates: state && state !== "default" ? [state] : [],
    statePriority: contract.states,
  });
}

function token(palette, path) {
  const value = palette.tokens[path];
  assert.ok(value, `${palette.id} is missing public token ${path}`);
  return value;
}

function verifySemanticContrastPolicy(palette, policy) {
  for (const check of policy.checks) {
    assertContrast(
      token(palette, check.foreground),
      token(palette, check.background),
      check.minimum,
      `${palette.id} semantic contrast ${check.id}`,
    );
  }
}

function verifyButtons(palette, background, themeId) {
  const contract = palette.components.button;
  const recipe = palette.themes[themeId].components.button;

  for (const variant of contract.variants) {
    for (const state of ["default", "hover", "pressed"]) {
      const visual = resolve(recipe, contract, { variant, state });
      const root = visual.root ?? {};
      const fill = root.fill ?? background;
      const foreground = visual.label?.foreground ?? root.foreground;
      assert.ok(foreground, `${palette.id} ${themeId} ${variant} button needs a foreground`);
      assert.equal(root.opacity, undefined, `${palette.id} ${themeId} ${variant} ${state} must not reduce enabled text contrast with whole-control opacity`);
      assertContrast(
        foreground,
        fill,
        MIN_TEXT_CONTRAST,
        `${palette.id} ${themeId} ${variant} button ${state}`,
      );
    }

    const focused = resolve(recipe, contract, { variant, state: "focus" });
    assertContrast(
      focused.root.outline.color,
      background,
      MIN_NON_TEXT_CONTRAST,
      `${palette.id} ${themeId} ${variant} button focus outline`,
    );
  }
}

function verifyInput(palette, background, themeId) {
  const contract = palette.components.input;
  const recipe = palette.themes[themeId].components.input;

  for (const state of ["default", "hover", "focus", "error"]) {
    const visual = resolve(recipe, contract, { variant: "standard", state });
    const root = visual.root;
    assertContrast(root.foreground, root.fill, MIN_TEXT_CONTRAST, `${palette.id} ${themeId} input text ${state}`);
    assertContrast(visual.placeholder.foreground, root.fill, MIN_TEXT_CONTRAST, `${palette.id} ${themeId} input placeholder ${state}`);
    assertContrast(root.border.color, root.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} input inner boundary ${state}`);
    assertContrast(root.border.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} input outer boundary ${state}`);
  }

  const focused = resolve(recipe, contract, { variant: "standard", state: "focus" });
  assertContrast(
    focused.root.outline.color,
    background,
    MIN_NON_TEXT_CONTRAST,
    `${palette.id} ${themeId} input focus outline`,
  );
}

function verifySwitch(palette, background, themeId) {
  const contract = palette.components.switch;
  const recipe = palette.themes[themeId].components.switch;

  for (const state of ["default", "hover", "pressed"]) {
    const visual = resolve(recipe, contract, { variant: "standard", state });
    assertContrast(visual.root.border.color, visual.root.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} switch inner boundary ${state}`);
    assertContrast(visual.root.border.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} switch outer boundary ${state}`);
  }

  const checked = resolve(recipe, contract, { variant: "standard", state: "checked" });
  assertContrast(checked.root.fill, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} switch checked track`);
  assertContrast(checked.thumb.fill, checked.root.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} switch checked thumb`);

  const focused = resolve(recipe, contract, { variant: "standard", state: "focus" });
  assertContrast(focused.root.outline.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${themeId} switch focus outline`);

  for (const size of contract.sizes) {
    const visual = resolve(recipe, contract, { variant: "standard", size });
    assert.equal(visual.root.minHeight.value.unit, "px");
    assert.equal(visual.root.minWidth.value.unit, "px");
    assert.ok(
      visual.root.minHeight.value.value >= MIN_TARGET_SIZE_PX &&
        visual.root.minWidth.value.value >= MIN_TARGET_SIZE_PX,
      `${palette.id} ${themeId} switch ${size} target must be at least ${MIN_TARGET_SIZE_PX} by ${MIN_TARGET_SIZE_PX} CSS px`,
    );
  }
}

try {
  compile();
  const [irSource, policySource] = await Promise.all([
    readFile(irPath, "utf8"),
    readFile(contrastPolicyPath, "utf8"),
  ]);
  const ir = JSON.parse(irSource);
  const policy = JSON.parse(policySource);
  const themeIds = ["basic", "modern"];
  for (const palette of ir.palettes) {
    verifySemanticContrastPolicy(palette, policy);
    const background = token(palette, "semantic.color.background");
    for (const themeId of themeIds) {
      assert.ok(palette.themes[themeId], `${palette.id} must compile ${themeId} for accessibility validation`);
      verifyButtons(palette, background, themeId);
      verifyInput(palette, background, themeId);
      verifySwitch(palette, background, themeId);
    }
  }
  console.log(`Semantic palette contrast policy and Basic/Modern WCAG 2.2 AA integration checks passed for ${ir.palettes.length} palette(s).`);
} finally {
  await rm(irPath, { force: true });
}
