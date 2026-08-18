// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-compose-test.json";
const kotlinPath = "build/compose/GuiContracts-test.kt";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-compose/src/generate-contracts.mjs", irPath, kotlinPath], "Kotlin contract generator");

  const source = await readFile(kotlinPath, "utf8");
  assert.match(source, /enum class GuiThemeId\(val wireValue: String\)/);
  assert.match(source, /BASIC\("basic"\)/);
  assert.match(source, /FROSTED_GLASS\("frosted-glass"\)/);
  assert.match(source, /CYBERPUNK\("cyberpunk"\)/);
  assert.match(source, /enum class GuiButtonVariant/);
  assert.match(source, /PRIMARY\("primary"\)/);
  assert.match(source, /data class GuiButtonProperties\(/);
  assert.match(source, /val disabled: Boolean = false/);
  assert.match(source, /val loading: Boolean = false/);
  assert.match(source, /GuiEventContract\("activate", "none"\)/);
  assert.match(source, /GuiContentSlot\("label", "text", true\)/);
  assert.match(source, /GuiComponentSemantics\("button", true\)/);
  assert.doesNotMatch(source, /reference-dark|reference-light/, "Development palette IDs must not leak into Kotlin component contracts");
  assert.doesNotMatch(source, /HTMLElement|document\.|onClick|Composable|Modifier/, "Neutral Kotlin contracts must not contain Web or Compose implementation APIs");

  console.log("Kotlin contract generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(kotlinPath, { force: true })]);
}
