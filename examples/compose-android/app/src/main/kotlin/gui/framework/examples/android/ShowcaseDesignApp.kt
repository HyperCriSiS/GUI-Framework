// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiNavigation
import gui.framework.compose.GuiNavigationItem
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiProgress
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTabItem
import gui.framework.compose.GuiTabs
import gui.framework.compose.GuiTheme
import gui.framework.examples.showcase.ShowcaseExplorer
import gui.framework.generated.internal.GuiThemeId

private data class ThemeChoice(val id: GuiThemeId, val label: String, val description: String)

private val showcaseThemes = listOf(
    ThemeChoice(GuiThemeId.BASIC, "Basic", "Neutral, restrained and utility-first."),
    ThemeChoice(GuiThemeId.MODERN, "Modern", "Clean contemporary application styling."),
    ThemeChoice(GuiThemeId.GLASS, "Glass", "Transparent layered surfaces and depth."),
    ThemeChoice(GuiThemeId.FROSTED_GLASS, "Frosted Glass", "Soft translucent surfaces with stronger separation."),
    ThemeChoice(GuiThemeId.SPACEY, "Spacey", "Dark spatial presentation with futuristic character."),
    ThemeChoice(GuiThemeId.CYBERPUNK, "Cyberpunk", "High-energy futuristic interface direction."),
)

@Composable
fun ShowcaseDesignApp() {
    var section by remember { mutableStateOf("designs") }
    var selectedTheme by remember { mutableStateOf<ThemeChoice?>(null) }

    if (section == "qa") {
        ShowcaseExplorer(platformLabel = "Android target · QA Lab", stressControlCount = 30)
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF101114))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        GuiTheme(theme = GuiThemeId.MODERN, paletteId = "reference-dark") {
            GuiTabs(
                value = section,
                tabs = listOf(
                    GuiTabItem("designs", "Designs"),
                    GuiTabItem("qa", "QA Lab"),
                ),
                onValueChange = { section = it },
                accessibilityLabel = "Showcase mode",
            ) { }
        }

        selectedTheme?.let { theme ->
            ThemeDetail(theme = theme, onBack = { selectedTheme = null })
        } ?: ThemeGallery(onOpen = { selectedTheme = it })
    }
}

@Composable
private fun ThemeGallery(onOpen: (ThemeChoice) -> Unit) {
    showcaseThemes.forEach { theme ->
        GuiTheme(theme = theme.id, paletteId = "reference-dark") {
            var automationEnabled by remember(theme.id) { mutableStateOf(true) }
            var nav by remember(theme.id) { mutableStateOf("overview") }

            GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "${theme.label} design preview") {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            androidx.compose.foundation.text.BasicText(theme.label)
                            androidx.compose.foundation.text.BasicText(theme.description)
                        }
                        GuiButton("Open", onActivate = { onOpen(theme) })
                    }

                    GuiNavigation(
                        value = nav,
                        items = listOf(
                            GuiNavigationItem("overview", "Overview"),
                            GuiNavigationItem("activity", "Activity"),
                            GuiNavigationItem("settings", "Settings"),
                        ),
                        onValueChange = { nav = it },
                        accessibilityLabel = "${theme.label} preview navigation",
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PreviewMetric("Devices", "12", Modifier.weight(1f))
                        PreviewMetric("Health", "98%", Modifier.weight(1f))
                        PreviewMetric("Tasks", "7", Modifier.weight(1f))
                    }

                    GuiProgress(72.0, label = "Sync", accessibilityLabel = "${theme.label} sync progress")
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GuiSwitch(automationEnabled, { automationEnabled = it }, "Automation")
                        androidx.compose.foundation.text.BasicText(if (automationEnabled) "Automation enabled" else "Automation disabled")
                    }
                }
            }
        }
    }
}

@Composable
private fun PreviewMetric(label: String, value: String, modifier: Modifier = Modifier) {
    GuiPanel(modifier = modifier, accessibilityLabel = label) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            androidx.compose.foundation.text.BasicText(value)
            androidx.compose.foundation.text.BasicText(label)
        }
    }
}

@Composable
private fun ThemeDetail(theme: ThemeChoice, onBack: () -> Unit) {
    GuiTheme(theme = theme.id, paletteId = "reference-dark") {
        var nav by remember(theme.id) { mutableStateOf("overview") }
        var enabled by remember(theme.id) { mutableStateOf(true) }
        var actionCount by remember(theme.id) { mutableStateOf(0) }

        GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "${theme.label} full preview") {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        androidx.compose.foundation.text.BasicText(theme.label)
                        androidx.compose.foundation.text.BasicText("Interactive application preview")
                    }
                    GuiButton("Back", onActivate = onBack)
                }

                GuiNavigation(
                    value = nav,
                    items = listOf(
                        GuiNavigationItem("overview", "Overview"),
                        GuiNavigationItem("devices", "Devices"),
                        GuiNavigationItem("events", "Events"),
                        GuiNavigationItem("settings", "Settings"),
                    ),
                    onValueChange = { nav = it },
                    accessibilityLabel = "Theme detail navigation",
                )

                PreviewMetric("Connected devices", "12")
                PreviewMetric("System health", "98%")
                GuiProgress(84.0, label = "Pipeline", accessibilityLabel = "Pipeline status")

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GuiSwitch(enabled, { enabled = it }, "Background automation")
                    androidx.compose.foundation.text.BasicText(if (enabled) "Background automation enabled" else "Background automation disabled")
                }

                GuiButton("Run action", onActivate = { actionCount += 1 })
                androidx.compose.foundation.text.BasicText("Actions: $actionCount")
            }
        }
    }
}
