// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.showcase.desktop

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import gui.framework.examples.showcase.ShowcaseExplorer

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "GUI Framework Showcase Explorer",
    ) {
        ShowcaseExplorer(platformLabel = "Desktop / Windows target")
    }
}
