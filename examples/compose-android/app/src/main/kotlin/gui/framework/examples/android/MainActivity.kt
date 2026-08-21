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
import gui.framework.generated.internal.GuiThemeId

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuiTheme(
                theme = GuiThemeId.BASIC,
                paletteId = "reference-dark",
            ) {
                AndroidReferenceApp()
            }
        }
    }
}

@Composable
private fun AndroidReferenceApp() {
    var value by remember { mutableStateOf("Android") }
    var enabled by remember { mutableStateOf(true) }
    var dialogOpen by remember { mutableStateOf(false) }

    GuiPanel(
        modifier = Modifier.fillMaxSize(),
        accessibilityLabel = "Android reference controls",
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
            )
            GuiSwitch(
                checked = enabled,
                onCheckedChange = { enabled = it },
                accessibilityLabel = "Reference switch",
            )
            GuiButton(
                label = "Open dialog",
                onActivate = { dialogOpen = true },
                disabled = !enabled,
            )
        }
    }

    GuiDialog(
        open = dialogOpen,
        accessibilityLabel = "Android reference dialog",
        onDismissRequest = { dialogOpen = false },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            GuiInput(
                value = value,
                onValueChange = { value = it },
                accessibilityLabel = "Dialog name",
            )
            GuiButton(
                label = "Close",
                onActivate = { dialogOpen = false },
            )
        }
    }
}
