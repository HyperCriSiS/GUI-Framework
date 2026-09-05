from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"missing patch anchor: {label}")
    return text.replace(old, new, 1)


path = Path("packages/adapter-compose/src/main/kotlin/GuiTable.kt")
source = path.read_text()
source = replace_once(source, "import androidx.compose.foundation.combinedClickable\n", "import androidx.compose.foundation.clickable\n", "clickable import")
source = replace_once(source, "import androidx.compose.ui.input.key.type\n", "import androidx.compose.ui.input.key.type\nimport androidx.compose.ui.platform.LocalViewConfiguration\n", "view configuration import")
source = replace_once(
    source,
    '''data class GuiDataGridColumn(val label: String) {\n    init { require(label.isNotBlank()) { "GUI data-grid column label must not be blank" } }\n}\n\n''',
    '''data class GuiDataGridColumn(val label: String) {\n    init { require(label.isNotBlank()) { "GUI data-grid column label must not be blank" } }\n}\n\nprivate class GuiDataGridClickTracker {\n    private var lastValue: String? = null\n    private var lastClickNanos: Long = 0L\n\n    fun register(\n        value: String,\n        nowNanos: Long,\n        minIntervalMillis: Long,\n        timeoutMillis: Long,\n    ): Boolean {\n        val elapsedMillis = if (lastClickNanos == 0L) {\n            Long.MAX_VALUE\n        } else {\n            (nowNanos - lastClickNanos) / 1_000_000L\n        }\n        val isDoubleClick = lastValue == value &&\n            elapsedMillis >= minIntervalMillis &&\n            elapsedMillis <= timeoutMillis\n\n        if (isDoubleClick) {\n            lastValue = null\n            lastClickNanos = 0L\n        } else {\n            lastValue = value\n            lastClickNanos = nowNanos\n        }\n        return isDoubleClick\n    }\n}\n\n''',
    "click tracker",
)
source = replace_once(
    source,
    '''    onMoveFocus: (String, Int?) -> Unit,\n    onValueChange: (String) -> Unit,\n    onRowActivate: (String) -> Unit,\n) {''',
    '''    onMoveFocus: (String, Int?) -> Unit,\n    onClick: (String) -> Unit,\n    onValueChange: (String) -> Unit,\n    onRowActivate: (String) -> Unit,\n) {''',
    "row click callback",
)
source = replace_once(
    source,
    '''.combinedClickable(\n            interactionSource = source,\n            indication = null,\n            enabled = enabled,\n            onClick = { if (!isSelected) onValueChange(row.value) },\n            onDoubleClick = { onRowActivate(row.value) },\n        )''',
    '''.clickable(\n            interactionSource = source,\n            indication = null,\n            enabled = enabled,\n            onClick = { onClick(row.value) },\n        )''',
    "immediate row click",
)
source = replace_once(
    source,
    '''    val enabledRows = rows.filterNot { disabled || it.disabled }\n    val requesters = remember(rows.map { it.value }) { rows.associate { it.value to FocusRequester() } }\n\n    fun moveFocus(current: String, directive: Int?) {''',
    '''    val enabledRows = rows.filterNot { disabled || it.disabled }\n    val requesters = remember(rows.map { it.value }) { rows.associate { it.value to FocusRequester() } }\n    val clickTracker = remember { GuiDataGridClickTracker() }\n    val viewConfiguration = LocalViewConfiguration.current\n\n    fun handleRowClick(rowValue: String) {\n        val activate = clickTracker.register(\n            value = rowValue,\n            nowNanos = System.nanoTime(),\n            minIntervalMillis = viewConfiguration.doubleTapMinTimeMillis,\n            timeoutMillis = viewConfiguration.doubleTapTimeoutMillis,\n        )\n        if (activate) {\n            onRowActivate(rowValue)\n        } else if (rowValue != value) {\n            onValueChange(rowValue)\n        }\n    }\n\n    fun moveFocus(current: String, directive: Int?) {''',
    "row click handler",
)
source = replace_once(
    source,
    '''                    onMoveFocus = ::moveFocus,\n                    onValueChange = onValueChange,\n                    onRowActivate = onRowActivate,''',
    '''                    onMoveFocus = ::moveFocus,\n                    onClick = ::handleRowClick,\n                    onValueChange = onValueChange,\n                    onRowActivate = onRowActivate,''',
    "row click wiring",
)
source = replace_once(
    source,
    ''' * Foundation-only controlled row-selection Data Grid. Arrow/Home/End keys move focus without\n * mutating selection; Space requests selection and Enter/double-click emits row activation.\n */''',
    ''' * Foundation-only controlled row-selection Data Grid. Arrow/Home/End keys move focus without\n * mutating selection; Space requests selection, Enter activates directly, and a consecutive\n * second click within the platform double-click window activates without delaying first-click selection.\n */''',
    "adapter documentation",
)
path.write_text(source)

path = Path("scripts/test-compose-table.mjs")
source = path.read_text()
source = replace_once(source, "assert.match(source, /combinedClickable\\(/);", "assert.match(source, /\\.clickable\\(/);", "clickable source gate")
source = replace_once(
    source,
    '''assert.match(source, /if \\(!isSelected\\) onValueChange\\(row\\.value\\)/);\nassert.match(source, /onDoubleClick = \\{ onRowActivate\\(row\\.value\\) \\}/);''',
    '''assert.match(source, /if \\(!isSelected\\) onValueChange\\(row\\.value\\)/);\nassert.match(source, /GuiDataGridClickTracker/);\nassert.match(source, /doubleTapMinTimeMillis/);\nassert.match(source, /doubleTapTimeoutMillis/);\nassert.match(source, /onClick = \\{ onClick\\(row\\.value\\) \\}/);\nassert.match(source, /if \\(activate\\) \\{[\\s\\S]*onRowActivate\\(rowValue\\)/);\nassert.doesNotMatch(source, /onDoubleClick\\s*=/);''',
    "double click source gate",
)
path.write_text(source)

path = Path("examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt")
source = path.read_text()
source = replace_once(source, "import androidx.compose.ui.test.assertIsSelected\n", "import androidx.compose.ui.test.assertIsSelected\nimport androidx.compose.ui.test.doubleClick\n", "double click test import")
source = replace_once(source, "import androidx.compose.ui.test.performTextReplacement\n", "import androidx.compose.ui.test.performTextReplacement\nimport androidx.compose.ui.test.performTouchInput\n", "touch input test import")
source = replace_once(
    source,
    '''            atlasRow.assertIsNotSelected()\n            novaRow.assertIsSelected()\n            composeRule.onNodeWithText("Selected project row: nova").assertIsDisplayed()\n''',
    '''            atlasRow.assertIsNotSelected()\n            novaRow.assertIsSelected()\n            composeRule.onNodeWithText("Selected project row: nova").assertIsDisplayed()\n\n            atlasRow.performTouchInput { doubleClick() }\n            composeRule.waitForIdle()\n            atlasRow.assertIsSelected()\n            novaRow.assertIsNotSelected()\n            composeRule.onNodeWithText("Selected project row: atlas").assertIsDisplayed()\n            composeRule.onNodeWithText("Activated project row: atlas").assertIsDisplayed()\n''',
    "runtime activation coverage",
)
path.write_text(source)
