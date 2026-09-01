// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const theme = JSON.parse(await readFile("spec/themes/basic.theme.json", "utf8"));
const budgets = JSON.parse(await readFile("spec/quality/performance-budgets.json", "utf8"));
const budget = budgets.themes?.basic;

assert.ok(budget, "Basic performance budget must be defined");
assert.equal(theme.theme, "basic");

function countLeaves(value) {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countLeaves(child), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, child) => total + countLeaves(child), 0);
  }
  return 1;
}

function findKeys(value, forbidden, path = "basic") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (forbidden.has(key)) findings.push(nextPath);
    findings.push(...findKeys(child, forbidden, nextPath));
  }
  return findings;
}

const components = theme.components ?? {};
const totalLeaves = countLeaves(components);
assert.ok(
  totalLeaves <= budget.maxResolvedVisualLeaves,
  `Basic visual recipe cost ${totalLeaves} exceeds budget ${budget.maxResolvedVisualLeaves}`,
);

for (const [componentId, component] of Object.entries(components)) {
  const componentLeaves = countLeaves(component);
  assert.ok(
    componentLeaves <= budget.maxComponentVisualLeaves,
    `Basic ${componentId} visual recipe cost ${componentLeaves} exceeds budget ${budget.maxComponentVisualLeaves}`,
  );

  const variantCount = Object.keys(component.variants ?? {}).length;
  assert.ok(
    variantCount <= budget.maxVariantsPerComponent,
    `Basic ${componentId} has ${variantCount} variants; budget is ${budget.maxVariantsPerComponent}`,
  );

  const stateCount = Object.keys(component.states ?? {}).length;
  assert.ok(
    stateCount <= budget.maxStatesPerComponent,
    `Basic ${componentId} has ${stateCount} top-level states; budget is ${budget.maxStatesPerComponent}`,
  );
}

const forbiddenEffects = new Set(budget.forbiddenEffectKeys ?? []);
assert.deepEqual(
  findKeys(components, forbiddenEffects),
  [],
  "Basic must remain free of effects forbidden by its performance budget",
);

console.log(
  `Basic performance budget passed: ${totalLeaves}/${budget.maxResolvedVisualLeaves} visual leaves across ${Object.keys(components).length} components.`,
);
