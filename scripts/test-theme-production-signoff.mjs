// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { access, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolveComponentVisualRecipe } from "../packages/compiler/src/theme-resolution.mjs";

const irPath = "build/spec-ir-theme-production-signoff.json";
const themeIds = ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"];
const visualInteractionStates = new Set([
  "hover",
  "pressed",
  "focus",
  "checked",
  "selected",
  "indeterminate",
  "expanded",
  "error",
  "disabled",
  "loading",
]);

function runNodeScript(script, label) {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function compile() {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

function visualKey(value) {
  return JSON.stringify(stable(value));
}

function resolve(recipe, contract, { variant, size, state } = {}) {
  return resolveComponentVisualRecipe(recipe, {
    variant,
    size,
    activeStates: state && state !== "default" ? [state] : [],
    statePriority: contract.states,
  });
}

function representativeSizes(contract) {
  const sizes = Array.isArray(contract.sizes) ? contract.sizes : [];
  if (sizes.includes("medium")) return ["medium"];
  return sizes.length > 0 ? [sizes[0]] : [undefined];
}

function representativeVariants(contract) {
  const variants = Array.isArray(contract.variants) ? contract.variants : [];
  return variants.length > 0 ? variants : [undefined];
}

function verifyInteractionStateVisibility(ir) {
  let checks = 0;
  const checksPerTheme = new Map(themeIds.map((themeId) => [themeId, 0]));

  for (const palette of ir.palettes) {
    for (const themeId of themeIds) {
      const theme = palette.themes?.[themeId];
      assert.ok(theme, `${palette.id} must compile ${themeId}`);

      for (const [componentId, contract] of Object.entries(palette.components ?? {})) {
        const recipe = theme.components?.[componentId];
        assert.ok(recipe, `${palette.id}/${themeId} must compile ${componentId}`);
        const states = (contract.states ?? []).filter((state) => visualInteractionStates.has(state));
        if (states.length === 0) continue;

        for (const state of states) {
          let visuallyDistinct = false;
          for (const size of representativeSizes(contract)) {
            for (const variant of representativeVariants(contract)) {
              const base = resolve(recipe, contract, { variant, size, state: "default" });
              const active = resolve(recipe, contract, { variant, size, state });
              if (visualKey(base) !== visualKey(active)) {
                visuallyDistinct = true;
                break;
              }
            }
            if (visuallyDistinct) break;
          }
          assert.ok(
            visuallyDistinct,
            `${palette.id}/${themeId}/${componentId} declares ${state} but resolves no visible change from default`,
          );
          checks += 1;
          checksPerTheme.set(themeId, checksPerTheme.get(themeId) + 1);
        }
      }
    }
  }

  assert.ok(checks > 0, "Production sign-off must exercise declared interaction states");
  for (const themeId of themeIds) {
    assert.ok(checksPerTheme.get(themeId) > 0, `${themeId} must participate in interaction-state sign-off`);
  }
  return checks;
}

async function verifyComplexScreenEvidence() {
  const [browserSource, showcaseSource] = await Promise.all([
    readFile("tests/browser/theme-visual-baselines.spec.mjs", "utf8"),
    readFile(
      "examples/showcase-shared/src/main/kotlin/gui/framework/examples/showcase/ShowcaseExplorerContent.kt",
      "utf8",
    ),
  ]);

  for (const themeId of themeIds) {
    assert.ok(browserSource.includes(`\"${themeId}\"`), `Complex browser baseline must cover ${themeId}`);
    await access(`tests/browser/__snapshots__/theme-visual-baselines.spec.mjs/${themeId}-complex-desktop.png`);
  }
  assert.match(browserSource, /width:\s*1280/);
  assert.match(browserSource, /height:\s*900/);
  assert.match(browserSource, /Review changes/);
  assert.match(browserSource, /Review settings/);
  assert.match(showcaseSource, /Stress Lab/);
  assert.match(showcaseSource, /Dashboard/);
  assert.match(showcaseSource, /Data Explorer/);
  assert.match(showcaseSource, /Settings/);
  assert.match(showcaseSource, /1000/);
}

try {
  compile();
  const ir = JSON.parse(await readFile(irPath, "utf8"));
  assert.ok(
    Array.isArray(ir.palettes) && ir.palettes.length >= 2,
    "Production sign-off requires both reference palettes",
  );

  const interactionChecks = verifyInteractionStateVisibility(ir);
  await verifyComplexScreenEvidence();

  runNodeScript("scripts/test-accessibility.mjs", "Accessibility/contrast sign-off");
  for (const themeId of themeIds) {
    const scriptId = themeId === "frosted-glass" ? "frosted" : themeId;
    runNodeScript(`scripts/test-${scriptId}-performance.mjs`, `${themeId} performance sign-off`);
  }

  console.log(
    `Final six-theme production sign-off passed: ${interactionChecks} palette/theme interaction-state checks, ` +
      "semantic/WCAG contrast gates, all six theme performance budgets, six complex browser baselines, and Showcase stress coverage.",
  );
} finally {
  await rm(irPath, { force: true });
}
