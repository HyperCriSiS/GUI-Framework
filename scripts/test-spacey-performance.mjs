// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const budgets = JSON.parse(await readFile("spec/quality/performance-budgets.json", "utf8"));
const budget = budgets.themes?.spacey;
assert.ok(budget, "Spacey performance budget must be defined");

const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const spacey = resolveThemeDefinitions(definitions).find((theme) => theme.id === "spacey");
assert.ok(spacey, "Spacey theme must resolve before its performance budget can be evaluated");

function countLeaves(value) {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countLeaves(child), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, child) => total + countLeaves(child), 0);
  }
  return 1;
}

function findKeys(value, forbidden, path = "spacey") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (forbidden.has(key)) findings.push(nextPath);
    findings.push(...findKeys(child, forbidden, nextPath));
  }
  return findings;
}

const components = spacey.components ?? {};
const totalLeaves = countLeaves(components);
assert.ok(
  totalLeaves <= budget.maxResolvedVisualLeaves,
  `Spacey resolved visual recipe cost ${totalLeaves} exceeds budget ${budget.maxResolvedVisualLeaves}`,
);

for (const [componentId, component] of Object.entries(components)) {
  const componentLeaves = countLeaves(component);
  assert.ok(
    componentLeaves <= budget.maxComponentVisualLeaves,
    `Spacey ${componentId} resolved visual recipe cost ${componentLeaves} exceeds budget ${budget.maxComponentVisualLeaves}`,
  );

  const variantCount = Object.keys(component.variants ?? {}).length;
  assert.ok(
    variantCount <= budget.maxVariantsPerComponent,
    `Spacey ${componentId} has ${variantCount} variants; budget is ${budget.maxVariantsPerComponent}`,
  );

  const stateCount = Object.keys(component.states ?? {}).length;
  assert.ok(
    stateCount <= budget.maxStatesPerComponent,
    `Spacey ${componentId} has ${stateCount} top-level states; budget is ${budget.maxStatesPerComponent}`,
  );
}

const forbiddenEffects = new Set(budget.forbiddenEffectKeys ?? []);
assert.deepEqual(
  findKeys(components, forbiddenEffects),
  [],
  "Spacey must remain free of shadow, blur, backdrop blur and glow effects",
);

for (const [componentId, component] of Object.entries(components)) {
  assert.equal(
    Object.keys(component.fallbacks ?? {}).length,
    0,
    `Spacey ${componentId} must not need capability fallbacks for its native instrumentation foundation`,
  );
}

console.log(
  `Spacey performance budget passed: ${totalLeaves}/${budget.maxResolvedVisualLeaves} resolved visual leaves across ${Object.keys(components).length} components with zero expensive effect keys.`,
);
