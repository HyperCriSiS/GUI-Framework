// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import gui.framework.generated.internal.GuiThemeId

/** Selects one neutral theme plus one independently compiled palette for a Compose subtree. */
data class GuiThemeSelection(
    val theme: GuiThemeId,
    val paletteId: String,
) {
    init {
        require(paletteId.isNotBlank()) { "GUI palette id must not be blank" }
    }
}

internal val LocalGuiThemeSelection = staticCompositionLocalOf<GuiThemeSelection> {
    error("GuiTheme must wrap GUI Framework Compose components")
}

internal val LocalGuiAvailableCapabilities = staticCompositionLocalOf<Set<String>> { emptySet() }

@Composable
fun GuiTheme(
    theme: GuiThemeId,
    paletteId: String,
    availableCapabilities: Set<String> = emptySet(),
    content: @Composable () -> Unit,
) {
    require(availableCapabilities.all(String::isNotBlank)) {
        "GUI capability ids must not be blank"
    }
    CompositionLocalProvider(
        LocalGuiThemeSelection provides GuiThemeSelection(theme = theme, paletteId = paletteId),
        LocalGuiAvailableCapabilities provides availableCapabilities.toSet(),
        content = content,
    )
}
