from pathlib import Path
import json


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise RuntimeError(f"missing anchor in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

# Shared hierarchy scenario becomes explicit cross-platform provenance.
scenario_path = Path("examples/reference-scenarios.json")
scenario = json.loads(scenario_path.read_text())
scenario["phase6Hierarchy"] = {
    "initialValue": "workspace",
    "nodes": [
        {
            "value": "workspace",
            "label": "Workspace",
            "expanded": True,
            "children": [
                {"value": "atlas", "label": "Atlas", "disabled": False},
                {"value": "archive", "label": "Archive", "disabled": True},
            ],
        },
        {"value": "settings", "label": "Settings", "disabled": False},
    ],
    "disabledValue": "archive",
}
scenario_path.write_text(json.dumps(scenario, indent=2, ensure_ascii=False) + "\n")

# Permanent source gates.
replace_once(
    "package.json",
    '    "test:web-tree": "node scripts/test-web-tree.mjs",\n    "test:web-table-reference":',
    '    "test:web-tree": "node scripts/test-web-tree.mjs",\n    "test:web-tree-reference": "node scripts/test-web-tree-reference.mjs",\n    "test:web-table-reference":',
)
replace_once(
    "package.json",
    '    "test:kotlin-navigation": "node scripts/test-compose-navigation.mjs",\n    "test:kotlin-table":',
    '    "test:kotlin-navigation": "node scripts/test-compose-navigation.mjs",\n    "test:kotlin-tree": "node scripts/test-compose-tree.mjs",\n    "test:kotlin-table":',
)
replace_once(
    "package.json",
    "&& npm run test:web-navigation-reference && npm run test:web-table-reference",
    "&& npm run test:web-navigation-reference && npm run test:web-tree-reference && npm run test:web-table-reference",
)
replace_once(
    "package.json",
    "&& npm run test:kotlin-navigation && npm run test:kotlin-table",
    "&& npm run test:kotlin-navigation && npm run test:kotlin-tree && npm run test:kotlin-table",
)

for path in [
    "examples/compose-desktop/src/main/kotlin/Main.kt",
    "examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt",
]:
    replace_once(path, "import gui.framework.compose.GuiNavigationItem\n", "import gui.framework.compose.GuiNavigationItem\nimport gui.framework.compose.GuiTree\nimport gui.framework.compose.GuiTreeItem\n")
    replace_once(path, "import gui.framework.generated.internal.GuiNavigationVariant\n", "import gui.framework.generated.internal.GuiNavigationVariant\nimport gui.framework.generated.internal.GuiTreeSize\n")
    replace_once(
        path,
        '    var navigationValue by remember { mutableStateOf("home") }\n    var tableGridValue',
        '    var navigationValue by remember { mutableStateOf("home") }\n    var treeValue by remember { mutableStateOf("workspace") }\n    var workspaceExpanded by remember { mutableStateOf(true) }\n    var lastTreeActivation by remember { mutableStateOf("none") }\n    var tableGridValue',
    )
    replace_once(
        path,
        "    val navigationSize = if (density == ReferenceDensity.Compact) GuiNavigationSize.SMALL else GuiNavigationSize.MEDIUM\n    val tableSize",
        "    val navigationSize = if (density == ReferenceDensity.Compact) GuiNavigationSize.SMALL else GuiNavigationSize.MEDIUM\n    val treeSize = if (density == ReferenceDensity.Compact) GuiTreeSize.SMALL else GuiTreeSize.MEDIUM\n    val tableSize",
    )
    marker = 'BasicText("Active destination: $navigationValue")'
    block = '''BasicText("Active destination: $navigationValue")
                    val treeItems = listOf(
                        GuiTreeItem(
                            value = "workspace",
                            label = "Workspace",
                            icon = "◇",
                            accessibilityLabel = "Workspace node",
                            expanded = workspaceExpanded,
                            branch = true,
                            children = listOf(
                                GuiTreeItem(value = "atlas", label = "Atlas", icon = "◈", accessibilityLabel = "Atlas node"),
                                GuiTreeItem(value = "archive", label = "Archive", icon = "□", accessibilityLabel = "Archive node", disabled = true),
                            ),
                        ),
                        GuiTreeItem(value = "settings", label = "Settings", icon = "⚙", accessibilityLabel = "Settings node"),
                    )
                    GuiTree(
                        value = treeValue,
                        items = treeItems,
                        onValueChange = { treeValue = it },
                        onExpandedChange = { if (it == "workspace") workspaceExpanded = !workspaceExpanded },
                        onNodeActivate = { lastTreeActivation = it },
                        accessibilityLabel = "Project hierarchy tree",
                        size = treeSize,
                    )
                    BasicText("Selected tree node: $treeValue")
                    BasicText("Workspace branch: ${if (workspaceExpanded) "expanded" else "collapsed"}")
                    BasicText("Activated tree node: $lastTreeActivation")'''
    # Android has less indentation but Kotlin ignores it; same block is valid.
    replace_once(path, marker, block)

# Source gates: append focused assertions without making old component-list order brittle.
for path in ["scripts/test-compose-desktop-reference.mjs", "scripts/test-compose-android-reference.mjs"]:
    p = Path(path)
    source = p.read_text()
    anchor = 'console.log('
    idx = source.rfind(anchor)
    if idx < 0:
        raise RuntimeError(f"missing console anchor in {path}")
    assertions = '''assert.match(source, /GuiTreeSize\\.SMALL/);
assert.match(source, /var treeValue by remember \\{ mutableStateOf\\("workspace"\\) \\}/);
assert.match(source, /var workspaceExpanded by remember \\{ mutableStateOf\\(true\\) \\}/);
assert.match(source, /var lastTreeActivation by remember \\{ mutableStateOf\\("none"\\) \\}/);
assert.match(source, /GuiTreeItem\\(value = "atlas", label = "Atlas", icon = "◈", accessibilityLabel = "Atlas node"\\)/);
assert.match(source, /GuiTreeItem\\(value = "archive", label = "Archive", icon = "□", accessibilityLabel = "Archive node", disabled = true\\)/);
assert.match(source, /accessibilityLabel = "Project hierarchy tree"/);
assert.match(source, /onValueChange = \\{ treeValue = it \\}/);
assert.match(source, /onExpandedChange = \\{ if \\(it == "workspace"\\) workspaceExpanded = !workspaceExpanded \\}/);
assert.match(source, /onNodeActivate = \\{ lastTreeActivation = it \\}/);
assert.match(source, /Selected tree node: \\$treeValue/);
assert.match(source, /Workspace branch: \\$\\{if \\(workspaceExpanded\\) "expanded" else "collapsed"\\}/);
assert.match(source, /Activated tree node: \\$lastTreeActivation/);
'''
    if assertions not in source:
        source = source[:idx] + assertions + source[idx:]
    p.write_text(source)

# Cross-platform parity now consumes the standalone Web Tree reference and the shared scenario.
p = Path("scripts/test-reference-parity.mjs")
s = p.read_text()
s = s.replace(
    "const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, webNavigation, webTable, desktop, android] = await Promise.all([",
    "const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, webNavigation, webTree, webTable, desktop, android] = await Promise.all([",
    1,
)
s = s.replace(
    '  readFile("examples/web-reference/navigation-reference.mjs", "utf8"),\n  readFile("examples/web-reference/table-reference.mjs", "utf8"),',
    '  readFile("examples/web-reference/navigation-reference.mjs", "utf8"),\n  readFile("examples/web-reference/tree-reference.mjs", "utf8"),\n  readFile("examples/web-reference/table-reference.mjs", "utf8"),',
    1,
)
structured_anchor = 'assert.deepEqual(scenario.phase6StructuredData, {\n'
idx = s.find(structured_anchor)
if idx < 0:
    raise RuntimeError("missing structured data parity anchor")
# Insert hierarchy assertion after existing structured-data assertion block using next flows assertion.
flows_anchor = 'assert.deepEqual(scenario.flows.map(({ id }) => id), ['
hidx = s.find(flows_anchor)
hierarchy_assert = '''assert.deepEqual(scenario.phase6Hierarchy, {
  initialValue: "workspace",
  nodes: [
    {
      value: "workspace",
      label: "Workspace",
      expanded: true,
      children: [
        { value: "atlas", label: "Atlas", disabled: false },
        { value: "archive", label: "Archive", disabled: true },
      ],
    },
    { value: "settings", label: "Settings", disabled: false },
  ],
  disabledValue: "archive",
});
'''
if hierarchy_assert not in s:
    s = s[:hidx] + hierarchy_assert + s[hidx:]
web_anchor = 'assert.match(webTable, /createGuiTable\\(/, "Web Table reference must exercise createGuiTable");'
web_tree_assert = '''assert.match(webTree, /createGuiTree\\(/, "Web Tree reference must exercise createGuiTree");
assert.match(webTree, /let value = "workspace"/);
assert.match(webTree, /let workspaceExpanded = true/);
assert.match(webTree, /accessibilityLabel: "Project hierarchy tree"/);
assert.match(webTree, /value: "archive"[\\s\\S]*disabled: true/);
assert.match(webTree, /onValueChange: setValue/);
assert.match(webTree, /onExpandedChange: toggleExpanded/);
assert.match(webTree, /workspace\\.update\\(\\{ expanded: workspaceExpanded \\}\\)/);
'''
if web_tree_assert not in s:
    s = s.replace(web_anchor, web_tree_assert + web_anchor, 1)
# Add GuiTree size/component to shared Compose loops.
s = s.replace('"GuiNavigationSize", "GuiTableSize"', '"GuiNavigationSize", "GuiTreeSize", "GuiTableSize"')
s = s.replace('"GuiNavigation", "GuiTable"', '"GuiNavigation", "GuiTree", "GuiTable"')
compose_anchor = '  assert.match(source, /variant = GuiNavigationVariant\\.VERTICAL/, `${name} must expose the vertical Navigation variant`);\n'
compose_tree_assert = '''  assert.match(source, /var treeValue by remember \\{ mutableStateOf\\("workspace"\\) \\}/, `${name} must expose the shared Tree initial value`);
  assert.match(source, /var workspaceExpanded by remember \\{ mutableStateOf\\(true\\) \\}/, `${name} must expose the shared Tree expansion state`);
  assert.match(source, /accessibilityLabel = "Project hierarchy tree"/, `${name} must expose Tree semantics`);
  assert.match(source, /GuiTreeItem\\(value = "archive", label = "Archive", icon = "□", accessibilityLabel = "Archive node", disabled = true\\)/, `${name} must expose the shared disabled Tree node`);
  assert.match(source, /onValueChange = \\{ treeValue = it \\}/, `${name} must expose controlled Tree selection`);
  assert.match(source, /onExpandedChange = \\{ if \\(it == "workspace"\\) workspaceExpanded = !workspaceExpanded \\}/, `${name} must expose controlled Tree expansion`);
  assert.match(source, /onNodeActivate = \\{ lastTreeActivation = it \\}/, `${name} must expose Tree activation`);
'''
if compose_tree_assert not in s:
    s = s.replace(compose_anchor, compose_anchor + compose_tree_assert, 1)
p.write_text(s)
