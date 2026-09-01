// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const budgets = JSON.parse(await readFile("spec/quality/performance-budgets.json", "utf8"));
const budget = budgets.themes?.["frosted-glass"];

assert.ok(budget, "Frosted Glass performance budget must be defined");

const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const frosted = resolveThemeDefinitions(definitions).find((theme) => theme.id === "frosted-glass");
assert.ok(frosted, "Frosted Glass theme must resolve before its performance budget can be evaluated");

function countLeaves(value) {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countLeaves(child), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, child) => total + countLeaves(child), 0);
  }
  return 1;
}

function findKeys(value, predicate, path = "frosted-glass") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...findKeys(child, predicate, nextPath));
  }
  return findings;
}

const components = frosted.components ?? {};
const totalLeaves = countLeaves(components);
assert.ok(
  totalLeaves <= budget.maxResolvedVisualLeaves,
  `Frosted Glass resolved visual recipe cost ${totalLeaves} exceeds budget ${budget.maxResolvedVisualLeaves}`,
);

for (const [componentId, component] of Object.entries(components)) {
  const componentLeaves = countLeaves(component);
  assert.ok(
    componentLeaves <= budget.maxComponentVisualLeaves,
    `Frosted Glass ${componentId} resolved visual recipe cost ${componentLeaves} exceeds budget ${budget.maxComponentVisualLeaves}`,
  );

  const variantCount = Object.keys(component.variants ?? {}).length;
  assert.ok(
    variantCount <= budget.maxVariantsPerComponent,
    `Frosted Glass ${componentId} has ${variantCount} variants; budget is ${budget.maxVariantsPerComponent}`,
  );

  const stateCount = Object.keys(component.states ?? {}).length;
  assert.ok(
    stateCount <= budget.maxStatesPerComponent,
    `Frosted Glass ${componentId} has ${stateCount} top-level states; budget is ${budget.maxStatesPerComponent}`,
  );
}

const forbiddenEffects = new Set(budget.forbiddenEffectKeys ?? []);
assert.deepEqual(
  findKeys(components, (key) => forbiddenEffects.has(key)),
  [],
  "Frosted Glass must remain free of non-backdrop blur and glow effects",
);

const shadowPaths = findKeys(components, (key) => key === "shadow");
assert.ok(
  shadowPaths.length <= budget.maxShadowProperties,
  `Frosted Glass uses ${shadowPaths.length} shadow properties; budget is ${budget.maxShadowProperties}`,
);
assert.deepEqual(
  shadowPaths.sort(),
  ["frosted-glass.dialog.base.root.shadow", "frosted-glass.panel.base.root.shadow"],
  "Frosted Glass elevation must remain limited to Panel/Card and Dialog",
);

const translucentFillPaths = findKeys(
  components,
  (key, child) =>
    key === "fill" &&
    typeof child === "string" &&
    [
      "{semantic.color.surfaceTranslucent}",
      "{semantic.color.surfaceElevatedTranslucent}",
    ].includes(child),
);
assert.ok(
  translucentFillPaths.length <= budget.maxTranslucentFillProperties,
  `Frosted Glass uses ${translucentFillPaths.length} translucent fill properties; budget is ${budget.maxTranslucentFillProperties}`,
);
assert.deepEqual(
  translucentFillPaths.sort(),
  ["frosted-glass.dialog.base.root.fill", "frosted-glass.panel.base.root.fill"],
  "Frosted Glass translucency must remain limited to Panel/Card and Dialog surfaces",
);

const backdropBlurPaths = findKeys(components, (key) => key === "backdropBlur");
assert.ok(
  backdropBlurPaths.length <= budget.maxBackdropBlurProperties,
  `Frosted Glass uses ${backdropBlurPaths.length} backdrop-blur properties; budget is ${budget.maxBackdropBlurProperties}`,
);
assert.deepEqual(
  backdropBlurPaths.sort(),
  [
    "frosted-glass.dialog.fallbacks.high.recipe.base.root.backdropBlur",
    "frosted-glass.panel.fallbacks.high.recipe.base.root.backdropBlur",
  ],
  "Frosted Glass backdrop blur must remain limited to Panel/Card and Dialog high-capability fallbacks",
);

for (const [componentId, component] of Object.entries(components)) {
  const fallbackCount = Object.keys(component.fallbacks ?? {}).length;
  assert.ok(
    fallbackCount <= budget.maxCapabilityFallbacksPerComponent,
    `Frosted Glass ${componentId} has ${fallbackCount} capability fallbacks; budget is ${budget.maxCapabilityFallbacksPerComponent}`,
  );
  if (["panel", "dialog"].includes(componentId)) {
    assert.equal(fallbackCount, 1, `Frosted Glass ${componentId} must expose exactly one high-capability blur fallback`);
  } else {
    assert.equal(fallbackCount, 0, `Frosted Glass ${componentId} must not gain capability effects`);
  }
}

console.log(
  `Frosted Glass performance budget passed: ${totalLeaves}/${budget.maxResolvedVisualLeaves} resolved visual leaves, ${shadowPaths.length}/${budget.maxShadowProperties} shadows, ${translucentFillPaths.length}/${budget.maxTranslucentFillProperties} translucent fills and ${backdropBlurPaths.length}/${budget.maxBackdropBlurProperties} backdrop blurs.`,
);
