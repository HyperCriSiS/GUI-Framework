// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const budgets = JSON.parse(await readFile("spec/quality/performance-budgets.json", "utf8"));
const budget = budgets.themes?.glass;

assert.ok(budget, "Glass performance budget must be defined");

const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const glass = resolveThemeDefinitions(definitions).find((theme) => theme.id === "glass");
assert.ok(glass, "Glass theme must resolve before its performance budget can be evaluated");

function countLeaves(value) {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countLeaves(child), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, child) => total + countLeaves(child), 0);
  }
  return 1;
}

function findKeys(value, predicate, path = "glass") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...findKeys(child, predicate, nextPath));
  }
  return findings;
}

const components = glass.components ?? {};
const totalLeaves = countLeaves(components);
assert.ok(
  totalLeaves <= budget.maxResolvedVisualLeaves,
  `Glass resolved visual recipe cost ${totalLeaves} exceeds budget ${budget.maxResolvedVisualLeaves}`,
);

for (const [componentId, component] of Object.entries(components)) {
  const componentLeaves = countLeaves(component);
  assert.ok(
    componentLeaves <= budget.maxComponentVisualLeaves,
    `Glass ${componentId} resolved visual recipe cost ${componentLeaves} exceeds budget ${budget.maxComponentVisualLeaves}`,
  );

  const variantCount = Object.keys(component.variants ?? {}).length;
  assert.ok(
    variantCount <= budget.maxVariantsPerComponent,
    `Glass ${componentId} has ${variantCount} variants; budget is ${budget.maxVariantsPerComponent}`,
  );

  const stateCount = Object.keys(component.states ?? {}).length;
  assert.ok(
    stateCount <= budget.maxStatesPerComponent,
    `Glass ${componentId} has ${stateCount} top-level states; budget is ${budget.maxStatesPerComponent}`,
  );
}

const forbiddenEffects = new Set(budget.forbiddenEffectKeys ?? []);
assert.deepEqual(
  findKeys(components, (key) => forbiddenEffects.has(key)),
  [],
  "Glass must remain free of blur, backdrop blur and glow in its resolved recipe",
);

const shadowPaths = findKeys(components, (key) => key === "shadow");
assert.ok(
  shadowPaths.length <= budget.maxShadowProperties,
  `Glass uses ${shadowPaths.length} shadow properties; budget is ${budget.maxShadowProperties}`,
);
assert.deepEqual(
  shadowPaths.sort(),
  ["glass.dialog.base.root.shadow", "glass.panel.base.root.shadow"],
  "Glass elevation must remain limited to Panel/Card and Dialog",
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
  `Glass uses ${translucentFillPaths.length} translucent fill properties; budget is ${budget.maxTranslucentFillProperties}`,
);
assert.deepEqual(
  translucentFillPaths.sort(),
  ["glass.dialog.base.root.fill", "glass.panel.base.root.fill"],
  "Glass translucency must remain limited to Panel/Card and Dialog surfaces",
);

console.log(
  `Glass performance budget passed: ${totalLeaves}/${budget.maxResolvedVisualLeaves} resolved visual leaves, ${shadowPaths.length}/${budget.maxShadowProperties} shadows and ${translucentFillPaths.length}/${budget.maxTranslucentFillProperties} translucent fills.`,
);
