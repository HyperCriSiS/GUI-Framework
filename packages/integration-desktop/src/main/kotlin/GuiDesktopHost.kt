// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.integration.desktop

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import gui.framework.compose.GuiTheme
import gui.framework.generated.internal.GuiThemeId

enum class GuiDesktopSurface(val wireValue: String) {
    APPLICATION("application"),
    SETTINGS("settings"),
    UTILITY("utility"),
    DIALOG("dialog"),
}

data class GuiDesktopHostContext(
    val surface: GuiDesktopSurface,
    val theme: GuiThemeId,
    val paletteId: String,
    val availableCapabilities: Set<String>,
) {
    init {
        require(paletteId.isNotBlank()) { "Desktop GUI paletteId must not be blank" }
        require(availableCapabilities.none { it.isBlank() }) {
            "Desktop GUI capabilities must use non-blank identifiers"
        }
    }
}

val LocalGuiDesktopHostContext = staticCompositionLocalOf<GuiDesktopHostContext> {
    error("GuiDesktopHost must wrap desktop GUI Framework content")
}

@Composable
fun GuiDesktopHost(
    theme: GuiThemeId,
    paletteId: String,
    surface: GuiDesktopSurface = GuiDesktopSurface.APPLICATION,
    availableCapabilities: Set<String> = emptySet(),
    content: @Composable () -> Unit,
) {
    val capabilities = availableCapabilities.toSet()
    val context = GuiDesktopHostContext(
        surface = surface,
        theme = theme,
        paletteId = paletteId,
        availableCapabilities = capabilities,
    )

    GuiTheme(
        theme = theme,
        paletteId = paletteId,
        availableCapabilities = capabilities,
    ) {
        CompositionLocalProvider(
            LocalGuiDesktopHostContext provides context,
            content = content,
        )
    }
}
