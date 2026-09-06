// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.desktop.integration

import androidx.compose.runtime.Composable
import gui.framework.compose.GuiButton
import gui.framework.generated.internal.GuiThemeId
import gui.framework.integration.desktop.GuiDesktopHost
import gui.framework.integration.desktop.GuiDesktopSurface
import gui.framework.integration.desktop.LocalGuiDesktopHostContext

@Composable
fun DesktopIntegrationReference(
    onAction: () -> Unit = {},
) {
    GuiDesktopHost(
        theme = GuiThemeId.BASIC,
        paletteId = "reference-dark",
        surface = GuiDesktopSurface.APPLICATION,
        availableCapabilities = emptySet(),
    ) {
        check(LocalGuiDesktopHostContext.current.surface == GuiDesktopSurface.APPLICATION)
        GuiButton(
            label = "Integration action",
            onClick = onAction,
            accessibilityLabel = "Desktop integration action",
        )
    }
}
