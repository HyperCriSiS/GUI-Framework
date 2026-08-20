// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const outputPath = "build/web/assets-test.ts";
const outputDir = "build/web/assets-test";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/adapter-web/src/generate-assets.mjs", "spec/manifest.json", outputPath, outputDir, "spec"], "Web asset generator");
  const source = await readFile(outputPath, "utf8");
  const svg = await readFile(`${outputDir}/reference-check.svg`, "utf8");
  assert.match(source, /export const guiAssets = \{/);
  assert.match(source, /"reference-check"/);
  assert.match(source, /colorMode: "currentColor"/);
  assert.match(source, /createGuiSvgAsset/);
  assert.match(source, /aria-hidden/);
  assert.match(svg, /stroke="currentColor"/);
  console.log("Web portable SVG asset generation tests passed.");
} finally {
  await Promise.all([rm(outputPath, { force: true }), rm(outputDir, { recursive: true, force: true })]);
}
