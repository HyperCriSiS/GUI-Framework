// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const basicEntry = manifest.themes.find((theme) => theme.id === "basic");
assert.ok(basicEntry, "The Basic theme must remain registered");
const basic = JSON.parse(await readFile(join("spec", basicEntry.source), "utf8"));
assert.equal(basic.theme, "basic");
const referenceComponentIds = ["button", "checkbox", "data-grid", "dialog", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip"];
const componentEntries = manifest.components.filter((entry) => referenceComponentIds.includes(entry.id)).sort((left, right) => left.id.localeCompare(right.id));
const visualComponentIds = Object.keys(basic.components).sort();
assert.deepEqual(visualComponentIds,referenceComponentIds,"Basic quality gate must cover the completed reference visual set including Phase 6 additions");
const functionalStateIds = new Set(["hover", "focus", "pressed", "checked", "selected", "loading", "error", "indeterminate"]);
const expensiveEffectKeys = new Set(["blur", "backdropBlur", "glow"]);
function containsExpensiveEffect(value,path="root"){if(!value||typeof value!=="object")return[];const findings=[];for(const[key,child]of Object.entries(value)){const nextPath=`${path}.${key}`;if(expensiveEffectKeys.has(key))findings.push(nextPath);findings.push(...containsExpensiveEffect(child,nextPath));}return findings;}
for(const entry of componentEntries){const recipe=JSON.parse(await readFile(join("spec",entry.source),"utf8"));const visual=basic.components[entry.id];assert.ok(visual?.base,`Basic ${entry.id} must define a base visual recipe`);for(const size of recipe.sizes??[])assert.ok(visual.sizes?.[size],`Basic ${entry.id} must define its declared ${size} size`);for(const state of (recipe.states??[]).filter((state)=>state!=="default")){const topLevelCoverage=Boolean(visual.states?.[state]);const variants=Object.values(visual.variants??{});const variantCoverage=variants.length>0&&variants.every((variant)=>Boolean(variant.states?.[state]));assert.ok(topLevelCoverage||variantCoverage,`Basic ${entry.id} must style declared state ${state} either globally or for every variant`);}const needsFunctionalMotion=(recipe.states??[]).some((state)=>functionalStateIds.has(state));const transition=visual.base?.root?.transition;if(needsFunctionalMotion)assert.equal(transition,"{motion.interaction.fast}",`Basic ${entry.id} must use the shared fast functional interaction transition`);else assert.equal(transition,undefined,`Basic ${entry.id} must stay static when it has no interactive visual states`);assert.deepEqual(recipe.capabilities?.required??[],[],`Basic ${entry.id} must not require enhanced renderer capabilities`);assert.deepEqual(containsExpensiveEffect(visual,`basic.${entry.id}`),[],`Basic ${entry.id} must stay free of blur/backdrop-blur/glow effects`);}
console.log("Basic theme reference coverage, size/state styling, functional motion and minimum-capability cost guards passed.");
