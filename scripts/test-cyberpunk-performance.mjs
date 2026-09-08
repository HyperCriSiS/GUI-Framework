// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveThemeDefinitions } from "../packages/compiler/src/theme-resolution.mjs";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const budgets = JSON.parse(await readFile("spec/quality/performance-budgets.json", "utf8"));
const budget = budgets.themes?.cyberpunk;
assert.ok(budget, "Cyberpunk performance budget must be defined");

const definitions = await Promise.all(
  manifest.themes.map(async (entry) => ({
    ...entry,
    definition: JSON.parse(await readFile(join("spec", entry.source), "utf8")),
  })),
);
const resolvedThemes = resolveThemeDefinitions(definitions);
const basic = resolvedThemes.find((theme) => theme.id === "basic");
const cyberpunk = resolvedThemes.find((theme) => theme.id === "cyberpunk");
assert.ok(basic, "Basic theme must resolve before Cyberpunk graph growth can be evaluated");
assert.ok(cyberpunk, "Cyberpunk theme must resolve before its performance budget can be evaluated");

function countLeaves(value) {
  if (Array.isArray(value)) return value.reduce((total, child) => total + countLeaves(child), 0);
  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, child) => total + countLeaves(child), 0);
  }
  return 1;
}

function leafPaths(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) => leafPaths(child, [...path, String(index)]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, [...path, key]));
  }
  return [path.join(".")];
}

function findKeys(value, predicate, path = "cyberpunk") {
  if (!value || typeof value !== "object") return [];
  const findings = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (predicate(key, child)) findings.push(nextPath);
    findings.push(...findKeys(child, predicate, nextPath));
  }
  return findings;
}

const components = cyberpunk.components ?? {};
const basicComponents = basic.components ?? {};
const totalLeaves = countLeaves(components);
const basicLeaves = countLeaves(basicComponents);
assert.equal(
  totalLeaves,
  basicLeaves + 2,
  "Cyberpunk production maturity may grow the Basic visual graph only by Panel and Dialog elevation",
);
assert.ok(
  totalLeaves <= budget.maxResolvedVisualLeaves,
  `Cyberpunk resolved visual recipe cost ${totalLeaves} exceeds budget ${budget.maxResolvedVisualLeaves}`,
);

const basicLeafPaths = new Set(leafPaths(basicComponents));
assert.deepEqual(
  leafPaths(components).filter((path) => !basicLeafPaths.has(path)).sort(),
  ["dialog.base.root.shadow", "panel.base.root.shadow"],
  "Cyberpunk resolved graph growth must be exactly the two budgeted shadow leaves",
);

for (const [componentId, component] of Object.entries(components)) {
  const componentLeaves = countLeaves(component);
  assert.ok(
    componentLeaves <= budget.maxComponentVisualLeaves,
    `Cyberpunk ${componentId} resolved visual recipe cost ${componentLeaves} exceeds budget ${budget.maxComponentVisualLeaves}`,
  );

  const variantCount = Object.keys(component.variants ?? {}).length;
  assert.ok(
    variantCount <= budget.maxVariantsPerComponent,
    `Cyberpunk ${componentId} has ${variantCount} variants; budget is ${budget.maxVariantsPerComponent}`,
  );

  const stateCount = Object.keys(component.states ?? {}).length;
  assert.ok(
    stateCount <= budget.maxStatesPerComponent,
    `Cyberpunk ${componentId} has ${stateCount} top-level states; budget is ${budget.maxStatesPerComponent}`,
  );

  assert.equal(
    Object.keys(component.fallbacks ?? {}).length,
    0,
    `Cyberpunk ${componentId} must not need capability fallbacks for its native signal-frame language`,
  );
}

const forbiddenEffects = new Set(budget.forbiddenEffectKeys ?? []);
assert.deepEqual(
  findKeys(components, (key) => forbiddenEffects.has(key)),
  [],
  "Cyberpunk must remain free of blur, backdrop blur and glow effects",
);

const shadowPaths = findKeys(components, (key) => key === "shadow");
assert.equal(
  shadowPaths.length,
  budget.maxShadowProperties,
  `Cyberpunk must use exactly its intentional ${budget.maxShadowProperties}-shadow elevation budget`,
);
assert.deepEqual(
  shadowPaths.sort(),
  ["cyberpunk.dialog.base.root.shadow", "cyberpunk.panel.base.root.shadow"],
  "Cyberpunk elevation must remain limited to Panel/Card and Dialog",
);

console.log(
  `Cyberpunk performance budget passed: ${totalLeaves}/${budget.maxResolvedVisualLeaves} resolved visual leaves (${totalLeaves - basicLeaves} intentional growth vs Basic), ${shadowPaths.length}/${budget.maxShadowProperties} shadow properties across ${Object.keys(components).length} components.`,
);
