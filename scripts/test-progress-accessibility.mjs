// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolveComponentVisualRecipe } from "../packages/compiler/src/theme-resolution.mjs";

const irPath = "build/spec-ir-progress-accessibility-test.json";
const MIN_TEXT_CONTRAST = 4.5;
const MIN_NON_TEXT_CONTRAST = 3;

function compile() {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
}

function channels(token, label) {
  assert.equal(token?.type, "color", `${label} must resolve to a color`);
  assert.equal(token.value?.colorSpace, "srgb", `${label} must resolve to sRGB`);
  assert.equal(token.value?.alpha ?? 1, 1, `${label} must be opaque`);
  return token.value.components;
}

function linearize(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(token, label) {
  const [red, green, blue] = channels(token, label).map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function assertContrast(foreground, background, minimum, label) {
  const left = luminance(foreground, `${label} foreground`);
  const right = luminance(background, `${label} background`);
  const ratio = (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
  assert.ok(ratio >= minimum, `${label} contrast ${ratio.toFixed(3)}:1 is below ${minimum}:1`);
}

function resolve(recipe, contract, { variant, size = "medium", state = "default" }) {
  return resolveComponentVisualRecipe(recipe, {
    variant,
    size,
    activeStates: state === "default" ? [] : [state],
    statePriority: contract.states,
  });
}

try {
  compile();
  const ir = JSON.parse(await readFile(irPath, "utf8"));
  for (const palette of ir.palettes) {
    const contract = palette.components.progress;
    const recipe = palette.themes.basic.components.progress;
    const background = palette.tokens["semantic.color.background"];
    assert.ok(contract, `${palette.id} must compile the Progress / Spinner contract`);
    assert.ok(recipe, `${palette.id} Basic must compile Progress / Spinner visuals`);
    assert.deepEqual(contract.variants, ["linear", "circular"]);
    assert.equal(contract.semantics.role, "progressbar");

    for (const size of contract.sizes) {
      const linear = resolve(recipe, contract, { variant: "linear", size });
      assertContrast(linear.indicator.fill, linear.track.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} linear ${size} indicator`);
      assertContrast(linear.label.foreground, background, MIN_TEXT_CONTRAST, `${palette.id} linear ${size} label`);
      assert.equal(linear.track.minHeight.value.unit, "px");
      assert.ok(linear.track.minHeight.value.value >= 4, `${palette.id} linear ${size} must remain visibly measurable`);

      const circular = resolve(recipe, contract, { variant: "circular", size });
      assertContrast(circular.indicator.border.color, circular.track.border.color, MIN_NON_TEXT_CONTRAST, `${palette.id} circular ${size} indicator`);
      assertContrast(circular.label.foreground, background, MIN_TEXT_CONTRAST, `${palette.id} circular ${size} label`);
      assert.equal(circular.root.minWidth.value.unit, "px");
      assert.equal(circular.root.minHeight.value.unit, "px");
      assert.ok(circular.root.minWidth.value.value > 0 && circular.root.minHeight.value.value > 0, `${palette.id} circular ${size} must have positive geometry`);
    }

    const indeterminate = resolve(recipe, contract, { variant: "linear", state: "indeterminate" });
    assert.equal(indeterminate.indicator.transition.reference, "{motion.interaction.fast}", `${palette.id} indeterminate progress must retain functional motion`);
    const disabled = resolve(recipe, contract, { variant: "linear", state: "disabled" });
    assert.equal(disabled.root.opacity.reference, "{opacity.disabled}", `${palette.id} disabled progress must expose disabled opacity`);
  }
  console.log(`Progress / Spinner accessibility and geometry gates passed for ${ir.palettes.length} palette(s).`);
} finally {
  await rm(irPath, { force: true });
}
