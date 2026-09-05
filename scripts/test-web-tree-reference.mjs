// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("examples/web-reference/tree-reference.mjs", "utf8");
const html = await readFile("examples/web-reference/tree.html", "utf8");

assert.match(html, /id="gui-tree-reference-root"/);
assert.match(html, /src="\.\/tree-reference\.mjs"/);
assert.match(source, /createGuiTree, createGuiTreeItem/);
assert.match(source, /let value = "workspace"/);
assert.match(source, /let workspaceExpanded = true/);
assert.match(source, /value: "workspace"/);
assert.match(source, /accessibilityLabel: "Workspace node"/);
assert.match(source, /value: "atlas"/);
assert.match(source, /accessibilityLabel: "Atlas node"/);
assert.match(source, /value: "archive"/);
assert.match(source, /accessibilityLabel: "Archive node"/);
assert.match(source, /disabled: true/);
assert.match(source, /value: "settings"/);
assert.match(source, /accessibilityLabel: "Settings node"/);
assert.match(source, /workspace\.groupElement\.append\(atlas\.element, archive\.element\)/);
assert.match(source, /accessibilityLabel: "Project hierarchy tree"/);
assert.match(source, /onValueChange: setValue/);
assert.match(source, /onExpandedChange: toggleExpanded/);
assert.match(source, /onNodeActivate\(nextValue\)/);
assert.match(source, /workspace\.update\(\{ expanded: workspaceExpanded \}\)/);
assert.match(source, /tree\.refreshItems\(\)/);
assert.match(source, /Selected node: \$\{value\}/);
assert.match(source, /workspace \$\{workspaceExpanded \? "expanded" : "collapsed"\}/);
assert.match(source, /Disable tree/);
assert.match(source, /Reset hierarchy/);

console.log("Standalone Web Tree / Hierarchy reference source contract passed.");
