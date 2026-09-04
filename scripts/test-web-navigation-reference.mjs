// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/navigation.html", "utf8"),
  readFile("examples/web-reference/navigation-reference.mjs", "utf8"),
]);

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-navigation-reference-root"/);
assert.match(html, /navigation-reference\.mjs/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiNavigation, createGuiNavigationItem/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /accessibilityLabel: "Workspace sections"/);
assert.match(source, /onValueChange\(nextValue\) \{/);
assert.match(source, /navigation\.update\(\{ value \}\)/);
assert.match(source, /value: "archive", label: "Archive", icon: "□", disabled: true/);
assert.match(source, /accessibilityLabel: "Library sections"/);
assert.match(source, /variant: "vertical"/);
assert.match(source, /label: "Disable navigation"/);
assert.match(source, /navigation\.update\(\{ disabled \}\)/);
assert.match(source, /label: "Select overview"/);
assert.match(source, /Selected section: \$\{value\} · \$\{disabled \? "navigation disabled" : "navigation enabled"\}/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Navigation reference source tests passed.");
