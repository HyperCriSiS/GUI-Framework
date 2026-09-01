// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const outputPath = "build/compose/GuiAssets-test.kt";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/adapter-compose/src/generate-assets.mjs", "spec/manifest.json", outputPath, "spec"], "Compose asset generator");
  const source = await readFile(outputPath, "utf8");
  assert.match(source, /enum class GuiAssetId/);
  assert.match(source, /REFERENCE_CHECK\("reference-check"\)/);
  assert.match(source, /ImageVector\.Builder/);
  assert.match(source, /addPathNodes\("M5 12\.5l4 4L19 7"\)/);
  assert.match(source, /SolidColor\(currentColor\)/);
  assert.match(source, /StrokeCap\.Round/);
  assert.match(source, /StrokeJoin\.Round/);
  console.log("Compose native ImageVector generation tests passed.");
} finally {
  await rm(outputPath, { force: true });
}
