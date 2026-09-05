from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one anchor, got {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))


def patch_compose(path, android=False):
    replace_once(path, 'import gui.framework.compose.GuiInput\n', 'import gui.framework.compose.GuiInput\nimport gui.framework.compose.GuiFormActions\nimport gui.framework.compose.GuiFormField\nimport gui.framework.compose.GuiFormLayout\nimport gui.framework.compose.GuiFormLayoutSection\n')
    replace_once(path, 'import gui.framework.generated.internal.GuiInputSize\n', 'import gui.framework.generated.internal.GuiInputSize\nimport gui.framework.generated.internal.GuiFormLayoutSize\nimport gui.framework.generated.internal.GuiFormLayoutVariant\n')
    replace_once(path, '    var lastTreeActivation by remember { mutableStateOf("none") }\n    var tableGridValue by remember { mutableStateOf("atlas") }\n', '    var lastTreeActivation by remember { mutableStateOf("none") }\n    var formEmail by remember { mutableStateOf("jan@example.com") }\n    var formRecovery by remember { mutableStateOf("12") }\n    var formVariant by remember { mutableStateOf(GuiFormLayoutVariant.INLINE) }\n    var formSaveCount by remember { mutableStateOf(0) }\n    var tableGridValue by remember { mutableStateOf("atlas") }\n')
    replace_once(path, '    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM\n    val menuSize =', '    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM\n    val formLayoutSize = if (density == ReferenceDensity.Compact) GuiFormLayoutSize.SMALL else GuiFormLayoutSize.MEDIUM\n    val menuSize =')
    if android:
        old = '''                    BasicText("Selected tree node: $treeValue")\n                    BasicText("Workspace branch: ${if (workspaceExpanded) "expanded" else "collapsed"}")\n                    BasicText("Activated tree node: $lastTreeActivation")\n                val tableColumns = listOf(\n'''
        indent = '                '
    else:
        old = '''                    BasicText("Selected tree node: $treeValue")\n                    BasicText("Workspace branch: ${if (workspaceExpanded) "expanded" else "collapsed"}")\n                    BasicText("Activated tree node: $lastTreeActivation")\n                    val tableColumns = listOf(\n'''
        indent = '                    '
    block = f'''                    BasicText("Selected tree node: $treeValue")\n                    BasicText("Workspace branch: ${{if (workspaceExpanded) "expanded" else "collapsed"}}")\n                    BasicText("Activated tree node: $lastTreeActivation")\n{indent}val recoveryInvalid = formRecovery.length != 6\n{indent}GuiFormLayout(\n{indent}    columns = 2,\n{indent}    accessibilityLabel = "Account settings form layout",\n{indent}    variant = formVariant,\n{indent}    size = formLayoutSize,\n{indent}) {{\n{indent}    GuiFormLayoutSection {{\n{indent}        GuiFormField(\n{indent}            label = "Email",\n{indent}            description = "Used for account notifications.",\n{indent}        ) {{\n{indent}            GuiInput(\n{indent}                value = formEmail,\n{indent}                onValueChange = {{ formEmail = it }},\n{indent}                accessibilityLabel = "Form email",\n{indent}                size = inputSize,\n{indent}            )\n{indent}        }}\n{indent}        GuiFormField(\n{indent}            label = "Recovery code",\n{indent}            description = "Exactly 6 characters.",\n{indent}            errorMessage = if (recoveryInvalid) "Recovery code must contain 6 characters." else "",\n{indent}        ) {{\n{indent}            GuiInput(\n{indent}                value = formRecovery,\n{indent}                onValueChange = {{ formRecovery = it }},\n{indent}                accessibilityLabel = "Form recovery code",\n{indent}                error = recoveryInvalid,\n{indent}                size = inputSize,\n{indent}            )\n{indent}        }}\n{indent}        GuiFormField(\n{indent}            label = "API token",\n{indent}            description = "Managed externally by the host application.",\n{indent}            disabled = true,\n{indent}        ) {{\n{indent}            GuiInput(\n{indent}                value = "sk-local-reference",\n{indent}                onValueChange = {{}},\n{indent}                accessibilityLabel = "Form API token",\n{indent}                disabled = true,\n{indent}                size = inputSize,\n{indent}            )\n{indent}        }}\n{indent}    }}\n{indent}    GuiFormActions {{\n{indent}        GuiButton(\n{indent}            label = "Save settings",\n{indent}            onActivate = {{ formSaveCount += 1 }},\n{indent}            size = buttonSize,\n{indent}        )\n{indent}        GuiButton(\n{indent}            label = if (formVariant == GuiFormLayoutVariant.INLINE) "Use stacked layout" else "Use inline layout",\n{indent}            onActivate = {{\n{indent}                formVariant = if (formVariant == GuiFormLayoutVariant.INLINE) {{\n{indent}                    GuiFormLayoutVariant.STACKED\n{indent}                }} else {{\n{indent}                    GuiFormLayoutVariant.INLINE\n{indent}                }}\n{indent}            }},\n{indent}            size = buttonSize,\n{indent}        )\n{indent}        GuiButton(\n{indent}            label = "Reset recovery code",\n{indent}            onActivate = {{ formRecovery = "12" }},\n{indent}            size = buttonSize,\n{indent}        )\n{indent}    }}\n{indent}    GuiFormLayoutSection {{\n{indent}        BasicText("Saved: $formSaveCount · variant: ${{formVariant.wireValue}} · email: $formEmail")\n{indent}    }}\n{indent}}}\n{indent}val tableColumns = listOf(\n'''
    replace_once(path, old, block)


def patch_desktop_test(path):
    replace_once(path, '"GuiNavigation", "GuiTable"', '"GuiNavigation", "GuiFormLayout", "GuiTable"')
    replace_once(path, 'assert.match(source, /GuiNavigationSize\\.SMALL/);\nassert.match(source, /GuiTableSize\\.SMALL/);', 'assert.match(source, /GuiNavigationSize\\.SMALL/);\nassert.match(source, /GuiFormLayoutSize\\.SMALL/);\nassert.match(source, /GuiTableSize\\.SMALL/);')
    anchor = 'assert.match(source, /Active destination: \\$navigationValue/);\n'
    form = r'''assert.match(source, /var formEmail by remember \{ mutableStateOf\("jan@example\.com"\) \}/);
assert.match(source, /var formRecovery by remember \{ mutableStateOf\("12"\) \}/);
assert.match(source, /var formVariant by remember \{ mutableStateOf\(GuiFormLayoutVariant\.INLINE\) \}/);
assert.match(source, /var formSaveCount by remember \{ mutableStateOf\(0\) \}/);
assert.match(source, /columns = 2/);
assert.match(source, /accessibilityLabel = "Account settings form layout"/);
assert.match(source, /accessibilityLabel = "Form email"/);
assert.match(source, /accessibilityLabel = "Form recovery code"/);
assert.match(source, /Recovery code must contain 6 characters\./);
assert.match(source, /accessibilityLabel = "Form API token"/);
assert.match(source, /label = "Save settings"/);
assert.match(source, /"Use stacked layout" else "Use inline layout"/);
assert.match(source, /label = "Reset recovery code"/);
assert.match(source, /Saved: \$formSaveCount · variant: \$\{formVariant\.wireValue\} · email: \$formEmail/);
'''
    replace_once(path, anchor, anchor + form)
    replace_once(path, 'Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Menu coverage', 'Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Form Layout/Menu coverage')


def patch_android_test(path):
    replace_once(path, '"GuiMenuSize", "GuiNavigationSize", "GuiTableSize"', '"GuiMenuSize", "GuiNavigationSize", "GuiFormLayoutSize", "GuiTableSize"')
    replace_once(path, '"GuiNavigation", "GuiTable"', '"GuiNavigation", "GuiFormLayout", "GuiTable"')
    anchor = 'assert.match(source, /Active destination: \\$navigationValue/);\n'
    form = r'''assert.match(source, /var formEmail by remember \{ mutableStateOf\("jan@example\.com"\) \}/);
assert.match(source, /var formRecovery by remember \{ mutableStateOf\("12"\) \}/);
assert.match(source, /var formVariant by remember \{ mutableStateOf\(GuiFormLayoutVariant\.INLINE\) \}/);
assert.match(source, /var formSaveCount by remember \{ mutableStateOf\(0\) \}/);
assert.match(source, /accessibilityLabel = "Account settings form layout"/);
assert.match(source, /accessibilityLabel = "Form email"/);
assert.match(source, /accessibilityLabel = "Form recovery code"/);
assert.match(source, /Recovery code must contain 6 characters\./);
assert.match(source, /accessibilityLabel = "Form API token"/);
assert.match(source, /label = "Save settings"/);
assert.match(source, /"Use stacked layout" else "Use inline layout"/);
assert.match(source, /label = "Reset recovery code"/);
assert.match(source, /Saved: \$formSaveCount · variant: \$\{formVariant\.wireValue\} · email: \$formEmail/);
'''
    replace_once(path, anchor, anchor + form)
    runtime_anchor = 'assert.match(runtimeTest, /Activated tree node: settings/);\n'
    runtime_form = r'''assert.match(runtimeTest, /onNodeWithContentDescription\("Account settings form layout"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Form email"\)/);
assert.match(runtimeTest, /onNodeWithContentDescription\("Form recovery code"\)/);
assert.match(runtimeTest, /performTextReplacement\("ABC123"\)/);
assert.match(runtimeTest, /Recovery code must contain 6 characters\./);
assert.match(runtimeTest, /onNodeWithContentDescription\("Form API token"\)/);
assert.match(runtimeTest, /onNodeWithText\("Use stacked layout"\)/);
assert.match(runtimeTest, /onNodeWithText\("Use inline layout"\)/);
assert.match(runtimeTest, /onNodeWithText\("Save settings"\)/);
assert.match(runtimeTest, /Saved: 1 · variant: stacked · email: forms@example\.com/);
'''
    replace_once(path, runtime_anchor, runtime_anchor + runtime_form)
    replace_once(path, 'Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Menu coverage', 'Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Form Layout/Menu coverage')


def patch_runtime(path):
    anchor = '''            val settingsTreeActivationStatus = composeRule.onNodeWithText("Activated tree node: settings")\n            settingsTreeActivationStatus.performScrollTo().assertIsDisplayed()\n\n'''
    block = '''            val settingsTreeActivationStatus = composeRule.onNodeWithText("Activated tree node: settings")\n            settingsTreeActivationStatus.performScrollTo().assertIsDisplayed()\n\n            composeRule.onNodeWithContentDescription("Account settings form layout")\n                .performScrollTo()\n                .assertIsDisplayed()\n            val formEmail = composeRule.onNodeWithContentDescription("Form email")\n            formEmail.performScrollTo().assertIsDisplayed().performTextReplacement("forms@example.com")\n            val formRecovery = composeRule.onNodeWithContentDescription("Form recovery code")\n            formRecovery.performScrollTo().assertIsDisplayed()\n            composeRule.onNodeWithText("Recovery code must contain 6 characters.")\n                .performScrollTo()\n                .assertIsDisplayed()\n            formRecovery.performTextReplacement("ABC123")\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("Recovery code must contain 6 characters.").assertDoesNotExist()\n            composeRule.onNodeWithContentDescription("Form API token")\n                .performScrollTo()\n                .assertIsDisplayed()\n                .assertIsNotEnabled()\n            composeRule.onNodeWithText("Use stacked layout")\n                .performScrollTo()\n                .assertIsDisplayed()\n                .performClick()\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("Use inline layout").performScrollTo().assertIsDisplayed()\n            composeRule.onNodeWithText("Save settings")\n                .performScrollTo()\n                .assertIsDisplayed()\n                .performClick()\n            composeRule.waitForIdle()\n            composeRule.onNodeWithText("Saved: 1 · variant: stacked · email: forms@example.com")\n                .performScrollTo()\n                .assertIsDisplayed()\n\n'''
    replace_once(path, anchor, block)


def patch_parity(path):
    replace_once(path, 'const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, webNavigation, webTree, webTable, desktop, android] = await Promise.all([', 'const [scenario, manifest, web, webSelect, webTooltip, webToast, webProgress, webSlider, webNavigation, webTree, webFormLayout, webTable, desktop, android] = await Promise.all([')
    replace_once(path, '  readFile("examples/web-reference/tree-reference.mjs", "utf8"),\n  readFile("examples/web-reference/table-reference.mjs", "utf8"),', '  readFile("examples/web-reference/tree-reference.mjs", "utf8"),\n  readFile("examples/web-reference/form-layout-reference.mjs", "utf8"),\n  readFile("examples/web-reference/table-reference.mjs", "utf8"),')
    marker = '''assert.deepEqual(scenario.phase6Hierarchy, {\n  initialValue: "workspace",\n  nodes: [\n    {\n      value: "workspace",\n      label: "Workspace",\n      expanded: true,\n      children: [\n        { value: "atlas", label: "Atlas", disabled: false },\n        { value: "archive", label: "Archive", disabled: true },\n      ],\n    },\n    { value: "settings", label: "Settings", disabled: false },\n  ],\n  disabledValue: "archive",\n});\n'''
    formscenario = marker + '''assert.deepEqual(scenario.phase6FormLayout, {\n  columns: 2,\n  initialVariant: "inline",\n  compactColumns: 1,\n  fields: [\n    { id: "email", label: "Email", initialValue: "jan@example.com", disabled: false, error: false },\n    { id: "recovery", label: "Recovery code", initialValue: "12", disabled: false, error: true },\n    { id: "token", label: "API token", initialValue: "sk-local-reference", disabled: true, error: false },\n  ],\n  validRecoveryValue: "ABC123",\n});\n'''
    replace_once(path, marker, formscenario)
    webtree = 'assert.match(webTree, /workspace\\.update\\(\\{ expanded: workspaceExpanded \\}\\)/);\n'
    webform = r'''assert.match(webFormLayout, /createGuiFormLayout\(/, "Web Form Layout reference must exercise createGuiFormLayout");
assert.match(webFormLayout, /accessibilityLabel: "Account settings form layout"/);
assert.match(webFormLayout, /columns: 2/);
assert.match(webFormLayout, /let variant = "inline"/);
assert.match(webFormLayout, /let emailValue = "jan@example\.com"/);
assert.match(webFormLayout, /let recoveryValue = "12"/);
assert.match(webFormLayout, /label: "Recovery code"/);
assert.match(webFormLayout, /error: "Recovery code must contain 6 characters\."/);
assert.match(webFormLayout, /label: "API token"[\s\S]*disabled: true/);
assert.match(webFormLayout, /label: "Save settings"/);
assert.match(webFormLayout, /label: "Use stacked layout"/);
assert.match(webFormLayout, /root\.dataset\.guiDensity = density/);
'''
    replace_once(path, webtree, webtree + webform)
    replace_once(path, '"GuiMenuSize", "GuiNavigationSize", "GuiTreeSize", "GuiTableSize"', '"GuiMenuSize", "GuiNavigationSize", "GuiTreeSize", "GuiFormLayoutSize", "GuiTableSize"')
    replace_once(path, '"GuiNavigation", "GuiTree", "GuiTable"', '"GuiNavigation", "GuiTree", "GuiFormLayout", "GuiTable"')
    treeact = '  assert.match(source, /onNodeActivate = \\{ lastTreeActivation = it \\}/, `${name} must expose Tree activation`);\n'
    composeform = r'''  assert.match(source, /var formEmail by remember \{ mutableStateOf\("jan@example\.com"\) \}/, `${name} must expose the shared Form Layout email value`);
  assert.match(source, /var formRecovery by remember \{ mutableStateOf\("12"\) \}/, `${name} must expose the shared Form Layout recovery value`);
  assert.match(source, /var formVariant by remember \{ mutableStateOf\(GuiFormLayoutVariant\.INLINE\) \}/, `${name} must expose the shared Form Layout variant`);
  assert.match(source, /accessibilityLabel = "Account settings form layout"/, `${name} must expose Form Layout semantics`);
  assert.match(source, /columns = 2/, `${name} must request the shared two-column Form Layout`);
  assert.match(source, /accessibilityLabel = "Form email"/, `${name} must expose the Form Layout email control`);
  assert.match(source, /accessibilityLabel = "Form recovery code"/, `${name} must expose the Form Layout recovery control`);
  assert.match(source, /Recovery code must contain 6 characters\./, `${name} must expose the shared recovery error`);
  assert.match(source, /accessibilityLabel = "Form API token"[\s\S]*disabled = true/, `${name} must expose the shared disabled token field`);
  assert.match(source, /label = "Save settings"/, `${name} must expose the shared Form Layout action`);
  assert.match(source, /Saved: \$formSaveCount · variant: \$\{formVariant\.wireValue\} · email: \$formEmail/, `${name} must expose the shared Form Layout status`);
'''
    replace_once(path, treeact, treeact + composeform)
    replace_once(path, 'Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Table/Data Grid/Menu extensions', 'Basic Checkbox/Radio/Select/Tabs/Tooltip/Toast/Progress/Slider/Navigation/Form Layout/Table/Data Grid/Menu extensions')


if __name__ == '__main__':
    patch_compose('examples/compose-desktop/src/main/kotlin/Main.kt', android=False)
    patch_compose('examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt', android=True)
    patch_runtime('examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt')
    patch_desktop_test('scripts/test-compose-desktop-reference.mjs')
    patch_android_test('scripts/test-compose-android-reference.mjs')
    patch_parity('scripts/test-reference-parity.mjs')
