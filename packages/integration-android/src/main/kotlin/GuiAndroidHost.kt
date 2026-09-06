// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.integration.android

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import gui.framework.compose.GuiTheme
import gui.framework.generated.internal.GuiThemeId

enum class GuiAndroidSurface(val wireValue: String) {
    APPLICATION("application"),
    SETTINGS("settings"),
    DIALOG("dialog"),
    OVERLAY("overlay"),
}

data class GuiAndroidHostContext(
    val surface: GuiAndroidSurface,
    val theme: GuiThemeId,
    val paletteId: String,
    val availableCapabilities: Set<String>,
) {
    init {
        require(paletteId.isNotBlank()) { "Android GUI paletteId must not be blank" }
        require(availableCapabilities.none { it.isBlank() }) {
            "Android GUI capabilities must use non-blank identifiers"
        }
    }
}

val LocalGuiAndroidHostContext = staticCompositionLocalOf<GuiAndroidHostContext> {
    error("GuiAndroidHost must wrap Android GUI Framework content")
}

@Composable
fun GuiAndroidHost(
    theme: GuiThemeId,
    paletteId: String,
    surface: GuiAndroidSurface = GuiAndroidSurface.APPLICATION,
    availableCapabilities: Set<String> = emptySet(),
    content: @Composable () -> Unit,
) {
    val capabilities = availableCapabilities.toSet()
    val context = GuiAndroidHostContext(
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
            LocalGuiAndroidHostContext provides context,
            content = content,
        )
    }
}
