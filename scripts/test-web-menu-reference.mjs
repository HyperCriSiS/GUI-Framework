// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/menu.html", "utf8"),
  readFile("examples/web-reference/menu-reference.mjs", "utf8"),
]);

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-menu-reference-root"/);
assert.match(html, /menu-reference\.mjs/);
assert.match(source, /createGuiButton/);
assert.match(source, /createGuiMenu/);
assert.match(source, /createGuiMenuItem/);
assert.match(source, /createGuiMenuSeparator/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /triggerElement: button\.element/);
assert.match(source, /accessibilityLabel: "Workspace actions"/);
assert.match(source, /disabled: true/);
assert.match(source, /onOpenChange: setOpen/);
assert.match(source, /menu\.update\(\{ open \}\)/);
assert.match(source, /onActivate\(value\)/);
assert.match(source, /menu\.popupElement\.append/);
assert.match(source, /menu\.refreshItems\(\)/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Menu / Context Menu reference source tests passed.");
