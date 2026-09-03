// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { analyzeThemeAvailability } from "../packages/compiler/src/theme-availability.mjs";

const first = "build/spec-ir-test-a.json";
const second = "build/spec-ir-test-b.json";

function compile(output) {
  const result = spawnSync(process.execPath,["packages/compiler/src/index.mjs","--output",output],{encoding:"utf8"});
  if (result.status !== 0) throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  compile(first); compile(second);
  const [a,b]=await Promise.all([readFile(first,"utf8"),readFile(second,"utf8")]);
  assert.equal(a,b,"The compiler must produce byte-identical output for identical inputs");
  const ir=JSON.parse(a);
  assert.deepEqual(ir.themes.map((theme)=>theme.id),["basic","modern","glass","frosted-glass","spacey","cyberpunk"],"The initial theme registry must remain stable");
  assert.deepEqual(ir.palettes.map((palette)=>palette.id),["reference-dark","reference-light"],"The reference palette variants must remain registered");
  const expectedContractComponentIds=["button","checkbox","dialog","input","menu","panel","progress","radio","select","switch","tabs","toast","tooltip"];
  const expectedReferenceVisualIds=["button","checkbox","dialog","input","menu","panel","progress","radio","select","switch","tabs","toast","tooltip"];
  for(const palette of ir.palettes) assert.deepEqual(Object.keys(palette.components),expectedContractComponentIds,`Palette ${palette.id} must compile the complete component contract registry`);
  const dark=ir.palettes.find((palette)=>palette.id==="reference-dark");
  const light=ir.palettes.find((palette)=>palette.id==="reference-light");
  assert.ok(dark&&light,"Both reference palettes must compile");
  assert.equal(dark.familyId,light.familyId,"Palette variants must remain in one family");
  assert.notEqual(dark.variantId,light.variantId,"Palette variants must remain distinguishable");
  const darkBasic=dark.themes.basic.components, lightBasic=light.themes.basic.components;
  const darkModern=dark.themes.modern.components, lightModern=light.themes.modern.components;
  const darkGlass=dark.themes.glass.components, lightGlass=light.themes.glass.components;
  const darkFrosted=dark.themes["frosted-glass"].components, lightFrosted=light.themes["frosted-glass"].components;
  const darkSpacey=dark.themes.spacey.components, lightSpacey=light.themes.spacey.components;
  const darkCyberpunk=dark.themes.cyberpunk.components, lightCyberpunk=light.themes.cyberpunk.components;
  for(const components of [darkBasic,lightBasic,darkModern,lightModern,darkGlass,lightGlass,darkFrosted,lightFrosted,darkSpacey,lightSpacey,darkCyberpunk,lightCyberpunk]) assert.deepEqual(Object.keys(components),expectedReferenceVisualIds,"Every available theme must resolve the complete implemented reference visual set");
  const availability=analyzeThemeAvailability(ir);
  assert.deepEqual(availability.componentIds,expectedContractComponentIds,"Theme availability must preserve the complete contract registry");
  assert.deepEqual(availability.visualComponentIds,expectedReferenceVisualIds,"Theme availability must track the independently implemented visual registry");
  assert.deepEqual(availability.availableThemeIds,["basic","modern","glass","frosted-glass","spacey","cyberpunk"],"Pre-registering a future component contract must not disable completed visual themes");
  assert.equal(darkBasic.button.variants.primary.base.root.fill.reference,"{semantic.color.accent}");
  assert.equal(lightBasic.button.variants.primary.base.root.fill.reference,"{semantic.color.accent}");
  assert.notDeepEqual(darkBasic.button.variants.primary.base.root.fill.value,lightBasic.button.variants.primary.base.root.fill.value,"Palette switching must alter semantic colors when variants differ");
  assert.equal(darkModern.button.base.root.radius.reference,"{radius.lg}");
  assert.equal(lightModern.button.base.root.radius.reference,"{radius.lg}");
  assert.deepEqual(darkModern.button.variants.primary.base.root.fill.value,darkBasic.button.variants.primary.base.root.fill.value,"Modern must reuse the selected palette rather than fork it");
  assert.equal(darkGlass.panel.base.root.fill.reference,"{semantic.color.surfaceTranslucent}");
  assert.equal(darkGlass.dialog.base.root.fill.reference,"{semantic.color.surfaceElevatedTranslucent}");
  assert.equal(darkGlass.panel.base.root.fill.value.alpha,0.72); assert.equal(lightGlass.panel.base.root.fill.value.alpha,0.72);
  assert.equal(darkGlass.dialog.base.root.fill.value.alpha,0.82); assert.equal(lightGlass.dialog.base.root.fill.value.alpha,0.82);
  assert.deepEqual(darkGlass.panel.base.root.radius.value,lightGlass.panel.base.root.radius.value,"Glass geometry must remain palette-neutral");
  for(const componentId of ["button","input","switch"]){assert.deepEqual(darkFrosted[componentId],darkGlass[componentId],`Frosted Glass ${componentId} must remain identical to Glass`);assert.deepEqual(lightFrosted[componentId],lightGlass[componentId]);}
  for(const componentId of ["panel","dialog"]) for(const [frostedComponent,glassComponent] of [[darkFrosted[componentId],darkGlass[componentId]],[lightFrosted[componentId],lightGlass[componentId]]]){const {fallbacks,...frostedBase}=frostedComponent;assert.deepEqual(frostedBase,glassComponent,`Frosted Glass ${componentId} base must remain identical to Glass`);assert.deepEqual(Object.keys(fallbacks??{}),["high"],`Frosted Glass ${componentId} must expose exactly one high capability fallback`);assert.deepEqual(fallbacks.high.requires,["backdropBlur"]);assert.equal(fallbacks.high.recipe.base.root.backdropBlur.reference,"{effect.blur.frosted}",`Frosted Glass ${componentId} high fallback must resolve the neutral frosted blur token`);assert.equal(fallbacks.high.recipe.base.root.backdropBlur.value.value,24);assert.equal(fallbacks.high.recipe.base.root.backdropBlur.value.unit,"px");}
  assert.equal(darkSpacey.button.base.root.radius.reference,"{radius.pill}"); assert.equal(lightSpacey.button.base.root.radius.reference,"{radius.pill}");
  assert.equal(darkSpacey.panel.base.root.radius.reference,"{radius.sm}"); assert.equal(lightSpacey.panel.base.root.radius.reference,"{radius.sm}");
  assert.equal(darkSpacey.panel.base.root.border.color.reference,"{semantic.color.borderStrong}"); assert.equal(lightSpacey.panel.base.root.border.color.reference,"{semantic.color.borderStrong}");
  assert.equal(darkSpacey.panel.base.root.shadow,undefined); assert.equal(lightSpacey.panel.base.root.shadow,undefined);
  assert.deepEqual(darkSpacey.panel.base.root.radius.value,lightSpacey.panel.base.root.radius.value,"Spacey geometry must remain palette-neutral");
  assert.notDeepEqual(darkSpacey.panel.base.root.border.color.value,lightSpacey.panel.base.root.border.color.value,"Spacey semantic instrumentation borders must follow the active palette");
  assert.equal(darkCyberpunk.button.base.root.radius.reference,"{radius.sm}"); assert.equal(lightCyberpunk.button.base.root.radius.reference,"{radius.sm}");
  assert.equal(darkCyberpunk.input.base.root.border.color.reference,"{semantic.color.accent}"); assert.equal(lightCyberpunk.input.base.root.border.color.reference,"{semantic.color.accent}");
  assert.equal(darkCyberpunk.panel.base.root.shadow.reference,"{elevation.shadow.low}"); assert.equal(lightCyberpunk.panel.base.root.shadow.reference,"{elevation.shadow.low}");
  assert.equal(darkCyberpunk.dialog.base.root.shadow.reference,"{elevation.shadow.medium}"); assert.equal(lightCyberpunk.dialog.base.root.shadow.reference,"{elevation.shadow.medium}");
  assert.equal(darkCyberpunk.panel.base.root.backdropBlur,undefined); assert.equal(lightCyberpunk.panel.base.root.backdropBlur,undefined);
  assert.deepEqual(darkCyberpunk.panel.base.root.radius.value,lightCyberpunk.panel.base.root.radius.value,"Cyberpunk geometry must remain palette-neutral");
  assert.notDeepEqual(darkCyberpunk.input.base.root.border.color.value,lightCyberpunk.input.base.root.border.color.value,"Cyberpunk semantic signal frames must follow the active palette");
  console.log("Compiler determinism, registry, palette/theme resolution, Frosted fallback and Cyberpunk inheritance tests passed.");
} finally {await Promise.all([rm(first,{force:true}),rm(second,{force:true})]);}
