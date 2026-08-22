// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const budgets = JSON.parse(await readFile("spec/quality/performance-budgets.json", "utf8"));
const budget = budgets.themes?.modern;

assert.ok(budget, "Modern performance budget must be defined");

const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const modern = resolveThemeDefinitions(definitions).find((theme) => theme.id === "modern");
assert.ok(modern, "Modern theme must resolve before its performance budget can be evaluated");

function countLeaves(value) {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countLeaves(child), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, child) => total + countLeaves(child), 0);
  }
  return 1;
}

function findKeys(value, predicate, path = "modern") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...findKeys(child, predicate, nextPath));
  }
  return findings;
}

const components = modern.components ?? {};
const totalLeaves = countLeaves(components);
assert.ok(
  totalLeaves <= budget.maxResolvedVisualLeaves,
  `Modern resolved visual recipe cost ${totalLeaves} exceeds budget ${budget.maxResolvedVisualLeaves}`,
);

for (const [componentId, component] of Object.entries(components)) {
  const componentLeaves = countLeaves(component);
  assert.ok(
    componentLeaves <= budget.maxComponentVisualLeaves,
    `Modern ${componentId} resolved visual recipe cost ${componentLeaves} exceeds budget ${budget.maxComponentVisualLeaves}`,
  );

  const variantCount = Object.keys(component.variants ?? {}).length;
  assert.ok(
    variantCount <= budget.maxVariantsPerComponent,
    `Modern ${componentId} has ${variantCount} variants; budget is ${budget.maxVariantsPerComponent}`,
  );

  const stateCount = Object.keys(component.states ?? {}).length;
  assert.ok(
    stateCount <= budget.maxStatesPerComponent,
    `Modern ${componentId} has ${stateCount} top-level states; budget is ${budget.maxStatesPerComponent}`,
  );
}

const forbiddenEffects = new Set(budget.forbiddenEffectKeys ?? []);
assert.deepEqual(
  findKeys(components, (key) => forbiddenEffects.has(key)),
  [],
  "Modern must remain free of effects forbidden by its performance budget",
);

const shadowPaths = findKeys(components, (key) => key === "shadow");
assert.ok(
  shadowPaths.length <= budget.maxShadowProperties,
  `Modern uses ${shadowPaths.length} shadow properties; budget is ${budget.maxShadowProperties}`,
);
assert.deepEqual(
  shadowPaths.sort(),
  ["modern.dialog.base.root.shadow", "modern.panel.base.root.shadow"],
  "Modern elevation must remain limited to Panel/Card and Dialog",
);

console.log(
  `Modern performance budget passed: ${totalLeaves}/${budget.maxResolvedVisualLeaves} resolved visual leaves, ${shadowPaths.length}/${budget.maxShadowProperties} shadow properties across ${Object.keys(components).length} components.`,
);
