// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
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

class MainActivity : ComponentActivity() {
    private var referenceDensity by mutableStateOf(ReferenceDensity.Standard)

    fun applyReferenceDensity(density: ReferenceDensity) {
        referenceDensity = density
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuiTheme(
                theme = GuiThemeId.BASIC,
                paletteId = "reference-dark",
            ) {
                AndroidReferenceApp(density = referenceDensity)
            }
        }
    }
}

@Composable
fun AndroidReferenceApp(density: ReferenceDensity = ReferenceDensity.Standard) {
    var value by remember { mutableStateOf("Android") }
    var enabled by remember { mutableStateOf(true) }
    var dialogOpen by remember { mutableStateOf(false) }

    val buttonSize = if (density == ReferenceDensity.Compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM
    val dialogSize = if (density == ReferenceDensity.Compact) GuiDialogSize.SMALL else GuiDialogSize.MEDIUM
    val inputSize = if (density == ReferenceDensity.Compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM
    val panelSize = if (density == ReferenceDensity.Compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM
    val switchSize = if (density == ReferenceDensity.Compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM

    GuiPanel(
        modifier = Modifier.fillMaxSize(),
        accessibilityLabel = "Android reference controls",
        size = panelSize,
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
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
