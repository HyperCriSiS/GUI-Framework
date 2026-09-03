// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolveComponentVisualRecipe } from "../packages/compiler/src/theme-resolution.mjs";

const irPath = "build/spec-ir-slider-accessibility-test.json";
const MIN_NON_TEXT_CONTRAST = 3;
const MIN_TARGET_SIZE_PX = 24;

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

function assertTarget(part, label) {
  assert.equal(part.minWidth.value.unit, "px", `${label} width must resolve to CSS-pixel geometry`);
  assert.equal(part.minHeight.value.unit, "px", `${label} height must resolve to CSS-pixel geometry`);
  assert.ok(part.minWidth.value.value >= MIN_TARGET_SIZE_PX, `${label} width must be at least ${MIN_TARGET_SIZE_PX}px`);
  assert.ok(part.minHeight.value.value >= MIN_TARGET_SIZE_PX, `${label} height must be at least ${MIN_TARGET_SIZE_PX}px`);
}

try {
  compile();
  const ir = JSON.parse(await readFile(irPath, "utf8"));
  for (const palette of ir.palettes) {
    const contract = palette.components.slider;
    const recipe = palette.themes.basic.components.slider;
    const background = palette.tokens["semantic.color.background"];
    assert.ok(contract, `${palette.id} must compile the Slider contract`);
    assert.ok(recipe, `${palette.id} Basic must compile Slider visuals`);
    assert.deepEqual(contract.variants, ["horizontal", "vertical"]);
    assert.equal(contract.semantics.role, "slider");
    assert.equal(contract.semantics.preferNativePrimitive, true);

    for (const variant of contract.variants) {
      for (const state of ["default", "hover"]) {
        const visual = resolve(recipe, contract, { variant, state });
        assertContrast(visual.track.border.color, visual.track.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} ${state} track inner boundary`);
        assertContrast(visual.track.border.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} ${state} track outer boundary`);
        assertContrast(visual.fill.fill, visual.track.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} ${state} filled track`);
        assertContrast(visual.thumb.border.color, visual.thumb.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} ${state} thumb inner boundary`);
        assertContrast(visual.thumb.border.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} ${state} thumb outer boundary`);
      }

      const pressed = resolve(recipe, contract, { variant, state: "pressed" });
      assertContrast(pressed.thumb.fill, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} pressed thumb`);
      assertContrast(pressed.thumb.border.color, pressed.thumb.fill, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} pressed thumb inner boundary`);

      const focused = resolve(recipe, contract, { variant, state: "focus" });
      assertContrast(focused.root.outline.color, background, MIN_NON_TEXT_CONTRAST, `${palette.id} ${variant} focus outline`);

      const disabled = resolve(recipe, contract, { variant, state: "disabled" });
      assert.equal(disabled.root.opacity.reference, "{opacity.disabled}", `${palette.id} ${variant} disabled slider must expose disabled opacity`);

      for (const size of contract.sizes) {
        const visual = resolve(recipe, contract, { variant, size });
        assertTarget(visual.root, `${palette.id} ${variant} ${size} slider root`);
        assertTarget(visual.thumb, `${palette.id} ${variant} ${size} slider thumb`);
        if (variant === "horizontal") {
          assert.equal(visual.track.minWidth.reference, `{component.slider.track.length.${size}}`);
          assert.equal(visual.track.minHeight.reference, `{component.slider.track.thickness.${size}}`);
          assert.equal(visual.fill.minHeight.reference, `{component.slider.track.thickness.${size}}`);
        } else {
          assert.equal(visual.track.minHeight.reference, `{component.slider.track.length.${size}}`);
          assert.equal(visual.track.minWidth.reference, `{component.slider.track.thickness.${size}}`);
          assert.equal(visual.fill.minWidth.reference, `{component.slider.track.thickness.${size}}`);
        }
      }
    }
  }
  console.log(`Slider accessibility, target-size and orientation geometry gates passed for ${ir.palettes.length} palette(s).`);
} finally {
  await rm(irPath, { force: true });
}
