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
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiRadio
import gui.framework.compose.GuiRadioGroup
import gui.framework.compose.GuiSelect
import gui.framework.compose.GuiSelectOption
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTabItem
import gui.framework.compose.GuiTabs
import gui.framework.compose.GuiTheme
import gui.framework.compose.GuiTooltip
import gui.framework.generated.internal.GuiButtonSize
import gui.framework.generated.internal.GuiCheckboxSize
import gui.framework.generated.internal.GuiDialogSize
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiMenuSize
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiRadioSize
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiThemeId
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
    var dialogOpen by remember { mutableStateOf(false) }

    val buttonSize = if (density == ReferenceDensity.Compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM
    val checkboxSize = if (density == ReferenceDensity.Compact) GuiCheckboxSize.SMALL else GuiCheckboxSize.MEDIUM
    val dialogSize = if (density == ReferenceDensity.Compact) GuiDialogSize.SMALL else GuiDialogSize.MEDIUM
    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM
    val menuSize = if (density == ReferenceDensity.Compact) GuiMenuSize.SMALL else GuiMenuSize.MEDIUM
    val panelSize = if (density == ReferenceDensity.Compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM
    val radioSize = if (density == ReferenceDensity.Compact) GuiRadioSize.SMALL else GuiRadioSize.MEDIUM
    val selectSize = if (density == ReferenceDensity.Compact) GuiSelectSize.SMALL else GuiSelectSize.MEDIUM
    val switchSize = if (density == ReferenceDensity.Compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM
    val tabsSize = if (density == ReferenceDensity.Compact) GuiTabsSize.SMALL else GuiTabsSize.MEDIUM
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
