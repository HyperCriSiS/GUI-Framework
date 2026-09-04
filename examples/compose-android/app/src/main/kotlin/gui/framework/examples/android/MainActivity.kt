// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiCheckbox
import gui.framework.compose.GuiDialog
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiMenu
import gui.framework.compose.GuiMenuItem
import gui.framework.compose.GuiNavigation
import gui.framework.compose.GuiNavigationItem
import gui.framework.compose.GuiDataGrid
import gui.framework.compose.GuiDataGridColumn
import gui.framework.compose.GuiDataGridRow
import gui.framework.compose.GuiTable
import gui.framework.compose.GuiTableColumn
import gui.framework.compose.GuiTableRow
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiProgress
import gui.framework.compose.GuiRadio
import gui.framework.compose.GuiRadioGroup
import gui.framework.compose.GuiSelect
import gui.framework.compose.GuiSlider
import gui.framework.compose.GuiSelectOption
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTabItem
import gui.framework.compose.GuiTabs
import gui.framework.compose.GuiTheme
import gui.framework.compose.GuiToast
import gui.framework.compose.GuiTooltip
import gui.framework.generated.internal.GuiButtonSize
import gui.framework.generated.internal.GuiCheckboxSize
import gui.framework.generated.internal.GuiDialogSize
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiMenuSize
import gui.framework.generated.internal.GuiNavigationSize
import gui.framework.generated.internal.GuiNavigationVariant
import gui.framework.generated.internal.GuiDataGridSize
import gui.framework.generated.internal.GuiTableSize
import gui.framework.generated.internal.GuiTableVariant
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiProgressSize
import gui.framework.generated.internal.GuiProgressVariant
import gui.framework.generated.internal.GuiRadioSize
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSliderSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiThemeId
import gui.framework.generated.internal.GuiToastSize
import gui.framework.generated.internal.GuiTooltipSize

class MainActivity : ComponentActivity() {
    private var referenceDensity by mutableStateOf(ReferenceDensity.Standard)
    private var referenceTheme by mutableStateOf(GuiThemeId.BASIC)

    fun applyReferenceDensity(density: ReferenceDensity) {
        referenceDensity = density
    }

    fun applyReferenceTheme(theme: GuiThemeId) {
        referenceTheme = theme
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuiTheme(
                theme = referenceTheme,
                paletteId = "reference-dark",
            ) {
                AndroidReferenceApp(
                    density = referenceDensity,
                    includeExtendedComponents = referenceTheme == GuiThemeId.BASIC,
                )
            }
        }
    }
}

enum class ReferenceDensity {
    Standard,
    Compact,
}

@Composable
fun AndroidReferenceApp(
    density: ReferenceDensity = ReferenceDensity.Standard,
    includeExtendedComponents: Boolean = true,
) {
    var value by remember { mutableStateOf("Android") }
    var enabled by remember { mutableStateOf(true) }
    var diagnosticsEnabled by remember { mutableStateOf(false) }
    var reviewMode by remember { mutableStateOf("summary") }
    var deliveryChannel by remember { mutableStateOf("email") }
    var selectExpanded by remember { mutableStateOf(false) }
    var activeSection by remember { mutableStateOf("overview") }
    var tooltipOpen by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    var lastMenuAction by remember { mutableStateOf("none") }
    var toastOpen by remember { mutableStateOf(false) }
    var lastToastAction by remember { mutableStateOf("none") }
    var sliderValue by remember { mutableStateOf(40.0) }
    var navigationValue by remember { mutableStateOf("home") }
    var tableGridValue by remember { mutableStateOf("atlas") }
    var lastGridActivation by remember { mutableStateOf("none") }
    var dialogOpen by remember { mutableStateOf(false) }

    val buttonSize = if (density == ReferenceDensity.Compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM
    val checkboxSize = if (density == ReferenceDensity.Compact) GuiCheckboxSize.SMALL else GuiCheckboxSize.MEDIUM
    val dialogSize = if (density == ReferenceDensity.Compact) GuiDialogSize.SMALL else GuiDialogSize.MEDIUM
    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM
    val menuSize = if (density == ReferenceDensity.Compact) GuiMenuSize.SMALL else GuiMenuSize.MEDIUM
    val navigationSize = if (density == ReferenceDensity.Compact) GuiNavigationSize.SMALL else GuiNavigationSize.MEDIUM
    val tableSize = if (density == ReferenceDensity.Compact) GuiTableSize.SMALL else GuiTableSize.MEDIUM
    val dataGridSize = if (density == ReferenceDensity.Compact) GuiDataGridSize.SMALL else GuiDataGridSize.MEDIUM
    val panelSize = if (density == ReferenceDensity.Compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM
    val progressSize = if (density == ReferenceDensity.Compact) GuiProgressSize.SMALL else GuiProgressSize.MEDIUM
    val radioSize = if (density == ReferenceDensity.Compact) GuiRadioSize.SMALL else GuiRadioSize.MEDIUM
    val selectSize = if (density == ReferenceDensity.Compact) GuiSelectSize.SMALL else GuiSelectSize.MEDIUM
    val sliderSize = if (density == ReferenceDensity.Compact) GuiSliderSize.SMALL else GuiSliderSize.MEDIUM
    val switchSize = if (density == ReferenceDensity.Compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM
    val tabsSize = if (density == ReferenceDensity.Compact) GuiTabsSize.SMALL else GuiTabsSize.MEDIUM
    val toastSize = if (density == ReferenceDensity.Compact) GuiToastSize.SMALL else GuiToastSize.MEDIUM
    val tooltipSize = if (density == ReferenceDensity.Compact) GuiTooltipSize.SMALL else GuiTooltipSize.MEDIUM

    GuiPanel(
        modifier = Modifier.fillMaxSize(),
        accessibilityLabel = "Android reference controls",
        size = panelSize,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GuiInput(
                value = value,
                onValueChange = { value = it },
                placeholder = "Name",
                accessibilityLabel = "Reference name",
                size = inputSize,
            )
            GuiSwitch(
                checked = enabled,
                onCheckedChange = { enabled = it },
                accessibilityLabel = "Reference switch",
                size = switchSize,
            )
            if (includeExtendedComponents) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    GuiCheckbox(
                        checked = diagnosticsEnabled,
                        onCheckedChange = { diagnosticsEnabled = it },
                        accessibilityLabel = "Reference checkbox",
                        size = checkboxSize,
                    )
                    BasicText("Enable diagnostics")
                }
                GuiRadioGroup(groupName = "reference-review-mode") {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            GuiRadio(
                                selected = reviewMode == "summary",
                                onSelectedChange = { if (it) reviewMode = "summary" },
                                accessibilityLabel = "Summary review",
                                groupName = "reference-review-mode",
                                size = radioSize,
                            )
                            BasicText("Summary review")
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            GuiRadio(
                                selected = reviewMode == "detailed",
                                onSelectedChange = { if (it) reviewMode = "detailed" },
                                accessibilityLabel = "Detailed review",
                                groupName = "reference-review-mode",
                                size = radioSize,
                            )
                            BasicText("Detailed review")
                        }
                    }
                }
                GuiSelect(
                    value = deliveryChannel,
                    options = listOf(
                        GuiSelectOption(value = "email", label = "Email"),
                        GuiSelectOption(value = "push", label = "Push"),
                        GuiSelectOption(value = "digest", label = "Daily digest"),
                        GuiSelectOption(value = "legacy", label = "Legacy channel", disabled = true),
                    ),
                    onValueChange = { deliveryChannel = it },
                    expanded = selectExpanded,
                    onExpandedChange = { selectExpanded = it },
                    accessibilityLabel = "Delivery channel",
                    size = selectSize,
                )
                GuiTabs(
                    value = activeSection,
                    tabs = listOf(
                        GuiTabItem(value = "overview", label = "Overview"),
                        GuiTabItem(value = "metrics", label = "Metrics", disabled = true),
                        GuiTabItem(value = "logs", label = "Logs"),
                    ),
                    onValueChange = { activeSection = it },
                    accessibilityLabel = "Reference tabs",
                    size = tabsSize,
                ) { selectedTab ->
                    BasicText("Active section: ${selectedTab.label}")
                }
                GuiTooltip(
                    open = tooltipOpen,
                    content = "Reload the current workspace data.",
                    onOpenChange = { tooltipOpen = it },
                    size = tooltipSize,
                ) { interactionSource ->
                    GuiButton(
                        label = "Reload workspace",
                        onActivate = {},
                        size = buttonSize,
                        interactionSource = interactionSource,
                    )
                }
                GuiMenu(
                    open = menuOpen,
                    items = listOf(
                        GuiMenuItem(value = "refresh", label = "Refresh workspace", shortcut = "Ctrl+R"),
                        GuiMenuItem(value = "locked", label = "Locked action", disabled = true),
                        GuiMenuItem(value = "settings", label = "Workspace settings"),
                    ),
                    onOpenChange = { menuOpen = it },
                    onActivate = { lastMenuAction = it },
                    accessibilityLabel = "Workspace actions",
                    size = menuSize,
                ) { interactionSource ->
                    GuiButton(
                        label = "Open workspace menu",
                        onActivate = { menuOpen = true },
                        size = buttonSize,
                        interactionSource = interactionSource,
                    )
                }
                BasicText("Last menu action: $lastMenuAction")
                GuiButton(
                    label = "Show notification",
                    onActivate = { toastOpen = true },
                    size = buttonSize,
                )
                BasicText("Last notification action: $lastToastAction")
                GuiToast(
                    open = toastOpen,
                    title = "Workspace updated",
                    message = "Your changes were saved.",
                    onOpenChange = { toastOpen = it },
                    actionLabel = "Undo",
                    actionValue = "undo",
                    durationMs = 0L,
                    accessibilityLabel = "Workspace notification",
                    onActivate = { lastToastAction = it },
                    size = toastSize,
                )
                GuiProgress(
                    value = 68.0,
                    accessibilityLabel = "Workspace sync progress",
                    label = "Sync progress: 68%",
                    size = progressSize,
                )
                GuiProgress(
                    indeterminate = true,
                    accessibilityLabel = "Workspace sync activity",
                    label = "Syncing workspace",
                    variant = GuiProgressVariant.CIRCULAR,
                    size = progressSize,
                )
                GuiSlider(
                    value = sliderValue,
                    onValueChange = { sliderValue = it },
                    accessibilityLabel = "Workspace zoom",
                    accessibilityValueText = "${sliderValue.toInt()} percent",
                    size = sliderSize,
                )
                BasicText("Workspace zoom: ${sliderValue.toInt()}%")
                val navigationItems = listOf(
                    GuiNavigationItem(value = "home", label = "Home", icon = "⌂", accessibilityLabel = "Home destination"),
                    GuiNavigationItem(value = "search", label = "Search", icon = "⌕", accessibilityLabel = "Search destination"),
                    GuiNavigationItem(value = "archive", label = "Archive", icon = "□", accessibilityLabel = "Archive destination", disabled = true),
                    GuiNavigationItem(value = "settings", label = "Settings", icon = "⚙", accessibilityLabel = "Settings destination"),
                )
                GuiNavigation(
                    value = navigationValue,
                    items = navigationItems,
                    onValueChange = { navigationValue = it },
                    accessibilityLabel = "Workspace navigation",
                    size = navigationSize,
                )
                GuiNavigation(
                    value = navigationValue,
                    items = navigationItems,
                    onValueChange = { navigationValue = it },
                    accessibilityLabel = "Workspace navigation rail",
                    variant = GuiNavigationVariant.VERTICAL,
                    size = navigationSize,
                )
                BasicText("Active destination: $navigationValue")
                val tableColumns = listOf(
                    GuiTableColumn("Project"),
                    GuiTableColumn("Owner"),
                    GuiTableColumn("Status"),
                )
                val tableRows = listOf(
                    GuiTableRow(listOf("Atlas", "Mira", "Ready")),
                    GuiTableRow(listOf("Nova", "Kai", "Review")),
                    GuiTableRow(listOf("Archive", "System", "Locked")),
                )
                GuiTable(
                    columns = tableColumns,
                    rows = tableRows,
                    caption = "Project inventory",
                    accessibilityLabel = "Project inventory table",
                    variant = GuiTableVariant.GRIDLINED,
                    size = tableSize,
                )
                val gridColumns = listOf(
                    GuiDataGridColumn("Project"),
                    GuiDataGridColumn("Owner"),
                    GuiDataGridColumn("Status"),
                )
                val gridRows = listOf(
                    GuiDataGridRow("atlas", listOf("Atlas", "Mira", "Ready"), accessibilityLabel = "Atlas project row"),
                    GuiDataGridRow("nova", listOf("Nova", "Kai", "Review"), accessibilityLabel = "Nova project row"),
                    GuiDataGridRow("archive", listOf("Archive", "System", "Locked"), accessibilityLabel = "Archive project row", disabled = true),
                )
                GuiDataGrid(
                    columns = gridColumns,
                    rows = gridRows,
                    value = tableGridValue,
                    onValueChange = { tableGridValue = it },
                    onRowActivate = { lastGridActivation = it },
                    accessibilityLabel = "Project selection grid",
                    size = dataGridSize,
                )
                BasicText("Selected project row: $tableGridValue")
                BasicText("Activated project row: $lastGridActivation")
            }
            GuiButton(
                label = "Open dialog",
                onActivate = { dialogOpen = true },
                disabled = !enabled,
                size = buttonSize,
            )
        }
    }

    GuiDialog(
        open = dialogOpen,
        accessibilityLabel = "Android reference dialog",
        onDismissRequest = { dialogOpen = false },
        size = dialogSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            GuiInput(
                value = value,
                onValueChange = { value = it },
                accessibilityLabel = "Dialog name",
                size = inputSize,
            )
            GuiButton(
                label = "Close",
                onActivate = { dialogOpen = false },
                size = buttonSize,
            )
        }
    }
}
