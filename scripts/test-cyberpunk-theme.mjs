// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const resolvedThemes = resolveThemeDefinitions(definitions);
const cyberpunkEntry = definitions.find((theme) => theme.id === "cyberpunk");
const basic = resolvedThemes.find((theme) => theme.id === "basic");
const cyberpunk = resolvedThemes.find((theme) => theme.id === "cyberpunk");

assert.ok(cyberpunkEntry, "The Cyberpunk theme must remain registered");
assert.ok(basic, "The Basic theme must resolve before validating Cyberpunk inheritance");
assert.ok(cyberpunk, "The Cyberpunk theme must resolve");
assert.equal(cyberpunkEntry.definition.theme, "cyberpunk");
assert.equal(cyberpunkEntry.definition.extends, "basic", "Cyberpunk must build directly on the portable Basic contract");
assert.deepEqual(cyberpunk.inheritance, ["basic", "cyberpunk"]);

const visualComponentIds = Object.keys(basic.components).sort();
assert.deepEqual(
  Object.keys(cyberpunk.components).sort(),
  visualComponentIds,
  "Cyberpunk must retain every Basic visual component through inheritance without claiming newly registered contracts before their visuals exist",
);

const expectedFoundation = {
  button: {
    base: {
      root: { radius: "{radius.sm}" },
    },
  },
  input: {
    base: {
      root: {
        fill: "{semantic.color.surface}",
        radius: "{radius.sm}",
        border: {
          color: "{semantic.color.accent}",
          width: "{border.width.standard}",
        },
      },
    },
    states: {
      hover: {
        root: {
          border: {
            color: "{semantic.color.focus}",
            width: "{border.width.standard}",
          },
        },
      },
    },
  },
  switch: {
    base: {
      root: {
        fill: "{semantic.color.surface}",
        radius: "{radius.sm}",
        border: {
          color: "{semantic.color.accent}",
          width: "{border.width.standard}",
        },
      },
      thumb: { radius: "{radius.sm}" },
    },
    states: {
      hover: {
        root: {
          border: {
            color: "{semantic.color.focus}",
            width: "{border.width.standard}",
          },
        },
      },
      pressed: {
        root: {
          border: {
            color: "{semantic.color.focus}",
            width: "{border.width.standard}",
          },
        },
      },
    },
  },
  panel: {
    base: {
      root: {
        fill: "{semantic.color.surface}",
        radius: "{radius.sm}",
        border: {
          color: "{semantic.color.accent}",
          width: "{border.width.standard}",
        },
        shadow: "{elevation.shadow.low}",
      },
    },
  },
  dialog: {
    base: {
      root: {
        fill: "{semantic.color.surfaceElevated}",
        radius: "{radius.sm}",
        border: {
          color: "{semantic.color.focus}",
          width: "{border.width.standard}",
        },
        shadow: "{elevation.shadow.medium}",
      },
    },
  },
};

assert.deepEqual(
  cyberpunkEntry.definition.components,
  expectedFoundation,
  "Cyberpunk direct overrides must remain a deterministic native signal-frame foundation",
);

function collectKeys(value, predicate, path = "cyberpunk") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...collectKeys(child, predicate, nextPath));
  }
  return findings;
}

const hardCodedColors = collectKeys(
  cyberpunkEntry.definition.components,
  (_key, value) => typeof value === "string" && /^(?:#|rgb\(|rgba\(|hsl\(|hsla\()/i.test(value),
);
assert.deepEqual(hardCodedColors, [], "Cyberpunk must use semantic palette roles instead of hard-coded neon colors");

const forbiddenEffectKeys = new Set(["blur", "backdropBlur", "glow"]);
assert.deepEqual(
  collectKeys(cyberpunk.components, (key) => forbiddenEffectKeys.has(key)),
  [],
  "Cyberpunk must not introduce blur, backdrop blur or glow effects",
);

const shadowPaths = collectKeys(cyberpunkEntry.definition.components, (key) => key === "shadow");
assert.deepEqual(
  shadowPaths.sort(),
  ["cyberpunk.dialog.base.root.shadow", "cyberpunk.panel.base.root.shadow"],
  "Cyberpunk elevation must stay limited to Panel/Card and Dialog",
);

const accentFramePaths = collectKeys(
  cyberpunkEntry.definition.components,
  (key, value) => key === "color" && value === "{semantic.color.accent}",
);
assert.deepEqual(
  accentFramePaths.sort(),
  [
    "cyberpunk.input.base.root.border.color",
    "cyberpunk.panel.base.root.border.color",
    "cyberpunk.switch.base.root.border.color",
  ],
  "Cyberpunk Accent signal frames must remain limited to the intended base surfaces",
);

const focusFramePaths = collectKeys(
  cyberpunkEntry.definition.components,
  (key, value) => key === "color" && value === "{semantic.color.focus}",
);
assert.deepEqual(
  focusFramePaths.sort(),
  [
    "cyberpunk.dialog.base.root.border.color",
    "cyberpunk.input.states.hover.root.border.color",
    "cyberpunk.switch.states.hover.root.border.color",
    "cyberpunk.switch.states.pressed.root.border.color",
  ],
  "Cyberpunk Focus signal frames must remain limited to interaction emphasis and Dialog",
);

for (const componentId of visualComponentIds) {
  const entry = manifest.components.find((candidate) => candidate.id === componentId);
  assert.ok(entry, `Cyberpunk visual component ${componentId} must remain backed by a registered component contract`);
  const contract = JSON.parse(await readFile(join("spec", entry.source), "utf8"));
  const visual = cyberpunk.components[componentId];

  for (const size of contract.sizes ?? []) {
    assert.ok(visual.sizes?.[size], `Cyberpunk ${componentId} must inherit declared ${size} sizing`);
  }

  for (const state of (contract.states ?? []).filter((state) => state !== "default")) {
    const topLevelCoverage = Boolean(visual.states?.[state]);
    const variants = Object.values(visual.variants ?? {});
    const variantCoverage = variants.length > 0 && variants.every((variant) => Boolean(variant.states?.[state]));
    assert.ok(
      topLevelCoverage || variantCoverage,
      `Cyberpunk ${componentId} must retain styling for declared state ${state}`,
    );
  }
}

for (const [componentId, component] of Object.entries(cyberpunk.components)) {
  assert.equal(
    Object.keys(component.fallbacks ?? {}).length,
    0,
    `Cyberpunk ${componentId} must not need capability fallbacks for its native foundation`,
  );
}

const irPath = "build/spec-ir-cyberpunk-theme-test.json";
function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  const ir = JSON.parse(await readFile(irPath, "utf8"));
  const compiled = {};
  for (const paletteId of ["reference-dark", "reference-light"]) {
    const palette = ir.palettes.find((entry) => entry.id === paletteId);
    assert.ok(palette, `Compiled IR must contain ${paletteId}`);
    const components = palette.themes?.cyberpunk?.components;
    assert.ok(components?.panel, `${paletteId} must compile the Cyberpunk theme`);
    assert.equal(components.button.base.root.radius.reference, "{radius.sm}");
    assert.equal(components.input.base.root.border.color.reference, "{semantic.color.accent}");
    assert.equal(components.panel.base.root.shadow.reference, "{elevation.shadow.low}");
    assert.equal(components.dialog.base.root.shadow.reference, "{elevation.shadow.medium}");
    assert.equal(components.panel.base.root.backdropBlur, undefined);
    compiled[paletteId] = components;
  }

  assert.deepEqual(
    compiled["reference-dark"].panel.base.root.radius.value,
    compiled["reference-light"].panel.base.root.radius.value,
    "Cyberpunk geometry must remain palette-neutral",
  );
  assert.notDeepEqual(
    compiled["reference-dark"].input.base.root.border.color.value,
    compiled["reference-light"].input.base.root.border.color.value,
    "Cyberpunk semantic signal frames must follow the active palette",
  );
} finally {
  await rm(irPath, { force: true });
}

console.log(
  "Cyberpunk inherits the complete Basic contract and establishes sharp, palette-driven native signal frames with bounded Panel/Dialog elevation and no blur/glow effects.",
);
