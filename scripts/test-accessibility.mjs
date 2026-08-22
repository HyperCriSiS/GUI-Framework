// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolveComponentVisualForCapabilities } from "../packages/compiler/src/capability-resolution.mjs";
import { resolveVisualRecipe } from "../packages/compiler/src/visual-resolution.mjs";

const mapById = (items) => new Map(items.map((item) => [item.id, item]));

const irPath = "build/spec-ir-accessibility-test.json";

function relativeLuminance(hex) {
  const rgb = hex.match(/[A-Fa-f0-9]{2}/g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = rgb.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function blendHex(foreground, alpha, background) {
  const toRgb = (hex) => hex.match(/[A-Fa-f0-9]{2}/g).map((part) => Number.parseInt(part, 16));
  const [fr, fg, fb] = toRgb(foreground);
  const [br, bg, bb] = toRgb(background);
  const blend = (front, back) => Math.round((front * alpha) + (back * (1 - alpha)));
  return `#${[blend(fr, br), blend(fg, bg), blend(fb, bb)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function colorFor(value, background = null) {
  if (typeof value === "string") return value.toUpperCase();
  if (value?.hex && value?.alpha === 1) return value.hex.toUpperCase();
  if (value?.hex && typeof value?.alpha === "number" && background) {
    return blendHex(value.hex, value.alpha, background);
  }
  throw new Error(`Unsupported color value for contrast check: ${JSON.stringify(value)}`);
}

function token(palette, path) {
  const entry = palette.tokens[path];
  assert.ok(entry, `Missing compiled token ${path} in ${palette.id}`);
  return entry.value;
}

function value(node, context) {
  return resolveVisualRecipe(node, context);
}

function assertContrast(label, foreground, background, minimum) {
  const actual = contrastRatio(foreground, background);
  assert.ok(
    actual >= minimum,
    `${label} contrast ${actual.toFixed(2)}:1 is below required ${minimum}:1 (${foreground} on ${background})`,
  );
}

function assertPixelTarget(label, width, height, densityIndependentPx) {
  const minimum = 24 * densityIndependentPx;
  assert.ok(width >= minimum, `${label} width ${width}px is below WCAG 2.2 AA target minimum ${minimum}px`);
  assert.ok(height >= minimum, `${label} height ${height}px is below WCAG 2.2 AA target minimum ${minimum}px`);
}

function verifySemanticContrastPolicy(palette, policy) {
  const failures = [];
  for (const rule of policy.rules) {
    const foreground = colorFor(token(palette, rule.foreground));
    const background = colorFor(token(palette, rule.background));
    const ratio = contrastRatio(foreground, background);
    if (ratio < rule.minimum) {
      failures.push(`${rule.id}: ${ratio.toFixed(2)} < ${rule.minimum} (${foreground} on ${background})`);
    }
  }
  assert.deepEqual(failures, [], `Semantic contrast policy failed for ${palette.id}`);
}

function verifyButtonContrast(palette, themeId, policy, background) {
  const contract = palette.components.button;
  const themed = palette.themes[themeId].components.button;
  const baseContext = {
    variant: "primary",
    size: "medium",
    state: "default",
  };
  const base = value(themed, baseContext);
  const baseSurface = colorFor(base.root.fill, background);
  assertContrast(`${palette.id}/${themeId} Button primary label`, colorFor(base.label.foreground), baseSurface, policy.text.minimum);

  const danger = value(themed, { ...baseContext, variant: "danger" });
  const dangerSurface = colorFor(danger.root.fill, background);
  assertContrast(`${palette.id}/${themeId} Button danger label`, colorFor(danger.label.foreground), dangerSurface, policy.text.minimum);

  const disabled = value(themed, { ...baseContext, state: "disabled" });
  assert.ok(disabled.root.opacity < 1, "Disabled button must be visibly differentiated");

  assertPixelTarget(
    `${palette.id}/${themeId} Button medium`,
    contract.accessibility.minimumTargetPx.width,
    contract.accessibility.minimumTargetPx.height,
    palette.densityIndependentPx,
  );
}

function verifyInputContrast(palette, themeId, policy, background) {
  const contract = palette.components.input;
  const themed = palette.themes[themeId].components.input;
  const baseContext = {
    variant: "standard",
    size: "medium",
    state: "default",
  };
  const base = value(themed, baseContext);
  const surface = colorFor(base.root.fill, background);
  assertContrast(`${palette.id}/${themeId} Input value`, colorFor(base.value.foreground), surface, policy.text.minimum);
  assertContrast(`${palette.id}/${themeId} Input placeholder`, colorFor(base.placeholder.foreground), surface, policy.text.minimum);

  const error = value(themed, { ...baseContext, state: "error" });
  assertContrast(`${palette.id}/${themeId} Input error outline`, colorFor(error.root.outline.color), surface, policy.nonText.minimum);

  assertPixelTarget(
    `${palette.id}/${themeId} Input medium`,
    contract.accessibility.minimumTargetPx.width,
    contract.accessibility.minimumTargetPx.height,
    palette.densityIndependentPx,
  );
}

function verifySwitchContrast(palette, themeId, policy, background) {
  const contract = palette.components.switch;
  const themed = palette.themes[themeId].components.switch;
  const context = { variant: "standard", size: "medium", state: "default" };
  const base = value(themed, context);
  const surface = colorFor(base.root.fill, background);
  assertContrast(`${palette.id}/${themeId} Switch border`, colorFor(base.root.border.color), surface, policy.nonText.minimum);

  const checked = value(themed, { ...context, state: "checked" });
  const checkedSurface = colorFor(checked.root.fill, background);
  assertContrast(`${palette.id}/${themeId} Switch checked thumb`, colorFor(checked.thumb.fill), checkedSurface, policy.nonText.minimum);

  assertPixelTarget(
    `${palette.id}/${themeId} Switch medium`,
    contract.accessibility.minimumTargetPx.width,
    contract.accessibility.minimumTargetPx.height,
    palette.densityIndependentPx,
  );
}

function verifyGlassSurfaceContrast(palette, themeId, policy, background) {
  if (!new Set(["glass", "frosted-glass"]).has(themeId)) return;

  const panel = value(palette.themes[themeId].components.panel, {
    variant: "standard",
    size: "medium",
    state: "default",
  });
  const dialog = resolveComponentVisualForCapabilities(
    palette.themes[themeId].components.dialog,
    { variant: "modal", size: "medium", state: "default" },
    [],
  );
  const panelSurface = colorFor(panel.root.fill, background);
  const dialogSurface = colorFor(dialog.root.fill, background);
  const primary = colorFor(token(palette, "semantic.color.textPrimary"));
  const secondary = colorFor(token(palette, "semantic.color.textSecondary"));
  const border = colorFor(token(palette, "semantic.color.border"));

  assertContrast(`${palette.id}/${themeId} Panel primary text`, primary, panelSurface, policy.text.minimum);
  assertContrast(`${palette.id}/${themeId} Panel secondary text`, secondary, panelSurface, policy.text.minimum);
  assertContrast(`${palette.id}/${themeId} Panel border`, border, panelSurface, policy.nonText.minimum);
  assertContrast(`${palette.id}/${themeId} Dialog primary text`, primary, dialogSurface, policy.text.minimum);
  assertContrast(`${palette.id}/${themeId} Dialog secondary text`, secondary, dialogSurface, policy.text.minimum);
  assertContrast(`${palette.id}/${themeId} Dialog border`, border, dialogSurface, policy.nonText.minimum);
}

async function runCompiler() {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  await runCompiler();
  const [irSource, policySource] = await Promise.all([
    readFile(irPath, "utf8"),
    readFile("spec/accessibility/contrast-policy.json", "utf8"),
  ]);
  const ir = JSON.parse(irSource);
  const policy = JSON.parse(policySource);
  const themeIds = ["basic", "modern", "glass", "frosted-glass", "spacey"];
  for (const palette of ir.palettes) {
    verifySemanticContrastPolicy(palette, policy);
    const background = token(palette, "semantic.color.background");
    for (const themeId of themeIds) {
      verifyButtonContrast(palette, themeId, policy, background);
      verifyInputContrast(palette, themeId, policy, background);
      verifySwitchContrast(palette, themeId, policy, background);
      verifyGlassSurfaceContrast(palette, themeId, policy, background);
    }
  }
} finally {
  await rm(irPath, { force: true });
}

console.log("WCAG 2.2 AA integration checks passed for semantic palette roles, Basic/Modern/Glass/Frosted/Spacey controls, composited Glass/Frosted surfaces and minimum targets.");
