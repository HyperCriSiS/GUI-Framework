// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-compose-visual-test.json";
const kotlinPath = "build/compose/GuiVisuals-test.kt";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-compose/src/generate-visuals.mjs", irPath, kotlinPath], "Compose visual generator");

  const source = await readFile(kotlinPath, "utf8");
  assert.match(source, /data class GuiVisualPartStyle/);
  assert.match(source, /object GuiVisualRegistry/);
  assert.match(source, /"reference-dark" to mapOf/);
  assert.match(source, /"reference-light" to mapOf/);
  assert.match(source, /"basic" to mapOf/);
  assert.match(source, /"button" to GuiVisualRecipe/);
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
  assert.doesNotMatch(source, /motion\.interaction\.fast/, "Active animation tokens must not be emitted for v1 Basic controls");

  console.log("Compose visual generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(kotlinPath, { force: true })]);
}
