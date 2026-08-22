// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const output = "build/spec-ir-web-button-test.json";
const cssOutput = "packages/adapter-web/generated/components.css";

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  run(process.execPath, ["packages/compiler/src/index.mjs", "--output", output]);
  run(process.execPath, ["packages/adapter-web/src/generate-components-css.mjs", "--input", output, "--output", cssOutput]);

  const css = await readFile(cssOutput, "utf8");

  assert.match(css, /\.gui-button \{/);
  assert.match(css, /display: inline-flex;/);
  assert.match(css, /align-items: center;/);
  assert.match(css, /justify-content: center;/);
  assert.match(css, /cursor: pointer;/);
  assert.match(css, /border-style: solid;/);
  assert.match(css, /background: none;/);
  assert.match(css, /font: inherit;/);
  assert.match(css, /transition-property: background-color, border-color, color, opacity, box-shadow, outline-color;/);
  assert.match(css, /\.gui-button:disabled/);
  assert.match(css, /cursor: not-allowed;/);
  assert.match(css, /\.gui-button__leading/);
  assert.match(css, /\.gui-button__trailing/);
  assert.match(css, /\.gui-button__label/);
  assert.match(css, /\.gui-button__icon/);
  assert.match(css, /\.gui-button__icon svg/);
  assert.match(css, /\.gui-button__icon img/);
  assert.match(css, /\.gui-button__spinner/);
  assert.match(css, /animation: gui-button-spinner 700ms linear infinite;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none;/);

  assert.match(
    css,
    /\[data-gui-theme="basic"\] \.gui-button \{[^}]*border-radius: var\(--gui-radius-control\);/s,
    "Basic control radius must be generated from the neutral visual recipe",
  );
  assert.match(
    css,
    /\[data-gui-theme="modern"\] \.gui-button \{[^}]*border-radius: var\(--gui-radius-lg\);/s,
    "Modern must generate its rounded Button geometry",
  );
  assert.match(
    css,
    /\[data-gui-theme="glass"\] \.gui-button \{[^}]*border-radius: var\(--gui-radius-lg\);/s,
    "Glass controls must inherit Modern rounded geometry without forking ordinary controls",
  );
  assert.doesNotMatch(
    css,
    /data-gui-theme="(?:spacey|cyberpunk)"/,
    "Themes without deliberate component recipes must remain absent from generated CSS",
  );
  assert.match(css, /:where\(\[data-gui-variant="primary"\]\)/);
  assert.match(css, /:where\(\[data-gui-size="large"\]\)/);
  assert.match(css, /:where\(:focus-visible\)/);
  assert.match(css, /:where\(:hover:not\(:disabled\)\)/);
  assert.match(css, /:where\(:active:not\(:disabled\)\)/);
  assert.match(css, /:where\(:disabled\)/);
  assert.match(css, /:where\(\[data-gui-loading="true"\]\)/);
  assert.match(css, /background-color: var\(--gui-semantic-color-accent\);/);
  assert.match(css, /min-height: var\(--gui-sizing-control-large\);/);
  assert.match(css, /outline-offset: var\(--gui-focus-ring-offset\);/);
  assert.match(css, /opacity: var\(--gui-opacity-disabled\);/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Component CSS must use cascading token variables rather than duplicate palette values");
  assert.doesNotMatch(css, /#4C8DFF|#684DE2/, "Resolved palette colors must stay in token CSS so the nearest palette scope wins");
  assert.match(css, /--gui-semantic-color-accent/);
  assert.match(css, /--gui-radius-control/);
  assert.match(css, /--gui-sizing-control-large/);
  assert.match(css, /--gui-focus-ring-offset/);
  assert.match(css, /--gui-opacity-disabled/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  console.log("Native Web Basic Button CSS behavior is generated from the neutral specification.");
} finally {
  await Promise.all([rm(output, { force: true }), rm(cssOutput, { force: true })]);
}
