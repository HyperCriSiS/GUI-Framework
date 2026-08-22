// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.desktop

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiDialog
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTheme
import gui.framework.generated.internal.GuiButtonSize
import gui.framework.generated.internal.GuiDialogSize
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiThemeId

enum class ReferenceDensity {
    Standard,
    Compact,
}

private fun referenceThemeFromSystemProperty(): GuiThemeId =
    when (System.getProperty("gui.reference.theme")?.lowercase()) {
        null, "", "basic" -> GuiThemeId.BASIC
        "modern" -> GuiThemeId.MODERN
        "glass" -> GuiThemeId.GLASS
        else -> error("Unsupported GUI reference theme; expected basic, modern or glass")
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
        DesktopReferenceContent(density = density)
    }
}

@Composable
private fun DesktopReferenceContent(density: ReferenceDensity) {
    var name by remember { mutableStateOf("Compose") }
    var enabled by remember { mutableStateOf(true) }
    var dialogOpen by remember { mutableStateOf(false) }

    val buttonSize = if (density == ReferenceDensity.Compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM
    val dialogSize = if (density == ReferenceDensity.Compact) GuiDialogSize.SMALL else GuiDialogSize.MEDIUM
    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM
    val panelSize = if (density == ReferenceDensity.Compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM
    val switchSize = if (density == ReferenceDensity.Compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM

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
