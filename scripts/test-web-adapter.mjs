// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-web-test.json";
const cssPath = "build/web/tokens-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-css.mjs", irPath, cssPath], "Web token generator");

  const css = await readFile(cssPath, "utf8");
  assert.match(css, /:root \{/);
  assert.match(css, /--gui-spacing-md: 12px;/);
  assert.match(css, /--gui-component-navigation-indicator-thickness: 2px;/);
  assert.match(css, /--gui-component-data-grid-selection-indicator-width: 2px;/);
  assert.match(css, /--gui-component-tree-indent-step-medium: 20px;/);
  assert.match(css, /--gui-component-tree-disclosure-size-medium: 18px;/);
  assert.match(css, /--gui-motion-duration-fast: 120ms;/);
  assert.match(css, /--gui-motion-easing-standard: cubic-bezier\(0\.2, 0, 0, 1\);/);
  assert.match(css, /--gui-motion-interaction-fast: 120ms cubic-bezier\(0\.2, 0, 0, 1\) 0ms;/);

  assert.match(css, /\[data-gui-palette="reference-dark"\] \{/);
  assert.match(css, /\[data-gui-palette="reference-light"\] \{/);
  assert.match(css, /--gui-semantic-color-accent: #2563EB;/);
  assert.match(css, /--gui-semantic-color-accent: #684DE2;/);

  assert.doesNotMatch(css, /palette-accent500/, "Raw palette token names must not leak into Web output");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved neutral references must not leak into Web output");

  console.log("Web adapter CSS token generation tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
