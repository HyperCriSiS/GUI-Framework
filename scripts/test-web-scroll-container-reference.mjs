// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/scroll-container.html", "utf8"),
  readFile("examples/web-reference/scroll-container-reference.mjs", "utf8"),
]);

assert.match(html, /gui-scroll-container-reference-root/);
assert.match(html, /scroll-container-reference\.mjs/);
assert.match(source, /createGuiScrollContainer/);
assert.match(source, /accessibilityLabel: "Activity log viewport"/);
assert.match(source, /variant: "vertical"/);
assert.match(source, /size: componentSize/);
assert.match(source, /Array\.from\(\{ length: 12 \}/);
assert.match(source, /viewport\.element\.style\.blockSize/);
assert.match(source, /viewport\.element\.scrollTop/);
assert.match(source, /viewport\.update\(\{ keyboardFocusable \}\)/);
assert.match(source, /Reset scroll position/);
assert.match(source, /adapter updates preserve browser-owned scrollTop/);

console.log("Standalone Web Scroll Container reference source tests passed.");
