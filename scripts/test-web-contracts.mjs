// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-web-contract-test.json";
const contractsPath = "build/web/contracts-test.ts";

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) {
    throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  run(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(process.execPath, ["packages/adapter-web/src/generate-contracts.mjs", irPath, contractsPath], "Web contract generator");

  const source = await readFile(contractsPath, "utf8");
  assert.match(source, /export const guiThemeIds = \["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"\] as const;/);
  assert.match(source, /export type GuiThemeId = \(typeof guiThemeIds\)\[number\];/);
  assert.match(source, /export const guiComponentIds = \["button"\] as const;/);
  assert.match(source, /export type GuiButtonVariant = \(typeof guiButtonContract\.variants\)\[number\];/);
  assert.match(source, /variants: \["primary", "secondary", "ghost", "danger"\] as const,/);
  assert.match(source, /states: \["default", "hover", "focus", "pressed", "disabled", "loading"\] as const,/);
  assert.match(source, /"id": "activate"/);
  assert.match(source, /"id": "disabled"/);
  assert.match(source, /"kind": "text"/);
  assert.doesNotMatch(source, /reference-dark|reference-light/, "Development palette IDs must not become public Web component contract types");

  console.log("Web TypeScript contract generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(contractsPath, { force: true })]);
}
