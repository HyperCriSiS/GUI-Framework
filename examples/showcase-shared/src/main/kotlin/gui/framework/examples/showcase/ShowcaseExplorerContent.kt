// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.showcase

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiSelect
import gui.framework.compose.GuiSelectOption
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTabItem
import gui.framework.compose.GuiTabs
import gui.framework.compose.GuiTheme
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeSp
import gui.framework.generated.internal.GuiButtonSize
import gui.framework.generated.internal.GuiColorValue
import gui.framework.generated.internal.GuiDimensionValue
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiNumberValue
import gui.framework.generated.internal.GuiPaletteTokens
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiPrimitiveTokens
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiThemeId
import kotlin.math.roundToInt

private enum class ShowcaseDensity {
    Standard,
    Compact,
}

private enum class ShowcaseTextRole {
    Title,
    Heading,
    Body,
    Muted,
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

private fun showcaseColor(paletteId: String, tokenPath: String): Color {
    val token = GuiPaletteTokens.semantic(paletteId)[tokenPath] as? GuiColorValue
        ?: error("Showcase palette $paletteId is missing color token $tokenPath")
    return token.toComposeColor()
}

private fun showcaseDimension(tokenPath: String): GuiDimensionValue =
    GuiPrimitiveTokens.all[tokenPath] as? GuiDimensionValue
        ?: error("Showcase is missing dimension token $tokenPath")

private fun showcaseNumber(tokenPath: String): GuiNumberValue =
    GuiPrimitiveTokens.all[tokenPath] as? GuiNumberValue
        ?: error("Showcase is missing number token $tokenPath")

@Composable
private fun ShowcaseText(
    text: String,
    paletteId: String,
    role: ShowcaseTextRole = ShowcaseTextRole.Body,
) {
    val sizeTokenPath = when (role) {
        ShowcaseTextRole.Title,
        ShowcaseTextRole.Heading,
        -> "typography.size.large"
        ShowcaseTextRole.Body -> "typography.size.medium"
        ShowcaseTextRole.Muted -> "typography.size.small"
    }
    val sizeToken = showcaseDimension(sizeTokenPath)
    val lineHeightMultiplier = showcaseNumber("typography.lineHeight.control").value
    val fontWeight = if (role == ShowcaseTextRole.Title || role == ShowcaseTextRole.Heading) {
        FontWeight(showcaseNumber("typography.weight.medium").value.roundToInt())
    } else {
        null
    }
    val colorPath = if (role == ShowcaseTextRole.Muted) {
        "semantic.color.textSecondary"
    } else {
        "semantic.color.textPrimary"
    }

    BasicText(
        text = text,
        style = TextStyle(
            color = showcaseColor(paletteId, colorPath),
            fontSize = sizeToken.toComposeSp(),
            fontWeight = fontWeight,
            lineHeight = (sizeToken.value * lineHeightMultiplier).toFloat().sp,
        ),
    )
}

@Composable
fun ShowcaseExplorer(
    platformLabel: String,
    stressControlCount: Int = 40,
) {
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
                .background(showcaseColor(paletteId, "semantic.color.background"))
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            ShowcaseText(
                text = "GUI Framework — Showcase Explorer",
                paletteId = paletteId,
                role = ShowcaseTextRole.Title,
            )
            ShowcaseText(
                text = platformLabel,
                paletteId = paletteId,
                role = ShowcaseTextRole.Muted,
            )

            GuiPanel(
                accessibilityLabel = "Showcase configuration",
                size = panelSize,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
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
                ShowcaseText(
                    text = "Section: ${selected.label}",
                    paletteId = paletteId,
                    role = ShowcaseTextRole.Muted,
                )
            }

            when (section) {
                "screens" -> RealWorldPreview(
                    paletteId = paletteId,
                    buttonSize = buttonSize,
                    inputSize = inputSize,
                    panelSize = panelSize,
                    switchSize = switchSize,
                )
                "stress" -> StressPreview(
                    paletteId = paletteId,
                    buttonSize = buttonSize,
                    panelSize = panelSize,
                    controlCount = stressControlCount,
                )
                else -> ComponentPreview(
                    paletteId = paletteId,
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
    paletteId: String,
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
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ShowcaseText(
                text = "Component Gallery",
                paletteId = paletteId,
                role = ShowcaseTextRole.Heading,
            )
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
                ShowcaseText(
                    text = if (enabled) "Enabled" else "Disabled",
                    paletteId = paletteId,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GuiButton(label = "Primary action", onActivate = {}, size = buttonSize)
                GuiButton(label = "Disabled", onActivate = {}, disabled = true, size = buttonSize)
            }
        }
    }
}

@Composable
private fun RealWorldPreview(
    paletteId: String,
    buttonSize: GuiButtonSize,
    inputSize: GuiInputSize,
    panelSize: GuiPanelSize,
    switchSize: GuiSwitchSize,
) {
    var endpoint by remember { mutableStateOf("https://example.invalid") }
    var telemetry by remember { mutableStateOf(false) }

    GuiPanel(
        modifier = Modifier.fillMaxWidth(),
        accessibilityLabel = "Settings screen preview",
        size = panelSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ShowcaseText(
                text = "Real-world Screen — Settings",
                paletteId = paletteId,
                role = ShowcaseTextRole.Heading,
            )
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
                    checked = telemetry,
                    onCheckedChange = { telemetry = it },
                    accessibilityLabel = "Diagnostics",
                    size = switchSize,
                )
                ShowcaseText(text = "Diagnostics", paletteId = paletteId)
            }
            GuiButton(label = "Save settings", onActivate = {}, size = buttonSize)
        }
    }
}

@Composable
private fun StressPreview(
    paletteId: String,
    buttonSize: GuiButtonSize,
    panelSize: GuiPanelSize,
    controlCount: Int,
) {
    GuiPanel(
        modifier = Modifier.fillMaxWidth(),
        accessibilityLabel = "Stress lab preview",
        size = panelSize,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ShowcaseText(
                text = "Stress Lab — repeated interactive controls",
                paletteId = paletteId,
                role = ShowcaseTextRole.Heading,
            )
            repeat(controlCount) { index ->
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
