// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve as resolvePath } from "node:path";

import { resolveVisualRecipe } from "../packages/compiler/src/visual-resolution.mjs";

const irPath = resolvePath("build/accessibility-test-ir.json");
const contrastPolicyPath = resolvePath("spec/accessibility/contrast-policy.json");
const MIN_TEXT_CONTRAST = 4.5;
const MIN_NON_TEXT_CONTRAST = 3;
const MIN_TARGET_SIZE_PX = 24;

function compile() {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stderr || result.stdout}`);
}

function token(palette, id) {
  const value = palette.tokens[id];
  assert.ok(value, `${palette.id}: missing token ${id}`);
  return value;
}

function colorComponents(value, label) {
  assert.equal(value.type, "color", `${label} must resolve to a color`);
  assert.deepEqual(value.value?.components?.length, 3, `${label} must have three channels`);
  return value.value.components;
}

function linearize(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminanceFromComponents(components) {
  const [r, g, b] = components.map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function relativeLuminance(color, label) {
  return relativeLuminanceFromComponents(colorComponents(color, label));
}

function contrastRatioFromComponents(a, b) {
  const lumA = relativeLuminanceFromComponents(a);
  const lumB = relativeLuminanceFromComponents(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastRatio(a, b, label) {
  const lumA = relativeLuminance(a, `${label} foreground`);
  const lumB = relativeLuminance(b, `${label} background`);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function assertContrast(foreground, background, minimum, label) {
  const ratio = contrastRatio(foreground, background, label);
  assert.ok(ratio >= minimum, `${label}: contrast ${ratio.toFixed(2)} must be >= ${minimum}`);
}

function compositeToken(topToken, bottomToken, label) {
  const top = colorComponents(topToken, `${label} top`);
  const bottom = colorComponents(bottomToken, `${label} bottom`);
  const alpha = topToken.value.alpha ?? 1;
  assert.ok(alpha >= 0 && alpha <= 1, `${label}: alpha must be in 0..1`);
  return topToken.value.components.map(
    (channel, index) => channel * alpha + bottomToken.value.components[index] * (1 - alpha),
  );
}

function assertContrastAgainstComponents(foreground, backgroundComponents, minimum, label) {
  const ratio = contrastRatioFromComponents(
    colorComponents(foreground, `${label} foreground`),
    backgroundComponents,
  );
  assert.ok(ratio >= minimum, `${label}: contrast ${ratio.toFixed(2)} must be >= ${minimum}`);
}

function verifySemanticContrastPolicy(palette, policy) {
  for (const requirement of policy.requirements) {
    const foreground = token(palette, requirement.foreground);
    const background = token(palette, requirement.background);
    assertContrast(foreground, background, requirement.minimumRatio, `${palette.id} ${requirement.id}`);
  }
}

function resolve(recipe, contract, options) {
  return resolveVisualRecipe(recipe, contract, options);
}

function verifyGlassTranslucentSurfaces(palette, background) {
  const glassTheme = palette.themes.glass;
  assert.ok(glassTheme, `${palette.id} must compile glass for translucent accessibility validation`);

  const textPrimary = token(palette, "semantic.color.textPrimary");
  const textSecondary = token(palette, "semantic.color.textSecondary");
  const border = token(palette, "semantic.color.border");
  const translucentSurfacePaths = [
    "semantic.color.surfaceTranslucent",
    "semantic.color.surfaceElevatedTranslucent",
  ];

  for (const surfacePath of translucentSurfacePaths) {
    const surface = token(palette, surfacePath);
    assert.ok(surface.value.alpha > 0 && surface.value.alpha < 1, `${palette.id} ${surfacePath} must stay translucent`);
    const composedSurface = compositeToken(
      surface,
      background,
      `${palette.id} ${surfacePath}`,
    );

    assertContrastAgainstComponents(
      textPrimary,
      composedSurface,
      MIN_TEXT_CONTRAST,
      `${palette.id} glass primary text on ${surfacePath}`,
    );
    assertContrastAgainstComponents(
      textSecondary,
      composedSurface,
      MIN_TEXT_CONTRAST,
      `${palette.id} glass secondary text on ${surfacePath}`,
    );
    assertContrastAgainstComponents(
      border,
      composedSurface,
      MIN_NON_TEXT_CONTRAST,
      `${palette.id} glass boundary on ${surfacePath}`,
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

function verifyCheckbox(palette, background) {
  const themeId = "basic";
  const contract = palette.components.checkbox;
  const recipe = palette.themes[themeId].components.checkbox;
  assert.ok(contract, `${palette.id} must compile the Checkbox contract`);
  assert.ok(recipe, `${palette.id} Basic must compile the Checkbox visual recipe`);

  for (const state of ["default", "hover", "pressed"]) {
    const visual = resolve(recipe, contract, { variant: "standard", state });
    assertContrast(visual.root.border.color, visual.root.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} Basic checkbox inner boundary ${state}`);
    assertContrast(visual.root.border.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} Basic checkbox outer boundary ${state}`);
  }

  for (const state of ["checked", "indeterminate"]) {
    const visual = resolve(recipe, contract, { variant: "standard", state });
    assertContrast(visual.root.fill, background, MIN_NON_TEXT_CONTRAST, `${palette.id} Basic checkbox ${state} fill`);
    assertContrast(visual.indicator.foreground, visual.root.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} Basic checkbox ${state} indicator`);
  }

  const focused = resolve(recipe, contract, { variant: "standard", state: "focus" });
  assertContrast(
    focused.root.outline.color,
    background,
    MIN_NON_TEXT_CONTRAST,
    `${palette.id} Basic checkbox focus outline`,
  );

  for (const size of contract.sizes) {
    const visual = resolve(recipe, contract, { variant: "standard", size });
    assert.equal(visual.root.minHeight.value.unit, "px");
    assert.equal(visual.root.minWidth.value.unit, "px");
    assert.ok(
      visual.root.minHeight.value.value >= MIN_TARGET_SIZE_PX &&
        visual.root.minWidth.value.value >= MIN_TARGET_SIZE_PX,
      `${palette.id} Basic checkbox ${size} target must be at least ${MIN_TARGET_SIZE_PX} by ${MIN_TARGET_SIZE_PX} CSS px`,
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
  const themeIds = ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"];
  for (const palette of ir.palettes) {
    verifySemanticContrastPolicy(palette, policy);
    const background = token(palette, "semantic.color.background");
    verifyGlassTranslucentSurfaces(palette, background);
    verifyCheckbox(palette, background);
    for (const themeId of themeIds) {
      assert.ok(palette.themes[themeId], `${palette.id} must compile ${themeId} for accessibility validation`);
      verifyButtons(palette, background, themeId);
      verifyInput(palette, background, themeId);
      verifySwitch(palette, background, themeId);
    }
  }
  console.log(`Semantic palette contrast policy, Basic Checkbox, and Basic/Modern/Glass/Frosted Glass/Spacey/Cyberpunk WCAG 2.2 AA integration checks passed for ${ir.palettes.length} palette(s).`);
} finally {
  await rm(irPath, { force: true });
}
