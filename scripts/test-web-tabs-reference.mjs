// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/tabs.html", "utf8"),
  readFile("examples/web-reference/tabs-reference.mjs", "utf8"),
]);

assert.match(html, /\.\.\/\.\.\/build\/web\/tokens\.css/);
assert.match(html, /\.\.\/\.\.\/build\/web\/components\.css/);
assert.match(html, /tabs-reference\.mjs/);
assert.match(source, /\bcreateGuiTabs\b/);
assert.match(source, /\bcreateGuiTab\b/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /size: density === "compact" \? "small" : "medium"/);
assert.match(source, /accessibilityLabel: "Workspace sections"/);
assert.match(source, /disabled: true/);
assert.match(source, /tabs\.refreshTabs\(\)/);
assert.match(source, /onValueChange\(nextValue\)/);
assert.match(source, /value = nextValue;[\s\S]*render\(\);[\s\S]*status\.textContent = `Selected \$\{nextValue\}\.`/);
assert.match(source, /tabs\.panelElement\.replaceChildren/);
assert.doesNotMatch(source, /material|bootstrap|tailwind/i);

console.log("Standalone Web Tabs reference source contract tests passed with controlled manual activation.");
