import json
from pathlib import Path

scenario_path = Path('examples/reference-scenarios.json')
scenario = json.loads(scenario_path.read_text())
assert 'phase6StructuredData' not in scenario
scenario['phase6StructuredData'] = {
    'columns': ['Project', 'Owner', 'Status'],
    'rows': [
        {'value': 'atlas', 'cells': ['Atlas', 'Mira', 'Ready'], 'disabled': False},
        {'value': 'nova', 'cells': ['Nova', 'Kai', 'Review'], 'disabled': False},
        {'value': 'archive', 'cells': ['Archive', 'System', 'Locked'], 'disabled': True},
    ],
    'initialValue': 'atlas',
    'disabledValue': 'archive',
}
scenario_path.write_text(json.dumps(scenario, indent=2) + '\n')

parity_path = Path('scripts/test-reference-parity.mjs')
s = parity_path.read_text()
s = s.replace(
    'const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, webNavigation, desktop, android] = await Promise.all([',
    'const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, webNavigation, webTable, desktop, android] = await Promise.all([',
    1,
)
s = s.replace(
    '  readFile("examples/web-reference/navigation-reference.mjs", "utf8"),\n  readFile("examples/compose-desktop',
    '  readFile("examples/web-reference/navigation-reference.mjs", "utf8"),\n  readFile("examples/web-reference/table-reference.mjs", "utf8"),\n  readFile("examples/compose-desktop',
    1,
)
anchor = '''assert.deepEqual(scenario.densityProfiles, {\n  standard: { usesComponentDefaults: true },\n  compact: { componentSize: "small", minimumViewportWidth: 320 },\n});\n'''
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + '''assert.deepEqual(scenario.phase6StructuredData, {\n  columns: ["Project", "Owner", "Status"],\n  rows: [\n    { value: "atlas", cells: ["Atlas", "Mira", "Ready"], disabled: false },\n    { value: "nova", cells: ["Nova", "Kai", "Review"], disabled: false },\n    { value: "archive", cells: ["Archive", "System", "Locked"], disabled: true },\n  ],\n  initialValue: "atlas",\n  disabledValue: "archive",\n});\n''', 1)
nav_anchor = 'assert.match(webNavigation, /variant: "vertical"/);\n'
assert s.count(nav_anchor) == 1
s = s.replace(nav_anchor, nav_anchor + '''assert.match(webTable, /createGuiTable\\(/, "Web Table reference must exercise createGuiTable");\nassert.match(webTable, /createGuiDataGrid\\(/, "Web Table reference must exercise createGuiDataGrid");\nassert.match(webTable, /caption: "Project inventory"/);\nassert.match(webTable, /accessibilityLabel: "Project inventory table"/);\nassert.match(webTable, /accessibilityLabel: "Project selection grid"/);\nassert.match(webTable, /let value = "atlas"/);\nassert.match(webTable, /value: "archive"[\\s\\S]*disabled: true/);\nassert.match(webTable, /grid\\.update\\(\\{ value \\}\\)/);\nassert.match(webTable, /grid\\.update\\(\\{ disabled \\}\\)/);\n''', 1)
s = s.replace(
    '"GuiMenuSize", "GuiNavigationSize", "GuiPanelSize"',
    '"GuiMenuSize", "GuiNavigationSize", "GuiTableSize", "GuiDataGridSize", "GuiPanelSize"',
    1,
)
s = s.replace(
    '"GuiNavigation", "GuiMenu", "GuiSwitch"',
    '"GuiNavigation", "GuiTable", "GuiDataGrid", "GuiMenu", "GuiSwitch"',
    1,
)
compose_anchor = '  assert.match(source, /variant = GuiNavigationVariant\\.VERTICAL/, `${name} must expose the vertical Navigation variant`);\n'
assert s.count(compose_anchor) == 1
s = s.replace(compose_anchor, compose_anchor + '''  assert.match(source, /var tableGridValue by remember \\{ mutableStateOf\\("atlas"\\) \\}/, `${name} must expose the shared Data Grid initial value`);\n  assert.match(source, /caption = "Project inventory"/, `${name} must expose the shared Table caption`);\n  assert.match(source, /accessibilityLabel = "Project inventory table"/, `${name} must expose Table semantics`);\n  assert.match(source, /variant = GuiTableVariant\\.GRIDLINED/, `${name} must exercise the gridlined passive Table variant`);\n  assert.match(source, /accessibilityLabel = "Project selection grid"/, `${name} must expose Data Grid semantics`);\n  assert.match(source, /GuiDataGridRow\\("archive",[\\s\\S]*disabled = true\\)/, `${name} must expose the shared disabled Archive row`);\n  assert.match(source, /onValueChange = \\{ tableGridValue = it \\}/, `${name} must expose controlled Data Grid selection`);\n  assert.match(source, /onRowActivate = \\{ lastGridActivation = it \\}/, `${name} must expose Data Grid activation`);\n''', 1)
old_log = 'console.log("Cross-platform reference application parity tests passed with Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Menu extensions and validated Modern/Glass/Frosted/Spacey/Cyberpunk selection paths.");'
new_log = 'console.log("Cross-platform reference application parity tests passed with Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Table/Data Grid/Menu extensions and validated Modern/Glass/Frosted/Spacey/Cyberpunk selection paths.");'
assert s.count(old_log) == 1
parity_path.write_text(s.replace(old_log, new_log, 1))

runtime_path = Path('examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt')
s = runtime_path.read_text()
anchor = '''            val settingsDestinations = composeRule.onAllNodesWithContentDescription("Settings destination")\n            settingsDestinations.assertCountEquals(2)\n            settingsDestinations[1].performScrollTo().assertIsDisplayed().performClick()\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("Active destination: settings").assertIsDisplayed()\n'''
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + '''\n            composeRule.onNodeWithContentDescription("Project inventory table")\n                .performScrollTo()\n                .assertIsDisplayed()\n            composeRule.onNodeWithContentDescription("Project selection grid")\n                .performScrollTo()\n                .assertIsDisplayed()\n\n            val atlasRow = composeRule.onNodeWithContentDescription("Atlas project row")\n            val novaRow = composeRule.onNodeWithContentDescription("Nova project row")\n            val archiveRow = composeRule.onNodeWithContentDescription("Archive project row")\n            atlasRow.performScrollTo().assertIsDisplayed().assertIsSelected()\n            novaRow.assertIsDisplayed().assertIsNotSelected()\n            archiveRow.assertIsDisplayed().assertIsNotEnabled()\n            novaRow.performClick()\n            composeRule.waitForIdle()\n            atlasRow.assertIsNotSelected()\n            novaRow.assertIsSelected()\n            composeRule.onNodeWithText("Selected project row: nova").assertIsDisplayed()\n''', 1)
runtime_path.write_text(s)

browser_path = Path('tests/browser/table-reference.spec.mjs')
assert not browser_path.exists()
browser_path.write_text(r'''// SPDX-License-Identifier: AGPL-3.0-or-later

import { expect, test } from "@playwright/test";

const referencePath = "/examples/web-reference/table.html";

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("Basic Table and Data Grid reference preserves passive table semantics and controlled row selection", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto(`${referencePath}?density=compact`);

  const root = page.locator("#gui-table-reference-root");
  const table = page.getByRole("table", { name: "Project inventory table" });
  const grid = page.getByRole("grid", { name: "Project selection grid" });

  await expect(root).toHaveAttribute("data-gui-theme", "basic");
  await expect(root).toHaveAttribute("data-gui-density", "compact");
  await expect(table).toHaveAttribute("data-gui-size", "small");
  await expect(grid).toHaveAttribute("data-gui-size", "small");
  await expect(table.getByText("Project inventory", { exact: true })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Project" })).toBeVisible();
  await expect(table.getByText("Atlas", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const atlas = grid.getByRole("row", { name: "Atlas project row" });
  const nova = grid.getByRole("row", { name: "Nova project row" });
  const archive = grid.getByRole("row", { name: "Archive project row" });

  await expect(atlas).toHaveAttribute("aria-selected", "true");
  await expect(atlas).toHaveAttribute("tabindex", "0");
  await expect(nova).toHaveAttribute("aria-selected", "false");
  await expect(archive).toHaveAttribute("aria-disabled", "true");
  await expect(archive).toHaveAttribute("tabindex", "-1");
  await expect(page.getByText("Selected row: atlas · activated: none · grid enabled", { exact: true })).toBeVisible();

  await nova.click();
  await expect(nova).toHaveAttribute("aria-selected", "true");
  await expect(nova).toHaveAttribute("tabindex", "0");
  await expect(atlas).toHaveAttribute("aria-selected", "false");
  await expect(page.getByText("Selected row: nova · activated: none · grid enabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Select Atlas" }).click();
  await atlas.focus();
  await expect(atlas).toBeFocused();
  await atlas.press("ArrowDown");
  await expect(nova).toBeFocused();
  await nova.press("Space");
  await expect(nova).toHaveAttribute("aria-selected", "true");
  await nova.press("Enter");
  await expect(page.getByText("Selected row: nova · activated: nova · grid enabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Disable grid" }).click();
  await expect(grid).toHaveAttribute("aria-disabled", "true");
  await expect(atlas).toHaveAttribute("aria-disabled", "true");
  await expect(nova).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Selected row: nova · activated: nova · grid disabled", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enable grid" }).click();
  await expect(grid).toHaveAttribute("aria-disabled", "false");
  await expect(nova).toHaveAttribute("aria-selected", "true");
  await expectNoHorizontalOverflow(page);
});
''')
