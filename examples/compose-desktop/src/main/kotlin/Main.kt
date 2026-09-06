// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.desktop

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiCheckbox
import gui.framework.compose.GuiDialog
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiFormActions
import gui.framework.compose.GuiFormField
import gui.framework.compose.GuiFormLayout
import gui.framework.compose.GuiFormLayoutSection
import gui.framework.compose.GuiScrollContainer
import gui.framework.compose.GuiMenu
import gui.framework.compose.GuiMenuContextOffset
import gui.framework.compose.GuiMenuItem
import gui.framework.compose.GuiNavigation
import gui.framework.compose.GuiNavigationItem
import gui.framework.compose.GuiTree
import gui.framework.compose.GuiTreeItem
import gui.framework.compose.GuiDataGrid
import gui.framework.compose.GuiDataGridColumn
import gui.framework.compose.GuiDataGridRow
import gui.framework.compose.GuiTable
import gui.framework.compose.GuiTableColumn
import gui.framework.compose.GuiTableRow
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiProgress
import gui.framework.compose.GuiSlider
import gui.framework.compose.GuiRadio
import gui.framework.compose.GuiRadioGroup
import gui.framework.compose.GuiSelect
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
import gui.framework.generated.internal.GuiFormLayoutSize
import gui.framework.generated.internal.GuiFormLayoutVariant
import gui.framework.generated.internal.GuiScrollContainerSize
import gui.framework.generated.internal.GuiScrollContainerVariant
import gui.framework.generated.internal.GuiMenuSize
import gui.framework.generated.internal.GuiNavigationSize
import gui.framework.generated.internal.GuiNavigationVariant
import gui.framework.generated.internal.GuiTreeSize
import gui.framework.generated.internal.GuiDataGridSize
import gui.framework.generated.internal.GuiTableSize
import gui.framework.generated.internal.GuiTableVariant
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiProgressSize
import gui.framework.generated.internal.GuiProgressVariant
import gui.framework.generated.internal.GuiSliderSize
import gui.framework.generated.internal.GuiRadioSize
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiThemeId
import gui.framework.generated.internal.GuiToastSize
import gui.framework.generated.internal.GuiTooltipSize

private const val localeLongText = "إعدادات مساحة العمل المشتركة المتقدمة مع صلاحيات متعددة وسياق طويل لاختبار الالتفاف دون فقدان الوضوح"
private const val localeUnbrokenText = "https://example.invalid/workspaces/atlas/permissions/this-is-a-deliberately-unbroken-locale-robustness-token-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
private const val localeUnicodeText = "Café é · 東京 · 🧑🏽‍💻 · 👨‍👩‍👧‍👦 · مرحبًا · שלום"
private const val localeMixedBidiText = "Project Atlas 42 — مشروع أطلس — פרויקט אטלס — ID-ABC-12345"

enum class ReferenceDensity {
    Standard,
    Compact,
}

private fun referenceThemeFromSystemProperty(): GuiThemeId =
    when (System.getProperty("gui.reference.theme")?.lowercase()) {
        null, "", "basic" -> GuiThemeId.BASIC
        "modern" -> GuiThemeId.MODERN
        "glass" -> GuiThemeId.GLASS
        "frosted-glass" -> GuiThemeId.FROSTED_GLASS
        "spacey" -> GuiThemeId.SPACEY
        "cyberpunk" -> GuiThemeId.CYBERPUNK
        else -> error("Unsupported GUI reference theme; expected basic, modern, glass, frosted-glass, spacey or cyberpunk")
    }

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "GUI Framework — Compose Desktop Reference",
    ) {
        DesktopReferenceApp(theme = referenceThemeFromSystemProperty())
    }
}

@Composable
private fun DesktopReferenceApp(
    theme: GuiThemeId = GuiThemeId.BASIC,
    paletteId: String = "reference-dark",
    density: ReferenceDensity = ReferenceDensity.Standard,
) {
    GuiTheme(
        theme = theme,
        paletteId = paletteId,
    ) {
        DesktopReferenceContent(
            density = density,
            includeExtendedComponents = theme == GuiThemeId.BASIC,
        )
    }
}

@Composable
private fun DesktopReferenceContent(
    density: ReferenceDensity,
    includeExtendedComponents: Boolean,
) {
    var name by remember { mutableStateOf("Compose") }
    var enabled by remember { mutableStateOf(true) }
    var diagnosticsEnabled by remember { mutableStateOf(false) }
    var reviewMode by remember { mutableStateOf("summary") }
    var deliveryChannel by remember { mutableStateOf("email") }
    var selectExpanded by remember { mutableStateOf(false) }
    var imeInputValue by remember { mutableStateOf("") }
    var imeQuery by remember { mutableStateOf("") }
    var imeValue by remember { mutableStateOf("") }
    var imeExpanded by remember { mutableStateOf(false) }
    var activeSection by remember { mutableStateOf("overview") }
    var tooltipOpen by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    var menuContextMode by remember { mutableStateOf(false) }
    var lastMenuAction by remember { mutableStateOf("none") }
    var toastOpen by remember { mutableStateOf(false) }
    var lastToastAction by remember { mutableStateOf("none") }
    var sliderValue by remember { mutableStateOf(40.0) }
    var navigationValue by remember { mutableStateOf("home") }
    var treeValue by remember { mutableStateOf("workspace") }
    var workspaceExpanded by remember { mutableStateOf(true) }
    var lastTreeActivation by remember { mutableStateOf("none") }
    var formEmail by remember { mutableStateOf("jan@example.com") }
    var formRecovery by remember { mutableStateOf("12") }
    var formVariant by remember { mutableStateOf(GuiFormLayoutVariant.INLINE) }
    var formSaveCount by remember { mutableStateOf(0) }
    val activityScrollState = rememberScrollState()
    var tableGridValue by remember { mutableStateOf("atlas") }
    var lastGridActivation by remember { mutableStateOf("none") }
    var dialogOpen by remember { mutableStateOf(false) }

    val buttonSize = if (density == ReferenceDensity.Compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM
    val checkboxSize = if (density == ReferenceDensity.Compact) GuiCheckboxSize.SMALL else GuiCheckboxSize.MEDIUM
    val dialogSize = if (density == ReferenceDensity.Compact) GuiDialogSize.SMALL else GuiDialogSize.MEDIUM
    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM
    val formLayoutSize = if (density == ReferenceDensity.Compact) GuiFormLayoutSize.SMALL else GuiFormLayoutSize.MEDIUM
    val scrollContainerSize = if (density == ReferenceDensity.Compact) GuiScrollContainerSize.SMALL else GuiScrollContainerSize.MEDIUM
    val menuSize = if (density == ReferenceDensity.Compact) GuiMenuSize.SMALL else GuiMenuSize.MEDIUM
    val navigationSize = if (density == ReferenceDensity.Compact) GuiNavigationSize.SMALL else GuiNavigationSize.MEDIUM
    val treeSize = if (density == ReferenceDensity.Compact) GuiTreeSize.SMALL else GuiTreeSize.MEDIUM
    val tableSize = if (density == ReferenceDensity.Compact) GuiTableSize.SMALL else GuiTableSize.MEDIUM
    val dataGridSize = if (density == ReferenceDensity.Compact) GuiDataGridSize.SMALL else GuiDataGridSize.MEDIUM
    val panelSize = if (density == ReferenceDensity.Compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM
    val progressSize = if (density == ReferenceDensity.Compact) GuiProgressSize.SMALL else GuiProgressSize.MEDIUM
    val sliderSize = if (density == ReferenceDensity.Compact) GuiSliderSize.SMALL else GuiSliderSize.MEDIUM
    val radioSize = if (density == ReferenceDensity.Compact) GuiRadioSize.SMALL else GuiRadioSize.MEDIUM
    val selectSize = if (density == ReferenceDensity.Compact) GuiSelectSize.SMALL else GuiSelectSize.MEDIUM
    val switchSize = if (density == ReferenceDensity.Compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM
    val tabsSize = if (density == ReferenceDensity.Compact) GuiTabsSize.SMALL else GuiTabsSize.MEDIUM
    val toastSize = if (density == ReferenceDensity.Compact) GuiToastSize.SMALL else GuiToastSize.MEDIUM
    val tooltipSize = if (density == ReferenceDensity.Compact) GuiTooltipSize.SMALL else GuiTooltipSize.MEDIUM

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        BasicText("GUI Framework — Compose Desktop Reference")

        GuiPanel(
            accessibilityLabel = "Reference controls",
            size = panelSize,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                GuiInput(
                    value = name,
                    onValueChange = { name = it },
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
                    GuiInput(
                        value = imeInputValue,
                        onValueChange = { imeInputValue = it },
                        placeholder = "日本語 or emoji",
                        accessibilityLabel = "IME composition input",
                        size = inputSize,
                    )
                    BasicText("IME input: $imeInputValue")
                    GuiSelect(
                        value = imeValue,
                        options = listOf(
                            GuiSelectOption(value = "jp", label = "日本語"),
                            GuiSelectOption(value = "zh", label = "北京"),
                            GuiSelectOption(value = "emoji", label = "🧑🏽‍💻"),
                        ),
                        onValueChange = { imeValue = it },
                        query = imeQuery,
                        onQueryChange = { imeQuery = it },
                        editable = true,
                        expanded = imeExpanded,
                        onExpandedChange = { imeExpanded = it },
                        placeholder = "かな / 北京 / 🧑🏽‍💻",
                        accessibilityLabel = "IME editable ComboBox",
                        size = selectSize,
                    )
                    BasicText("IME query: $imeQuery")
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
                        contextOffset = if (menuContextMode) GuiMenuContextOffset(x = 32, y = 32) else null,
                    ) { interactionSource ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            GuiButton(
                                label = "Open workspace menu",
                                onActivate = {
                                    menuContextMode = false
                                    menuOpen = true
                                },
                                size = buttonSize,
                                interactionSource = interactionSource,
                            )
                            GuiButton(
                                label = "Open context menu",
                                onActivate = {
                                    menuContextMode = true
                                    menuOpen = true
                                },
                                size = buttonSize,
                                interactionSource = interactionSource,
                            )
                        }
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
                    BasicText("Activated tree node: $lastTreeActivation")
                    val recoveryInvalid = formRecovery.length != 6
                    GuiFormLayout(
                        columns = 2,
                        accessibilityLabel = "Account settings form layout",
                        variant = formVariant,
                        size = formLayoutSize,
                    ) {
                        GuiFormLayoutSection {
                            GuiFormField(
                                label = "Email",
                                description = "Used for account notifications.",
                            ) {
                                GuiInput(
                                    value = formEmail,
                                    onValueChange = { formEmail = it },
                                    accessibilityLabel = "Form email",
                                    size = inputSize,
                                )
                            }
                            GuiFormField(
                                label = "Recovery code",
                                description = "Exactly 6 characters.",
                                errorMessage = if (recoveryInvalid) "Recovery code must contain 6 characters." else "",
                            ) {
                                GuiInput(
                                    value = formRecovery,
                                    onValueChange = { formRecovery = it },
                                    accessibilityLabel = "Form recovery code",
                                    error = recoveryInvalid,
                                    size = inputSize,
                                )
                            }
                            GuiFormField(
                                label = "API token",
                                description = "Managed externally by the host application.",
                                disabled = true,
                            ) {
                                GuiInput(
                                    value = "sk-local-reference",
                                    onValueChange = {},
                                    accessibilityLabel = "Form API token",
                                    disabled = true,
                                    size = inputSize,
                                )
                            }
                        }
                        GuiFormActions {
                            GuiButton(
                                label = "Save settings",
                                onActivate = { formSaveCount += 1 },
                                size = buttonSize,
                            )
                            GuiButton(
                                label = if (formVariant == GuiFormLayoutVariant.INLINE) "Use stacked layout" else "Use inline layout",
                                onActivate = {
                                    formVariant = if (formVariant == GuiFormLayoutVariant.INLINE) {
                                        GuiFormLayoutVariant.STACKED
                                    } else {
                                        GuiFormLayoutVariant.INLINE
                                    }
                                },
                                size = buttonSize,
                            )
                            GuiButton(
                                label = "Reset recovery code",
                                onActivate = { formRecovery = "12" },
                                size = buttonSize,
                            )
                        }
                        GuiFormLayoutSection {
                            BasicText("Saved: $formSaveCount · variant: ${formVariant.wireValue} · email: $formEmail")
                        }
                    }
                    val activityItems = listOf(
                    "Activity event 01",
                    "Activity event 02",
                    "Activity event 03",
                    "Activity event 04",
                    "Activity event 05",
                    "Activity event 06",
                    "Activity event 07",
                    "Activity event 08",
                    "Activity event 09",
                    "Activity event 10",
                    "Activity event 11",
                    "Activity event 12",
                )
                GuiScrollContainer(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(if (density == ReferenceDensity.Compact) 144.dp else 176.dp),
                    variant = GuiScrollContainerVariant.VERTICAL,
                    size = scrollContainerSize,
                    accessibilityLabel = "Activity log viewport",
                    keyboardFocusable = true,
                    verticalScrollState = activityScrollState,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        activityItems.forEach { BasicText(it) }
                    }
                }
                BasicText("Scroll offset: ${activityScrollState.value}")
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        BasicText(localeLongText)
                        BasicText(localeMixedBidiText)
                        BasicText(localeUnicodeText)
                        GuiButton(
                            label = localeUnbrokenText,
                            onActivate = {},
                            modifier = Modifier.fillMaxWidth(),
                            size = buttonSize,
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            GuiButton(
                                label = "RTL start marker",
                                onActivate = {},
                                size = buttonSize,
                            )
                            GuiButton(
                                label = "RTL end marker",
                                onActivate = {},
                                size = buttonSize,
                            )
                        }
                        GuiInput(
                            value = "$localeUnicodeText · $localeMixedBidiText",
                            onValueChange = {},
                            accessibilityLabel = "RTL Unicode mixed-direction input",
                            modifier = Modifier.fillMaxWidth(),
                            size = inputSize,
                        )
                    }
                }
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
    }

    GuiDialog(
        open = dialogOpen,
        accessibilityLabel = "Reference dialog",
        onDismissRequest = { dialogOpen = false },
        size = dialogSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            BasicText("Hello, $name")
            GuiButton(
                label = "Close",
                onActivate = { dialogOpen = false },
                size = buttonSize,
            )
        }
    }
}
