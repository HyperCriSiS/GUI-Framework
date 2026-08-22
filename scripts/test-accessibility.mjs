// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const policy = JSON.parse(await readFile("spec/accessibility/contrast-policy.json", "utf8"));
const outputPath = "build/spec-ir-accessibility-test.json";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

function parseHex(hex) {
  assert.match(hex, /^#[0-9A-Fa-f]{6}$/);
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function toLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [red, green, blue] = parseHex(hex).map(toLinear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function alphaComposite(foreground, background) {
  assert.equal(foreground.type, "color");
  assert.equal(background.type, "color");
  const alpha = foreground.value.alpha ?? 1;
  const backgroundAlpha = background.value.alpha ?? 1;
  assert.equal(backgroundAlpha, 1, "Reference accessibility compositing expects an opaque backdrop");
  const components = foreground.value.components.map(
    (component, index) => component * alpha + background.value.components[index] * (1 - alpha),
  );
  const toHex = (component) => Math.round(component * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${components.map(toHex).join("")}`;
}

function tokenHex(token, label) {
  assert.equal(token?.type, "color", `${label} must resolve to a color token`);
  assert.equal(typeof token.value?.hex, "string", `${label} must expose an sRGB hex value`);
  return token.value.hex;
}

function resolvePaletteToken(palette, reference) {
  assert.match(reference, /^\{[^}]+\}$/);
  const path = reference.slice(1, -1).split(".");
  let cursor = palette.tokens;
  for (const segment of path) {
    cursor = cursor?.[segment];
  }
  assert.ok(cursor, `Missing compiled palette token ${reference}`);
  return cursor;
}

function ratioForReferences(palette, foregroundReference, backgroundReference) {
  return contrastRatio(
    tokenHex(resolvePaletteToken(palette, foregroundReference), foregroundReference),
    tokenHex(resolvePaletteToken(palette, backgroundReference), backgroundReference),
  );
}

function verifyContrastPolicy(palette) {
  for (const requirement of policy.requirements) {
    const ratio = ratioForReferences(palette, requirement.foreground, requirement.background);
    assert.ok(
      ratio >= requirement.minimumRatio,
      `${palette.id}: contrast ${ratio.toFixed(2)} for ${requirement.foreground} on ${requirement.background} is below ${requirement.minimumRatio}`,
    );
  }
}

function styleToken(palette, style, property, label) {
  const token = style?.[property];
  assert.ok(token, `${label}.${property} must exist`);
  assert.equal(token.reference?.startsWith("{semantic.color."), true, `${label}.${property} must remain semantic`);
  return token;
}

function styleContrast(palette, style, foregroundProperty, backgroundProperty, label) {
  return contrastRatio(
    tokenHex(styleToken(palette, style, foregroundProperty, label), `${label}.${foregroundProperty}`),
    tokenHex(styleToken(palette, style, backgroundProperty, label), `${label}.${backgroundProperty}`),
  );
}

function assertMinimumContrast(ratio, minimum, label) {
  assert.ok(ratio >= minimum, `${label}: contrast ${ratio.toFixed(2)} is below ${minimum}`);
}

function verifyButtons(palette, themeId) {
  const button = palette.themes[themeId].components.button;
  const normalMinimum = policy.levels.normalText;
  const disabledMinimum = policy.levels.disabledText;

  for (const [variantId, variant] of Object.entries(button.variants)) {
    const baseRoot = variant.base.root;
    const baseLabel = `${palette.id}.${themeId}.button.${variantId}.base`;
    assertMinimumContrast(styleContrast(palette, baseRoot, "foreground", "fill", baseLabel), normalMinimum, baseLabel);

    for (const stateId of ["hover", "pressed"]) {
      const stateRoot = variant.states[stateId]?.root;
      if (!stateRoot?.fill) continue;
      const stateLabel = `${palette.id}.${themeId}.button.${variantId}.${stateId}`;
      const foreground = stateRoot.foreground ?? baseRoot.foreground;
      assertMinimumContrast(
        contrastRatio(tokenHex(foreground, `${stateLabel}.foreground`), tokenHex(stateRoot.fill, `${stateLabel}.fill`)),
        normalMinimum,
        stateLabel,
      );
    }

    const disabledRoot = variant.states.disabled?.root;
    if (disabledRoot?.fill) {
      const disabledLabel = `${palette.id}.${themeId}.button.${variantId}.disabled`;
      const foreground = disabledRoot.foreground ?? baseRoot.foreground;
      assertMinimumContrast(
        contrastRatio(tokenHex(foreground, `${disabledLabel}.foreground`), tokenHex(disabledRoot.fill, `${disabledLabel}.fill`)),
        disabledMinimum,
        disabledLabel,
      );
    }
  }
}

function verifyInput(palette, themeId) {
  const input = palette.themes[themeId].components.input;
  const normalMinimum = policy.levels.normalText;
  const disabledMinimum = policy.levels.disabledText;
  const baseRoot = input.base.root;
  const basePlaceholder = input.base.placeholder;
  const baseLabel = `${palette.id}.${themeId}.input.base`;
  assertMinimumContrast(styleContrast(palette, baseRoot, "foreground", "fill", baseLabel), normalMinimum, baseLabel);
  assertMinimumContrast(
    contrastRatio(tokenHex(basePlaceholder.foreground, `${baseLabel}.placeholder`), tokenHex(baseRoot.fill, `${baseLabel}.fill`)),
    normalMinimum,
    `${baseLabel}.placeholder`,
  );

  const disabledRoot = input.states.disabled.root;
  const disabledPlaceholder = input.states.disabled.placeholder;
  assertMinimumContrast(
    contrastRatio(tokenHex(disabledRoot.foreground, "input.disabled.foreground"), tokenHex(disabledRoot.fill, "input.disabled.fill")),
    disabledMinimum,
    `${palette.id}.${themeId}.input.disabled`,
  );
  assertMinimumContrast(
    contrastRatio(tokenHex(disabledPlaceholder.foreground, "input.disabled.placeholder"), tokenHex(disabledRoot.fill, "input.disabled.fill")),
    disabledMinimum,
    `${palette.id}.${themeId}.input.disabled.placeholder`,
  );
}

function verifySwitch(palette, themeId) {
  const switchVisual = palette.themes[themeId].components.switch;
  const baseRoot = switchVisual.base.root;
  const checkedRoot = switchVisual.states.checked.root;
  const thumb = switchVisual.base.thumb;
  const minimum = policy.levels.nonText;

  const baseBorder = baseRoot.border?.color;
  assert.ok(baseBorder, `${palette.id}.${themeId}.switch.base border color must exist`);
  assertMinimumContrast(
    contrastRatio(tokenHex(baseBorder, "switch.base.border"), tokenHex(baseRoot.fill, "switch.base.fill")),
    minimum,
    `${palette.id}.${themeId}.switch.base.border`,
  );
  assertMinimumContrast(
    contrastRatio(tokenHex(thumb.fill, "switch.thumb.fill"), tokenHex(baseRoot.fill, "switch.base.fill")),
    minimum,
    `${palette.id}.${themeId}.switch.thumb`,
  );
  assertMinimumContrast(
    contrastRatio(tokenHex(thumb.fill, "switch.thumb.fill"), tokenHex(checkedRoot.fill, "switch.checked.fill")),
    minimum,
    `${palette.id}.${themeId}.switch.checked.thumb`,
  );
}

function verifyGlassCompositeRoles(palette) {
  const background = resolvePaletteToken(palette, "{semantic.color.background}");
  const textPrimary = resolvePaletteToken(palette, "{semantic.color.textPrimary}");
  const surface = resolvePaletteToken(palette, "{semantic.color.surfaceTranslucent}");
  const elevated = resolvePaletteToken(palette, "{semantic.color.surfaceElevatedTranslucent}");
  const compositeSurface = alphaComposite(surface, background);
  const compositeElevated = alphaComposite(elevated, background);

  assertMinimumContrast(
    contrastRatio(tokenHex(textPrimary, "textPrimary"), compositeSurface),
    policy.levels.normalText,
    `${palette.id}.glass.surfaceTranslucent`,
  );
  assertMinimumContrast(
    contrastRatio(tokenHex(textPrimary, "textPrimary"), compositeElevated),
    policy.levels.normalText,
    `${palette.id}.glass.surfaceElevatedTranslucent`,
  );
}

try {
  run(["packages/compiler/src/index.mjs", "--output", outputPath], "Specification compiler");
  const ir = JSON.parse(await readFile(outputPath, "utf8"));
  const themeIds = ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"];

  for (const palette of ir.palettes) {
    verifyContrastPolicy(palette);
    verifyGlassCompositeRoles(palette);
    for (const themeId of themeIds) {
      verifyButtons(palette, themeId);
      verifyInput(palette, themeId);
      verifySwitch(palette, themeId);
    }
  }

  console.log(`Semantic palette contrast policy and Basic/Modern/Glass/Frosted Glass/Spacey/Cyberpunk WCAG 2.2 AA integration checks passed for ${ir.palettes.length} palette(s).`);
} finally {
  await rm(outputPath, { force: true });
}
