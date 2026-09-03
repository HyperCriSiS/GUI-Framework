// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/progress.html", "utf8"),
  readFile("examples/web-reference/progress-reference.mjs", "utf8"),
]);

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-progress-reference-root"/);
assert.match(html, /progress-reference\.mjs/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiProgress/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /value,\n    accessibilityLabel: "Workspace sync progress"/);
assert.match(source, /label: "Sync progress: 68%"/);
assert.match(source, /indeterminate: true/);
assert.match(source, /accessibilityLabel: "Workspace sync activity"/);
assert.match(source, /label: "Syncing workspace"/);
assert.match(source, /variant: "circular"/);
assert.match(source, /label: "Advance progress"/);
assert.match(source, /determinate\.update\(\{ value, label: "Sync progress: 82%" \}\)/);
assert.match(source, /label: "Complete loading"/);
assert.match(source, /activity\.update\(\{ indeterminate: false, value: 100, label: "Sync complete" \}\)/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Progress / Spinner reference source tests passed.");
