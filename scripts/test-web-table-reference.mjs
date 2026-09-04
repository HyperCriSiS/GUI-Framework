// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../examples/web-reference/table.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../examples/web-reference/table-reference.mjs", import.meta.url), "utf8");

assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(html, /reference\.css/);
assert.match(html, /id="gui-table-reference-root"/);
assert.match(html, /table-reference\.mjs/);
assert.match(source, /createGuiTable/);
assert.match(source, /createGuiDataGrid/);
assert.match(source, /createGuiDataGridRow/);
assert.match(source, /dataset\.guiTheme = "basic"/);
assert.match(source, /dataset\.guiPalette = "reference-dark"/);
assert.match(source, /density === "compact" \? "small" : "medium"/);
assert.match(source, /caption: "Project inventory"/);
assert.match(source, /value = "atlas"/);
assert.match(source, /Archive/);
assert.match(source, /disabled: record\.disabled/);
assert.match(source, /grid\.update\(\{ value \}\)/);
assert.match(source, /grid\.update\(\{ disabled \}\)/);
assert.match(source, /onRowActivate/);
assert.match(source, /Arrow Up\/Down\/Home\/End move focus/);
assert.doesNotMatch(source, /Material|Bootstrap|Tailwind/);

console.log("Standalone Web Table / Data Grid reference source tests passed.");
