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
import gui.framework.generated.internal.GuiThemeId

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "GUI Framework — Compose Desktop Reference",
    ) {
        GuiTheme(
            theme = GuiThemeId.BASIC,
            paletteId = "reference-dark",
        ) {
            DesktopReferenceApp()
        }
    }
}

@Composable
private fun DesktopReferenceApp() {
    var name by remember { mutableStateOf("Compose") }
    var enabled by remember { mutableStateOf(true) }
    var dialogOpen by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        BasicText("GUI Framework — Compose Desktop Reference")

        GuiPanel(
            accessibilityLabel = "Reference controls",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                GuiInput(
                    value = name,
                    onValueChange = { name = it },
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
    }

    GuiDialog(
        open = dialogOpen,
        accessibilityLabel = "Reference dialog",
        onDismissRequest = { dialogOpen = false },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            BasicText("Hello, $name")
            GuiButton(
                label = "Close",
                onActivate = { dialogOpen = false },
            )
        }
    }
}
