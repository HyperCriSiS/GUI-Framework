// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import {
  deepMerge,
  resolveComponentVisualRecipe,
  resolveThemeDefinitions,
} from "../packages/compiler/src/theme-resolution.mjs";

const themes = resolveThemeDefinitions([
  {
    id: "parent",
    name: "Parent",
    source: "parent.theme.json",
    definition: {
      recommendedPalette: "reference-dark",
      components: {
        button: {
          base: {
            root: {
              fill: "{semantic.color.background}",
              border: {
                color: "{semantic.color.border}",
                width: "{spacing.xs}",
              },
            },
          },
        },
      },
    },
  },
  {
    id: "child",
    name: "Child",
    source: "child.theme.json",
    definition: {
      extends: "parent",
      components: {
        button: {
          base: {
            root: {
              fill: "{semantic.color.accent}",
            },
          },
        },
      },
    },
  },
]);

const child = themes.find((theme) => theme.id === "child");
assert.deepEqual(child.inheritance, ["parent", "child"]);
assert.equal(child.recommendedPalette, "reference-dark");
assert.equal(
  child.components.button.base.root.fill,
  "{semantic.color.accent}",
  "child must override the inherited fill",
);
assert.deepEqual(
  child.components.button.base.root.border,
  {
    color: "{semantic.color.border}",
    width: "{spacing.xs}",
  },
  "nested inherited properties must survive unrelated child overrides",
);

assert.throws(
  () =>
    resolveThemeDefinitions([
      {
        id: "a",
        name: "A",
        source: "a.theme.json",
        definition: { extends: "b", components: {} },
      },
      {
        id: "b",
        name: "B",
        source: "b.theme.json",
        definition: { extends: "a", components: {} },
      },
    ]),
  /Theme inheritance cycle/,
);

assert.throws(
  () =>
    resolveThemeDefinitions([
      {
        id: "orphan",
        name: "Orphan",
        source: "orphan.theme.json",
        definition: { extends: "missing", components: {} },
      },
    ]),
  /extends unknown theme missing/,
);

assert.deepEqual(
  deepMerge(
    { root: { shadows: ["parent-a", "parent-b"] } },
    { root: { shadows: ["child"] } },
  ),
  { root: { shadows: ["child"] } },
  "ordered arrays must replace rather than concatenate",
);

const visual = {
  base: {
    root: {
      fill: "{semantic.color.background}",
      radius: "{radius.md}",
    },
  },
  sizes: {
    small: {
      root: {
        radius: "{radius.sm}",
      },
    },
  },
  states: {
    hover: {
      root: {
        foreground: "{semantic.color.accentHover}",
      },
    },
    disabled: {
      root: {
        opacity: "{opacity.disabled}",
      },
    },
  },
  variants: {
    primary: {
      base: {
        root: {
          fill: "{semantic.color.accent}",
        },
      },
      sizes: {
        small: {
          root: {
            radius: "{radius.control}",
          },
        },
      },
      states: {
        hover: {
          root: {
            fill: "{semantic.color.accentHover}",
          },
        },
      },
    },
  },
};

const statePriority = ["default", "hover", "pressed", "disabled"];

const first = resolveComponentVisualRecipe(visual, {
  variant: "primary",
  size: "small",
  activeStates: ["disabled", "hover"],
  statePriority,
});

const second = resolveComponentVisualRecipe(visual, {
  variant: "primary",
  size: "small",
  activeStates: ["hover", "disabled"],
  statePriority,
});

assert.deepEqual(first, second, "active-state input order must not affect visual output");
assert.deepEqual(first, {
  root: {
    fill: "{semantic.color.accentHover}",
    radius: "{radius.control}",
    foreground: "{semantic.color.accentHover}",
    opacity: "{opacity.disabled}",
  },
});

assert.throws(
  () =>
    resolveComponentVisualRecipe(visual, {
      activeStates: ["unknown"],
      statePriority,
    }),
  /has no declared priority/,
);

console.log("Theme inheritance and component visual override resolution are deterministic.");
