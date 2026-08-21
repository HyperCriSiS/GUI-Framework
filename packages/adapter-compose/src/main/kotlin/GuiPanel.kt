// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiPanelContract
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiPanelState
import gui.framework.generated.internal.GuiPanelVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry

private fun GuiVisualPartStyle.panelOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun Modifier.guiPanelAccessibility(accessibilityLabel: String): Modifier =
    if (accessibilityLabel.isBlank()) {
        this
    } else {
        semantics { contentDescription = accessibilityLabel }
    }

/**
 * Native non-interactive Compose container driven by the neutral GUI panel recipe.
 * The panel owns only its surface treatment; child composition remains owned by the caller.
 */
@Composable
fun GuiPanel(
    modifier: Modifier = Modifier,
    variant: GuiPanelVariant = GuiPanelVariant.STANDARD,
    size: GuiPanelSize = GuiPanelSize.MEDIUM,
    accessibilityLabel: String = "",
    content: @Composable BoxScope.() -> Unit,
) {
    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "panel",
    ) ?: error(
        "No Compose visual recipe for panel with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiPanelContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "panel",
    )

    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet<String>(),
        statePriority = GuiPanelState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI panel visual is missing required root part")
    val radius = root.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    var panelModifier = modifier
        .defaultMinSize(
            minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(shape)

    root.fill?.let { panelModifier = panelModifier.background(it.toComposeColor(), shape) }
    root.border?.let {
        panelModifier = panelModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
    }

    panelModifier = panelModifier
        .alpha(root.panelOpacity())
        .guiPanelAccessibility(accessibilityLabel)
        .padding(
            horizontal = root.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = root.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    Box(
        modifier = panelModifier,
        content = content,
    )
}
