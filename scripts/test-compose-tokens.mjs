// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-compose-token-test.json";
const kotlinPath = "build/compose/GuiTokens-test.kt";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-compose/src/generate-tokens.mjs", irPath, kotlinPath], "Kotlin token generator");

  const source = await readFile(kotlinPath, "utf8");
  assert.match(source, /sealed interface GuiTokenValue/);
  assert.match(source, /val alpha: Double = 1\.0/);
  assert.match(source, /data class GuiShadowValue\(/);
  assert.match(source, /"spacing\.md" to GuiDimensionValue\(12\.0, "px"\)/);
  assert.match(source, /"component\.dataGrid\.selectionIndicator\.width" to GuiDimensionValue\(2\.0, "px"\)/);
  assert.match(source, /"component\.tree\.indent\.step\.medium" to GuiDimensionValue\(20\.0, "px"\)/);
  assert.match(source, /"component\.tree\.disclosure\.size\.medium" to GuiDimensionValue\(18\.0, "px"\)/);
  assert.match(source, /"motion\.duration\.fast" to GuiDurationValue\(120\.0, "ms"\)/);
  assert.match(source, /GuiTransitionValue\(duration = GuiDurationValue\(120\.0, "ms"\), delay = GuiDurationValue\(0\.0, "ms"\), timingFunction = GuiCubicBezierValue\(0\.2, 0\.0, 0\.0, 1\.0\)\)/);
  assert.match(source, /"reference-dark" to mapOf\(/);
  assert.match(source, /"reference-light" to mapOf\(/);
  assert.match(source, /"semantic\.color\.accent" to GuiColorValue\("srgb", listOf\(0\.1451, 0\.3882, 0\.9216\), "#2563EB"\)/);
  assert.match(source, /"semantic\.color\.accent" to GuiColorValue\("srgb", listOf\(0\.4078, 0\.302, 0\.8863\), "#684DE2"\)/);
  assert.match(source, /"elevation\.shadow\.low" to GuiShadowValue\(/);
  assert.match(source, /GuiColorValue\("srgb", listOf\(0\.0, 0\.0, 0\.0\), null, 0\.14\)/);
  assert.match(source, /blur = GuiDimensionValue\(6\.0, "px"\)/);
  assert.match(source, /spread = GuiDimensionValue\(0\.0, "px"\), inset = false/);
  assert.doesNotMatch(source, /palette\.accent500/, "Raw palette token names must not leak into Kotlin adapter output");
  assert.doesNotMatch(source, /\{[A-Za-z0-9_.-]+\}/, "Unresolved neutral references must not leak into Kotlin adapter output");
  assert.doesNotMatch(source, /android\.|androidx\.|Composable|Modifier|Color\(/, "Neutral Kotlin token output must not depend on Android or Compose APIs");

  console.log("Kotlin token generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(kotlinPath, { force: true })]);
}
