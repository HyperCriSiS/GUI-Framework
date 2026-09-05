from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"missing anchor in {path}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))

# Mark the fully validated Table/Data Grid slice complete.
replace_once(
    "ROADMAP.md",
    "- [ ] Table / Data Grid primitives",
    "- [x] Table / Data Grid primitives <!-- separate passive Table and interactive Data Grid neutral contracts, tokens/Basic visuals, native Web/Foundation Compose adapters, controlled row selection plus explicit row activation, Web/Desktop/Android references, cross-platform parity, compact Chromium regression, Android APK build and representative API 23 large-font/API 35 high-density runtime validation are complete -->",
)

# Register the already-isolated Tree behavior gate permanently.
replace_once(
    "package.json",
    '    "test:web-navigation": "node scripts/test-web-navigation.mjs",\n    "test:web-table":',
    '    "test:web-navigation": "node scripts/test-web-navigation.mjs",\n    "test:web-tree": "node scripts/test-web-tree.mjs",\n    "test:web-table":',
)
replace_once(
    "package.json",
    "&& npm run test:web-navigation && npm run test:web-table",
    "&& npm run test:web-navigation && npm run test:web-tree && npm run test:web-table",
)
replace_once(
    ".github/workflows/core-ci.yml",
    '      - name: Test native Web Basic Navigation\n        run: npm run test:web-navigation\n\n      - name: Test native Web Basic Table / Data Grid',
    '      - name: Test native Web Basic Navigation\n        run: npm run test:web-navigation\n\n      - name: Test native Web Basic Tree / Hierarchy\n        run: npm run test:web-tree\n\n      - name: Test native Web Basic Table / Data Grid',
)

# Scope interactive Tree visuals to the focused/selected node row, never descendants.
tree_state = '''  if (componentId === "tree") {
    const nodeSelector = partSelector(rootSelector, componentId, "node");
    let itemSelector = null;
    if (state === "selected") itemSelector = `${nodeSelector}:where([aria-selected="true"]) > .gui-tree__item`;
    else if (state === "expanded") itemSelector = `${nodeSelector}:where([aria-expanded="true"]) > .gui-tree__item`;
    else if (state === "disabled") itemSelector = `${nodeSelector}:where([aria-disabled="true"]) > .gui-tree__item`;
    else if (state === "hover") itemSelector = `${nodeSelector}:where(:not([aria-disabled="true"])) > .gui-tree__item:hover`;
    else if (state === "focus") itemSelector = `${nodeSelector}:where(:focus-visible:not([aria-disabled="true"])) > .gui-tree__item`;
    else if (state === "pressed") itemSelector = `${nodeSelector}:where(:not([aria-disabled="true"])) > .gui-tree__item:active`;
    if (itemSelector !== null) {
      if (partId === "item") return itemSelector;
      if (["disclosure", "icon", "label"].includes(partId)) return `${itemSelector} > .gui-tree__${kebabPart(partId)}`;
    }
    return partSelector(stateSelector(rootSelector, state), componentId, partId);
  }
'''
replace_once(
    "packages/adapter-web/src/generate-components-css.mjs",
    '  if (componentId === "data-grid") {',
    tree_state + '  if (componentId === "data-grid") {',
)

foundation = '''    `${scope} .gui-tree { box-sizing: border-box; inline-size: 100%; border-style: solid; border-width: 0; outline: none; }`,
    `${scope} .gui-tree__node,`, `${scope} .gui-tree__item,`, `${scope} .gui-tree__disclosure,`, `${scope} .gui-tree__icon,`, `${scope} .gui-tree__label,`, `${scope} .gui-tree__group { box-sizing: border-box; }`,
    `${scope} .gui-tree__node { outline: none; }`,
    `${scope} .gui-tree__item { display: flex; align-items: center; min-inline-size: 0; border: 0; cursor: pointer; user-select: none; }`,
    `${scope} .gui-tree__node[aria-disabled="true"] > .gui-tree__item { cursor: default; }`,
    `${scope} .gui-tree__disclosure { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; cursor: pointer; }`,
    `${scope} .gui-tree__node[aria-disabled="true"] > .gui-tree__item > .gui-tree__disclosure { cursor: default; }`,
    `${scope} .gui-tree__icon { flex: 0 0 auto; pointer-events: none; }`, `${scope} .gui-tree__icon[hidden],`, `${scope} .gui-tree__label[hidden] { display: none; }`,
    `${scope} .gui-tree__label { min-inline-size: 0; overflow-wrap: anywhere; pointer-events: none; }`,
    `${scope} .gui-tree__group { min-inline-size: 0; }`, `${scope} .gui-tree__group[hidden] { display: none; }`, "",
'''
replace_once(
    "packages/adapter-web/src/generate-components-css.mjs",
    '    `${scope} .gui-table { box-sizing: border-box; inline-size: 100%; border-collapse: separate; border-spacing: 0; border-style: solid; border-width: 0; overflow-wrap: anywhere; }`,',
    foundation + '    `${scope} .gui-table { box-sizing: border-box; inline-size: 100%; border-collapse: separate; border-spacing: 0; border-style: solid; border-width: 0; overflow-wrap: anywhere; }`,',
)
replace_once(
    "packages/adapter-web/src/generate-components-css.mjs",
    '`  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-navigation,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-data-grid,`',
    '`  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-navigation,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-tree,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-data-grid,`',
)

# Extend the Tree gate to cover generated CSS, including descendant-bleed regressions.
test_path = Path("scripts/test-web-tree.mjs")
test = test_path.read_text()
test = test.replace(
    'import assert from "node:assert/strict";\nimport { createGuiTree, createGuiTreeItem }',
    'import assert from "node:assert/strict";\nimport { readFile, rm } from "node:fs/promises";\nimport { spawnSync } from "node:child_process";\nimport { createGuiTree, createGuiTreeItem }',
    1,
)
insert_after = 'import { createGuiTree, createGuiTreeItem } from "../packages/adapter-web/src/tree.mjs";\n'
css_setup = '''\nconst irPath = "build/spec-ir-tree-test.json";
const cssPath = "build/web/components-tree-test.css";
function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\\n${result.stdout}\\n${result.stderr}`);
}
run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
const css = await readFile(cssPath, "utf8");
assert.match(css, /\\.gui-tree \\{/);
assert.match(css, /\\.gui-tree__node \\{ outline: none; \\}/);
assert.match(css, /\\.gui-tree__group\\[hidden\\] \\{ display: none; \\}/);
assert.match(css, /\\.gui-tree__node:where\\(\\[aria-selected="true"\\]\\) > \\.gui-tree__item/);
assert.match(css, /\\.gui-tree__node:where\\(\\[aria-expanded="true"\\]\\) > \\.gui-tree__item > \\.gui-tree__disclosure/);
assert.match(css, /\\.gui-tree__node:where\\(:focus-visible:not\\(\\[aria-disabled="true"\\]\\)\\) > \\.gui-tree__item/);
assert.match(css, /\\.gui-tree__node:where\\(\\[aria-disabled="true"\\]\\) > \\.gui-tree__item/);
assert.doesNotMatch(css, /\\.gui-tree__node:where\\(\\[aria-selected="true"\\]\\) \\.gui-tree__item/, "Selected parent styling must not bleed into descendant rows");
assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
assert.doesNotMatch(css, /\\{[A-Za-z0-9_.-]+\\}/);
'''
if css_setup.strip() not in test:
    if insert_after not in test:
        raise RuntimeError("missing Tree test import anchor")
    test = test.replace(insert_after, insert_after + css_setup, 1)
test = test.replace(
    'tree.destroy();\nconsole.log("Native Web Tree / Hierarchy adapter tests passed.");',
    'tree.destroy();\nawait rm(irPath, { force: true });\nawait rm(cssPath, { force: true });\nconsole.log("Native Web Tree / Hierarchy adapter and generated CSS tests passed.");',
    1,
)
test_path.write_text(test)
