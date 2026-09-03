// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.desktop

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiCheckbox
import gui.framework.compose.GuiDialog
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiMenu
import gui.framework.compose.GuiMenuContextOffset
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
import gui.framework.compose.GuiToast
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
import gui.framework.generated.internal.GuiToastSize
import gui.framework.generated.internal.GuiTooltipSize

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
    var activeSection by remember { mutableStateOf("overview") }
    var tooltipOpen by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    var menuContextMode by remember { mutableStateOf(false) }
    var lastMenuAction by remember { mutableStateOf("none") }
    var toastOpen by remember { mutableStateOf(false) }
    var lastToastAction by remember { mutableStateOf("none") }
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
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    GuiSwitch(
                        checked = enabled,
                        onCheckedChange = { enabled = it },
                        accessibilityLabel = "Reference enabled",
                        size = switchSize,
                    )
                    BasicText(if (enabled) "Enabled" else "Disabled")
                }
                if (includeExtendedComponents) {
                    GuiCheckbox(
                        checked = diagnosticsEnabled,
                        onCheckedChange = { diagnosticsEnabled = it },
                        label = "Diagnostics",
                        accessibilityLabel = "Reference checkbox",
                        size = checkboxSize,
                    )
                    GuiRadioGroup(groupName = "reference-review-mode") {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            GuiRadio(
                                selected = reviewMode == "summary",
                                onSelectedChange = {
                                    if (it) reviewMode = "summary"
                                },
                                label = "Summary",
                                accessibilityLabel = "Summary review",
                                size = radioSize,
                            )
                            GuiRadio(
                                selected = reviewMode == "detailed",
                                onSelectedChange = {
                                    if (it) reviewMode = "detailed"
                                },
                                label = "Detailed",
                                accessibilityLabel = "Detailed review",
                                size = radioSize,
                            )
                        }
                    }
                    GuiSelect(
                        value = deliveryChannel,
                        options = listOf(
                            GuiSelectOption(value = "email", label = "Email"),
                            GuiSelectOption(value = "push", label = "Push"),
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
            BasicText("The neutral component contracts are driving this Foundation-only reference path.")
            GuiButton(
                label = "Close",
                onActivate = { dialogOpen = false },
                size = buttonSize,
            )
        }
    }
}
