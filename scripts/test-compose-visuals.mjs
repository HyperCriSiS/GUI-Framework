// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-compose-visual-test.json";
const kotlinPath = "build/compose/GuiVisuals-test.kt";
const fallbackIrPath = "build/spec-ir-compose-fallback-test.json";
const fallbackKotlinPath = "build/compose/GuiVisuals-fallback-test.kt";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-compose/src/generate-visuals.mjs", irPath, kotlinPath], "Compose visual generator");

  const source = await readFile(kotlinPath, "utf8");
  assert.match(source, /data class GuiVisualPartStyle/);
  assert.match(source, /data class GuiVisualFallback/);
  assert.match(source, /val fallbacks: Map<String, GuiVisualFallback> = emptyMap\(\)/);
  assert.match(source, /object GuiVisualRegistry/);
  assert.match(source, /"reference-dark" to mapOf/);
  assert.match(source, /"reference-light" to mapOf/);
  assert.match(source, /"basic" to mapOf/);
  assert.match(source, /"button" to GuiVisualRecipe/);
  assert.match(source, /"dialog" to GuiVisualRecipe/);
  assert.match(source, /"input" to GuiVisualRecipe/);
  assert.match(source, /"panel" to GuiVisualRecipe/);
  assert.match(source, /"switch" to GuiVisualRecipe/);
  assert.match(source, /"thumb" to GuiVisualPartStyle/);
  assert.match(source, /"placeholder" to GuiVisualPartStyle/);
  assert.match(source, /GuiColorValue\("srgb", listOf\(0\.1451, 0\.3882, 0\.9216\), "#2563EB"\)/);
  assert.match(source, /GuiColorValue\("srgb", listOf\(0\.4078, 0\.302, 0\.8863\), "#684DE2"\)/);
  assert.match(source, /GuiDimensionValue\(36\.0, "px"\)/);
  assert.match(source, /GuiDimensionValue\(14\.0, "px"\)/);
  assert.match(source, /GuiVisualOutline/);
  assert.match(source, /val shadow: GuiShadowValue\? = null/);
  assert.match(source, /val backdropBlur: GuiDimensionValue\? = null/);
  assert.match(source, /"modern" to mapOf/);
  assert.match(source, /"frosted-glass" to mapOf/);
  assert.match(source, /"high" to GuiVisualFallback\(requires = setOf\("backdropBlur"\), recipe = GuiVisualRecipe\(/);
  assert.match(source, /backdropBlur = GuiDimensionValue\(24\.0, "px"\)/);
  assert.match(source, /shadow = GuiShadowValue\(color = GuiColorValue\("srgb", listOf\(0\.0, 0\.0, 0\.0\), null, 0\.14\)/);
  assert.match(source, /shadow = GuiShadowValue\(color = GuiColorValue\("srgb", listOf\(0\.0, 0\.0, 0\.0\), null, 0\.18\)/);
  assert.match(source, /inset = false/);
  assert.doesNotMatch(source, /motion\.interaction\.fast/, "Active animation tokens must not be emitted for v1 Basic controls");

  const fallbackIr = JSON.parse(await readFile(irPath, "utf8"));
  for (const palette of fallbackIr.palettes) {
    const button = palette.themes?.basic?.components?.button;
    assert.ok(button, `Synthetic fallback test requires Basic button visual for ${palette.id}`);
    button.fallbacks = {
      minimal: {
        requires: [],
        recipe: { base: {}, sizes: {}, states: {}, variants: {} },
      },
    };
  }
  await writeFile(fallbackIrPath, `${JSON.stringify(fallbackIr, null, 2)}\n`, "utf8");
  run(["packages/adapter-compose/src/generate-visuals.mjs", fallbackIrPath, fallbackKotlinPath], "Compose fallback visual generator");
  const fallbackSource = await readFile(fallbackKotlinPath, "utf8");
  assert.match(
    fallbackSource,
    /"minimal" to GuiVisualFallback\(requires = emptySet\(\), recipe = GuiVisualRecipe\(/,
    "Compose output must preserve deterministic capability fallback recipes",
  );

  console.log("Compose visual and capability fallback generation tests passed.");
} finally {
  await Promise.all([
    rm(irPath, { force: true }),
    rm(kotlinPath, { force: true }),
    rm(fallbackIrPath, { force: true }),
    rm(fallbackKotlinPath, { force: true }),
  ]);
}
