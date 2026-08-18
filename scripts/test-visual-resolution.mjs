// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import {
  compileVisualRecipe,
  mergeCompiledVisualRecipes,
} from "../packages/compiler/src/visual-resolution.mjs";

const tokens = new Map([
  [
    "semantic.color.accent",
    {
      type: "color",
      value: { colorSpace: "srgb", components: [0.2, 0.4, 0.8], hex: "#3366CC" },
      trace: [
        { token: "semantic.color.accent", source: "tokens/primitives.tokens.json" },
        { token: "palette.accent500", source: "palettes/reference-dark.tokens.json" },
      ],
    },
  ],
  [
    "semantic.color.onAccent",
    {
      type: "color",
      value: { colorSpace: "srgb", components: [1, 1, 1], hex: "#FFFFFF" },
      trace: [{ token: "semantic.color.onAccent", source: "tokens/primitives.tokens.json" }],
    },
  ],
  [
    "radius.control",
    {
      type: "dimension",
      value: { value: 8, unit: "px" },
      trace: [{ token: "radius.control", source: "tokens/primitives.tokens.json" }],
    },
  ],
  [
    "spacing.xs",
    {
      type: "dimension",
      value: { value: 4, unit: "px" },
      trace: [{ token: "spacing.xs", source: "tokens/primitives.tokens.json" }],
    },
  ],
  [
    "opacity.disabled",
    {
      type: "number",
      value: 0.5,
      trace: [{ token: "opacity.disabled", source: "tokens/primitives.tokens.json" }],
    },
  ],
  [
    "motion.interaction.fast",
    {
      type: "transition",
      value: {
        duration: { value: 120, unit: "ms" },
        delay: { value: 0, unit: "ms" },
        timingFunction: [0.2, 0, 0, 1],
      },
      trace: [{ token: "motion.interaction.fast", source: "tokens/primitives.tokens.json" }],
    },
  ],
  [
    "palette.accent500",
    {
      type: "color",
      value: { colorSpace: "srgb", components: [0.2, 0.4, 0.8], hex: "#3366CC" },
      trace: [{ token: "palette.accent500", source: "palettes/reference-dark.tokens.json" }],
    },
  ],
]);

const resolveToken = (path) => {
  const token = tokens.get(path);
  if (!token) throw new Error(`Unknown test token ${path}`);
  return token;
};

const parent = compileVisualRecipe(
  {
    base: {
      root: {
        fill: "{semantic.color.accent}",
        radius: "{radius.control}",
        border: {
          color: "{semantic.color.onAccent}",
          width: "{spacing.xs}",
        },
        transition: "{motion.interaction.fast}",
      },
    },
    states: {
      disabled: {
        root: { opacity: "{opacity.disabled}" },
      },
    },
    fallbacks: {
      standard: {
        requires: ["advancedBlendModes"],
        recipe: {
          base: {
            root: { glow: "{radius.control}" },
          },
        },
      },
    },
  },
  resolveToken,
  { theme: "parent", source: "themes/parent.theme.json" },
);

assert.equal(parent.base.root.fill.type, "color");
assert.equal(parent.base.root.fill.value.hex, "#3366CC");
assert.deepEqual(
  parent.base.root.fill.trace.map((entry) => entry.token),
  ["semantic.color.accent", "palette.accent500"],
);
assert.deepEqual(parent.base.root.fill.themeTrace, [
  { theme: "parent", source: "themes/parent.theme.json" },
]);
assert.equal(parent.base.root.radius.type, "dimension");
assert.equal(parent.base.root.transition.type, "transition");
assert.equal(parent.states.disabled.root.opacity.type, "number");
assert.equal(parent.base.root.border.color.type, "color");
assert.equal(parent.base.root.border.width.type, "dimension");
assert.deepEqual(parent.fallbacks.standard.requires, ["advancedBlendModes"]);
assert.equal(parent.fallbacks.standard.recipe.base.root.glow.type, "dimension");

const child = compileVisualRecipe(
  {
    base: {
      root: {
        fill: "{semantic.color.onAccent}",
      },
    },
  },
  resolveToken,
  { theme: "child", source: "themes/child.theme.json" },
);

const merged = mergeCompiledVisualRecipes(parent, child);
assert.equal(merged.base.root.fill.reference, "{semantic.color.onAccent}");
assert.deepEqual(merged.base.root.fill.themeTrace, [
  { theme: "child", source: "themes/child.theme.json" },
]);
assert.equal(
  merged.base.root.radius.reference,
  "{radius.control}",
  "child override must preserve unrelated inherited visual fields",
);

assert.throws(
  () =>
    compileVisualRecipe(
      { base: { root: { fill: "{palette.accent500}" } } },
      resolveToken,
      { theme: "bad", source: "themes/bad.theme.json" },
    ),
  /must not reference raw palette token/,
);

assert.throws(
  () =>
    compileVisualRecipe(
      { base: { root: { fill: "{radius.control}" } } },
      resolveToken,
      { theme: "bad", source: "themes/bad.theme.json" },
    ),
  /requires color but resolves to dimension/,
);

console.log("Theme visual and fallback references compile to typed values with provenance.");
