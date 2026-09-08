// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiSelect
import gui.framework.compose.GuiSelectOption
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTabItem
import gui.framework.compose.GuiTabs
import gui.framework.compose.GuiTheme
import gui.framework.generated.internal.GuiButtonSize
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiThemeId

private enum class ShowcaseDensity {
    Standard,
    Compact,
}

private fun GuiThemeId.showcaseValue(): String = when (this) {
    GuiThemeId.BASIC -> "basic"
    GuiThemeId.MODERN -> "modern"
    GuiThemeId.GLASS -> "glass"
    GuiThemeId.FROSTED_GLASS -> "frosted-glass"
    GuiThemeId.SPACEY -> "spacey"
    GuiThemeId.CYBERPUNK -> "cyberpunk"
}

private fun showcaseTheme(value: String): GuiThemeId = when (value) {
    "modern" -> GuiThemeId.MODERN
    "glass" -> GuiThemeId.GLASS
    "frosted-glass" -> GuiThemeId.FROSTED_GLASS
    "spacey" -> GuiThemeId.SPACEY
    "cyberpunk" -> GuiThemeId.CYBERPUNK
    else -> GuiThemeId.BASIC
}

class ShowcaseActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ShowcaseExplorer() }
    }
}

@Composable
private fun ShowcaseExplorer() {
    var theme by remember { mutableStateOf(GuiThemeId.BASIC) }
    var paletteId by remember { mutableStateOf("reference-dark") }
    var density by remember { mutableStateOf(ShowcaseDensity.Standard) }
    var section by remember { mutableStateOf("components") }
    var themeExpanded by remember { mutableStateOf(false) }
    var paletteExpanded by remember { mutableStateOf(false) }
    var densityExpanded by remember { mutableStateOf(false) }

    GuiTheme(theme = theme, paletteId = paletteId) {
        val compact = density == ShowcaseDensity.Compact
        val buttonSize = if (compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM
        val inputSize = if (compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM
        val panelSize = if (compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM
        val selectSize = if (compact) GuiSelectSize.SMALL else GuiSelectSize.MEDIUM
        val switchSize = if (compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM
        val tabsSize = if (compact) GuiTabsSize.SMALL else GuiTabsSize.MEDIUM

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            BasicText("GUI Framework — Showcase Explorer")
            BasicText("Android target")

            GuiPanel(
                modifier = Modifier.fillMaxWidth(),
                accessibilityLabel = "Showcase configuration",
                size = panelSize,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    GuiSelect(
                        value = theme.showcaseValue(),
                        options = listOf(
                            GuiSelectOption(value = "basic", label = "Basic"),
                            GuiSelectOption(value = "modern", label = "Modern"),
                            GuiSelectOption(value = "glass", label = "Glass"),
                            GuiSelectOption(value = "frosted-glass", label = "Frosted Glass"),
                            GuiSelectOption(value = "spacey", label = "Spacey"),
                            GuiSelectOption(value = "cyberpunk", label = "Cyberpunk"),
                        ),
                        onValueChange = { theme = showcaseTheme(it) },
                        expanded = themeExpanded,
                        onExpandedChange = { themeExpanded = it },
                        accessibilityLabel = "Theme",
                        size = selectSize,
                    )
                    GuiSelect(
                        value = paletteId,
                        options = listOf(
                            GuiSelectOption(value = "reference-dark", label = "Dark"),
                            GuiSelectOption(value = "reference-light", label = "Light"),
                        ),
                        onValueChange = { paletteId = it },
                        expanded = paletteExpanded,
                        onExpandedChange = { paletteExpanded = it },
                        accessibilityLabel = "Palette",
                        size = selectSize,
                    )
                    GuiSelect(
                        value = if (compact) "compact" else "standard",
                        options = listOf(
                            GuiSelectOption(value = "standard", label = "Standard"),
                            GuiSelectOption(value = "compact", label = "Compact"),
                        ),
                        onValueChange = {
                            density = if (it == "compact") ShowcaseDensity.Compact else ShowcaseDensity.Standard
                        },
                        expanded = densityExpanded,
                        onExpandedChange = { densityExpanded = it },
                        accessibilityLabel = "Density",
                        size = selectSize,
                    )
                }
            }

            GuiTabs(
                value = section,
                tabs = listOf(
                    GuiTabItem(value = "components", label = "Components"),
                    GuiTabItem(value = "screens", label = "Screens"),
                    GuiTabItem(value = "stress", label = "Stress Lab"),
                ),
                onValueChange = { section = it },
                accessibilityLabel = "Showcase section",
                size = tabsSize,
            ) { selected ->
                BasicText("Section: ${selected.label}")
            }

            when (section) {
                "screens" -> RealWorldPreview(
                    buttonSize = buttonSize,
                    inputSize = inputSize,
                    panelSize = panelSize,
                    switchSize = switchSize,
                )
                "stress" -> StressPreview(
                    buttonSize = buttonSize,
                    panelSize = panelSize,
                )
                else -> ComponentPreview(
                    buttonSize = buttonSize,
                    inputSize = inputSize,
                    panelSize = panelSize,
                    switchSize = switchSize,
                )
            }
        }
    }
}

@Composable
private fun ComponentPreview(
    buttonSize: GuiButtonSize,
    inputSize: GuiInputSize,
    panelSize: GuiPanelSize,
    switchSize: GuiSwitchSize,
) {
    var text by remember { mutableStateOf("Atlas") }
    var enabled by remember { mutableStateOf(true) }

    GuiPanel(
        modifier = Modifier.fillMaxWidth(),
        accessibilityLabel = "Component gallery preview",
        size = panelSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            BasicText("Component Gallery")
            GuiInput(
                value = text,
                onValueChange = { text = it },
                placeholder = "Workspace name",
                accessibilityLabel = "Workspace name",
                size = inputSize,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                GuiSwitch(
                    checked = enabled,
                    onCheckedChange = { enabled = it },
                    accessibilityLabel = "Enable workspace",
                    size = switchSize,
                )
                BasicText(if (enabled) "Enabled" else "Disabled")
            }
            GuiButton(label = "Primary action", onActivate = {}, size = buttonSize)
            GuiButton(label = "Disabled", onActivate = {}, disabled = true, size = buttonSize)
        }
    }
}

@Composable
private fun RealWorldPreview(
    buttonSize: GuiButtonSize,
    inputSize: GuiInputSize,
    panelSize: GuiPanelSize,
    switchSize: GuiSwitchSize,
) {
    var endpoint by remember { mutableStateOf("https://example.invalid") }
    var diagnostics by remember { mutableStateOf(false) }

    GuiPanel(
        modifier = Modifier.fillMaxWidth(),
        accessibilityLabel = "Settings screen preview",
        size = panelSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            BasicText("Real-world Screen — Settings")
            GuiInput(
                value = endpoint,
                onValueChange = { endpoint = it },
                placeholder = "Service endpoint",
                accessibilityLabel = "Service endpoint",
                size = inputSize,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                GuiSwitch(
                    checked = diagnostics,
                    onCheckedChange = { diagnostics = it },
                    accessibilityLabel = "Diagnostics",
                    size = switchSize,
                )
                BasicText("Diagnostics")
            }
            GuiButton(label = "Save settings", onActivate = {}, size = buttonSize)
        }
    }
}

@Composable
private fun StressPreview(
    buttonSize: GuiButtonSize,
    panelSize: GuiPanelSize,
) {
    GuiPanel(
        modifier = Modifier.fillMaxWidth(),
        accessibilityLabel = "Stress lab preview",
        size = panelSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            BasicText("Stress Lab — repeated interactive controls")
            repeat(30) { index ->
                GuiButton(
                    label = "Stress control ${index + 1}",
                    onActivate = {},
                    modifier = Modifier.fillMaxWidth(),
                    size = buttonSize,
                )
            }
        }
    }
}
