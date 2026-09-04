from pathlib import Path

files = [
    Path('examples/compose-desktop/src/main/kotlin/Main.kt'),
    Path('examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt'),
]

for p in files:
    s = p.read_text()
    nav_import = 'import gui.framework.compose.GuiNavigationItem\n'
    assert s.count(nav_import) == 1
    s = s.replace(nav_import, nav_import + (
        'import gui.framework.compose.GuiDataGrid\n'
        'import gui.framework.compose.GuiDataGridColumn\n'
        'import gui.framework.compose.GuiDataGridRow\n'
        'import gui.framework.compose.GuiTable\n'
        'import gui.framework.compose.GuiTableColumn\n'
        'import gui.framework.compose.GuiTableRow\n'
    ), 1)

    generated = 'import gui.framework.generated.internal.GuiNavigationVariant\n'
    assert s.count(generated) == 1
    s = s.replace(generated, generated + (
        'import gui.framework.generated.internal.GuiDataGridSize\n'
        'import gui.framework.generated.internal.GuiTableSize\n'
        'import gui.framework.generated.internal.GuiTableVariant\n'
    ), 1)

    state = '    var navigationValue by remember { mutableStateOf("home") }\n'
    assert s.count(state) == 1
    s = s.replace(state, state + (
        '    var tableGridValue by remember { mutableStateOf("atlas") }\n'
        '    var lastGridActivation by remember { mutableStateOf("none") }\n'
    ), 1)

    size = '    val navigationSize = if (density == ReferenceDensity.Compact) GuiNavigationSize.SMALL else GuiNavigationSize.MEDIUM\n'
    assert s.count(size) == 1
    s = s.replace(size, size + (
        '    val tableSize = if (density == ReferenceDensity.Compact) GuiTableSize.SMALL else GuiTableSize.MEDIUM\n'
        '    val dataGridSize = if (density == ReferenceDensity.Compact) GuiDataGridSize.SMALL else GuiDataGridSize.MEDIUM\n'
    ), 1)

    desktop = 'compose-desktop' in str(p)
    indent = '                    ' if desktop else '                '
    marker = indent + 'BasicText("Active destination: $navigationValue")\n'
    assert s.count(marker) == 1
    lines = [
        'BasicText("Active destination: $navigationValue")',
        'val tableColumns = listOf(',
        '    GuiTableColumn("Project"),',
        '    GuiTableColumn("Owner"),',
        '    GuiTableColumn("Status"),',
        ')',
        'val tableRows = listOf(',
        '    GuiTableRow(listOf("Atlas", "Mira", "Ready")),',
        '    GuiTableRow(listOf("Nova", "Kai", "Review")),',
        '    GuiTableRow(listOf("Archive", "System", "Locked")),',
        ')',
        'GuiTable(',
        '    columns = tableColumns,',
        '    rows = tableRows,',
        '    caption = "Project inventory",',
        '    accessibilityLabel = "Project inventory table",',
        '    variant = GuiTableVariant.GRIDLINED,',
        '    size = tableSize,',
        ')',
        'val gridColumns = listOf(',
        '    GuiDataGridColumn("Project"),',
        '    GuiDataGridColumn("Owner"),',
        '    GuiDataGridColumn("Status"),',
        ')',
        'val gridRows = listOf(',
        '    GuiDataGridRow("atlas", listOf("Atlas", "Mira", "Ready"), accessibilityLabel = "Atlas project row"),',
        '    GuiDataGridRow("nova", listOf("Nova", "Kai", "Review"), accessibilityLabel = "Nova project row"),',
        '    GuiDataGridRow("archive", listOf("Archive", "System", "Locked"), accessibilityLabel = "Archive project row", disabled = true),',
        ')',
        'GuiDataGrid(',
        '    columns = gridColumns,',
        '    rows = gridRows,',
        '    value = tableGridValue,',
        '    onValueChange = { tableGridValue = it },',
        '    onRowActivate = { lastGridActivation = it },',
        '    accessibilityLabel = "Project selection grid",',
        '    size = dataGridSize,',
        ')',
        'BasicText("Selected project row: $tableGridValue")',
        'BasicText("Activated project row: $lastGridActivation")',
    ]
    block = ''.join(indent + line + '\n' for line in lines)
    s = s.replace(marker, block, 1)
    p.write_text(s)

for path in ['scripts/test-compose-desktop-reference.mjs', 'scripts/test-compose-android-reference.mjs']:
    p = Path(path)
    s = p.read_text()
    s = s.replace('"GuiNavigation", "GuiMenu"', '"GuiNavigation", "GuiTable", "GuiDataGrid", "GuiMenu"', 1)
    if 'android' in path:
        s = s.replace('"GuiNavigationSize", "GuiPanelSize"', '"GuiNavigationSize", "GuiTableSize", "GuiDataGridSize", "GuiPanelSize"', 1)
    else:
        marker = 'assert.match(source, /GuiNavigationSize\\.SMALL/);\n'
        assert s.count(marker) == 1
        s = s.replace(marker, marker + 'assert.match(source, /GuiTableSize\\.SMALL/);\nassert.match(source, /GuiDataGridSize\\.SMALL/);\n', 1)

    marker = 'assert.match(source, /Active destination: \\$navigationValue/);\n'
    assert s.count(marker) == 1
    additions = (
        'assert.match(source, /var tableGridValue by remember \\{ mutableStateOf\\("atlas"\\) \\}/);\n'
        'assert.match(source, /caption = "Project inventory"/);\n'
        'assert.match(source, /accessibilityLabel = "Project inventory table"/);\n'
        'assert.match(source, /variant = GuiTableVariant\\.GRIDLINED/);\n'
        'assert.match(source, /accessibilityLabel = "Project selection grid"/);\n'
        'assert.match(source, /GuiDataGridRow\\("archive",[\\s\\S]*accessibilityLabel = "Archive project row", disabled = true\\)/);\n'
        'assert.match(source, /onValueChange = \\{ tableGridValue = it \\}/);\n'
        'assert.match(source, /onRowActivate = \\{ lastGridActivation = it \\}/);\n'
        'assert.match(source, /Selected project row: \\$tableGridValue/);\n'
        'assert.match(source, /Activated project row: \\$lastGridActivation/);\n'
    )
    s = s.replace(marker, marker + additions, 1)
    p.write_text(s)
