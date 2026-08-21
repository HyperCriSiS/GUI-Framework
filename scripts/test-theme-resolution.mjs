// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const repositoryThemeDefinitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const repositoryThemes = resolveThemeDefinitions(repositoryThemeDefinitions);
const modernDefinition = repositoryThemeDefinitions.find((theme) => theme.id === "modern");
const modern = repositoryThemes.find((theme) => theme.id === "modern");

assert.ok(modernDefinition, "The Modern theme must remain registered");
assert.ok(modern, "The Modern theme must resolve");
assert.equal(modernDefinition.definition.extends, "basic");
assert.deepEqual(modern.inheritance, ["basic", "modern"]);
assert.deepEqual(
  Object.keys(modern.components).sort(),
  manifest.components.map((entry) => entry.id).sort(),
  "Modern must retain every registered reference component through Basic inheritance",
);

const modernGeometry = {
  button: { root: "{radius.lg}" },
  input: { root: "{radius.lg}" },
  switch: { root: "{radius.pill}", thumb: "{radius.pill}" },
  panel: { root: "{radius.xl}" },
  dialog: { root: "{radius.xl}" },
};

for (const [componentId, parts] of Object.entries(modernGeometry)) {
  const directBase = modernDefinition.definition.components[componentId]?.base;
  assert.ok(directBase, `Modern ${componentId} must define its geometry override`);
  for (const [partId, radius] of Object.entries(parts)) {
    assert.deepEqual(
      directBase[partId],
      { radius },
      `Modern ${componentId}.${partId} foundation must stay isolated to geometry`,
    );
    assert.equal(modern.components[componentId].base[partId].radius, radius);
  }
}

const unsupportedModernEffects = new Set(["shadow", "blur", "backdropBlur", "glow"]);
function collectMatchingPaths(value, predicate, path = "modern") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...collectMatchingPaths(child, predicate, nextPath));
  }
  return findings;
}

assert.deepEqual(
  collectMatchingPaths(
    modernDefinition.definition.components,
    (key) => unsupportedModernEffects.has(key),
  ),
  [],
  "Modern foundation must not introduce effects that Web and Compose cannot map yet",
);
assert.deepEqual(
  collectMatchingPaths(
    modernDefinition.definition.components,
    (_key, value) => typeof value === "string" && value.startsWith("{semantic.color."),
  ),
  [],
  "Modern geometry must remain independent from palette selection",
);

for (const entry of manifest.components) {
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = modern.components[entry.id];
  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Modern ${entry.id} must inherit declared ${size} sizing`);
  }
  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Modern ${entry.id} must retain styling for declared state ${state}`,
    );
  }
}

console.log(
  "Repository Modern theme inherits Basic and establishes palette-neutral rounded geometry without unsupported effects.",
);
