// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, source] = await Promise.all([
  readFile("examples/web-reference/select.html", "utf8"),
  readFile("examples/web-reference/select-reference.mjs", "utf8"),
]);

assert.match(html, /\.\.\/\.\.\/build\/web\/tokens\.css/);
assert.match(html, /\.\.\/\.\.\/build\/web\/components\.css/);
assert.match(html, /select-reference\.mjs/);
assert.match(source, /createGuiSelect, createGuiSelectOption/);
assert.match(source, /data.*guiTheme|dataset\.guiTheme = "basic"/s);
assert.match(source, /editable: query\.get\("editable"\) === "true"/);
assert.match(source, /onValueChange\(nextValue\)/);
assert.match(source, /onQueryChange\(nextQuery\)/);
assert.match(source, /onExpandedChange\(nextExpanded\)/);
assert.match(source, /disabled: true/);
assert.match(source, /select\.refreshOptions\(\)/);
assert.doesNotMatch(source, /material|bootstrap|tailwind/i);

console.log("Standalone Web Select / ComboBox reference source contract tests passed.");
