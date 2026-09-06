// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const irPath = "build/spec-ir-text-locale-test.json";
const cssPath = "build/web/text-locale-components-test.css";

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

try {
  run(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(process.execPath, ["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");

  assert.doesNotMatch(
    css,
    /\b(?:margin|padding|border)-(?:left|right)(?:-[a-z-]+)?\s*:|\b(?:left|right)\s*:|\btext-align:\s*(?:left|right)\b/,
    "Generated component CSS must use logical inline properties instead of physical left/right layout declarations",
  );
  assert.match(css, /padding-inline:/, "component spacing must remain direction-aware");
  assert.match(css, /inset-inline-start:/, "directional indicators must anchor to logical inline start");
  assert.match(css, /margin-inline-start:/, "trailing metadata must use logical inline spacing");
  assert.match(css, /text-align: start;/, "structured text alignment must follow locale direction");

  assert.match(css, /\.gui-button \{[^}]*min-inline-size: 0;[^}]*max-inline-size: 100%;[^}]*overflow-wrap: anywhere;[^}]*white-space: normal;/s);
  assert.match(css, /\.gui-input \{[^}]*min-inline-size: 0;[^}]*max-inline-size: 100%;/s);
  assert.match(css, /\.gui-select \{[^}]*min-inline-size: 0;[^}]*max-inline-size: 100%;/s);
  assert.match(css, /\.gui-tabs__tab \{[^}]*min-inline-size: 0;[^}]*max-inline-size: 100%;[^}]*overflow-wrap: anywhere;/s);
  assert.match(css, /\.gui-navigation__label \{ min-inline-size: 0; overflow-wrap: anywhere; \}/);
  assert.match(css, /\.gui-tree__label \{ min-inline-size: 0; overflow-wrap: anywhere;/);
  assert.match(css, /\.gui-form-layout__label,[\s\S]*?\.gui-form-layout__error \{ overflow-wrap: anywhere; \}/);
  assert.match(css, /\.gui-table__header-cell,[\s\S]*?overflow-wrap: anywhere;/);
  assert.match(css, /\.gui-data-grid__column-header,[\s\S]*?overflow-wrap: anywhere;/);
  assert.match(css, /\.gui-tooltip__popup \{[^}]*overflow-wrap: anywhere;/s);
  assert.match(css, /\.gui-menu__label \{ min-inline-size: 0; overflow-wrap: anywhere; \}/);
  assert.match(css, /\.gui-progress__label \{ min-inline-size: 0; overflow-wrap: anywhere; \}/);
  assert.match(css, /\.gui-toast \{[^}]*overflow-wrap: anywhere;/s);
  assert.match(css, /\.gui-toast__action \{ min-inline-size: 0; max-inline-size: 100%; overflow-wrap: anywhere; white-space: normal; \}/);
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}

console.log("Cross-component Web text and locale robustness tests passed.");
