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
assert.match(source, /\bcreateGuiSelect\b/);
assert.match(source, /\bcreateGuiSelectOption\b/);
assert.match(source, /data.*guiTheme|dataset\.guiTheme = "basic"/s);
assert.match(source, /editable: query\.get\("editable"\) === "true"/);
assert.match(source, /onValueChange\(nextValue\)/);
assert.match(source, /onQueryChange\(nextQuery\)/);
assert.match(source, /onExpandedChange\(nextExpanded\)/);
assert.match(source, /let suppressNextExpandedStatus = false/);
assert.match(source, /suppressNextExpandedStatus = expanded;[\s\S]*status\.textContent = `Selected \$\{nextValue\}\.`/);
assert.match(source, /suppressNextExpandedStatus = !expanded;[\s\S]*status\.textContent = `Query \$\{nextQuery \|\| "cleared"\}\.`/);
assert.match(source, /if \(suppressNextExpandedStatus\) \{[\s\S]*suppressNextExpandedStatus = false;[\s\S]*return;/);
assert.match(source, /disabled: true/);
assert.match(source, /select\.refreshOptions\(\)/);
assert.doesNotMatch(source, /material|bootstrap|tailwind/i);

console.log("Standalone Web Select / ComboBox reference source contract tests passed with controlled status precedence.");
