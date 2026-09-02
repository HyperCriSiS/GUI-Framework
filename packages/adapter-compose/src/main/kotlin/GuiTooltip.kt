// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiTooltipContract
import gui.framework.generated.internal.GuiTooltipSize
import gui.framework.generated.internal.GuiTooltipState
import gui.framework.generated.internal.GuiTooltipVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

enum class GuiTooltipPlacement { TOP, RIGHT, BOTTOM, LEFT }

private fun GuiVisualPartStyle.tooltipOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.tooltipTextStyle(): TextStyle {
    val sizeToken = fontSize
    val composeFontSize = sizeToken?.toComposeSp() ?: TextUnit.Unspecified
    val lineHeightMultiplier = lineHeight?.toComposeUnitlessFloat()
    val composeLineHeight = if (sizeToken != null && lineHeightMultiplier != null) {
        (sizeToken.value * lineHeightMultiplier).toFloat().sp
    } else {
        TextUnit.Unspecified
    }
    val weight = fontWeight?.value?.roundToInt()?.also {
        require(it in 1..1000) { "GUI font weight must be in the range 1..1000" }
    }
    return TextStyle(
        color = foreground?.toComposeColor() ?: androidx.compose.ui.graphics.Color.Unspecified,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

private class GuiTooltipPositionProvider(
    private val placement: GuiTooltipPlacement,
    private val gap: Dp,
    private val density: Float,
) : PopupPositionProvider {
    override fun calculatePosition(
        anchorBounds: IntRect,
        windowSize: IntSize,
        layoutDirection: LayoutDirection,
        popupContentSize: IntSize,
    ): IntOffset {
        val gapPx = (gap.value * density).roundToInt()
        val centeredX = anchorBounds.left + (anchorBounds.width - popupContentSize.width) / 2
        val centeredY = anchorBounds.top + (anchorBounds.height - popupContentSize.height) / 2
        val desired = when (placement) {
            GuiTooltipPlacement.TOP -> IntOffset(centeredX, anchorBounds.top - popupContentSize.height - gapPx)
            GuiTooltipPlacement.RIGHT -> IntOffset(anchorBounds.right + gapPx, centeredY)
            GuiTooltipPlacement.BOTTOM -> IntOffset(centeredX, anchorBounds.bottom + gapPx)
            GuiTooltipPlacement.LEFT -> IntOffset(anchorBounds.left - popupContentSize.width - gapPx, centeredY)
        }
        return IntOffset(
            x = desired.x.coerceIn(0, (windowSize.width - popupContentSize.width).coerceAtLeast(0)),
            y = desired.y.coerceIn(0, (windowSize.height - popupContentSize.height).coerceAtLeast(0)),
        )
    }
}

/**
 * Foundation-only controlled Tooltip.
 * Hover and Escape request [onOpenChange]; [open] remains owned by the caller.
 * Focus-driven opening can be supplied by the host through the same controlled state when
 * the trigger already owns its focus semantics.
 */
@Composable
fun GuiTooltip(
    open: Boolean,
    content: String,
    onOpenChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    placement: GuiTooltipPlacement = GuiTooltipPlacement.TOP,
    variant: GuiTooltipVariant = GuiTooltipVariant.STANDARD,
    size: GuiTooltipSize = GuiTooltipSize.MEDIUM,
    trigger: @Composable () -> Unit,
) {
    require(content.isNotBlank()) { "GUI tooltip content must not be blank" }

    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "tooltip",
    ) ?: error(
        "No Compose visual recipe for tooltip with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiTooltipContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "tooltip",
    )
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiTooltipState.entries.map { it.wireValue },
    )
    val popup = resolved["popup"] ?: error("Resolved GUI tooltip visual is missing required popup part")
    val contentStyle = resolved["content"] ?: error("Resolved GUI tooltip visual is missing required content part")
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()

    LaunchedEffect(hovered) {
        if (hovered != open) onOpenChange(hovered)
    }

    Box(
        modifier = modifier
            .hoverable(interactionSource = source)
            .onPreviewKeyEvent { event ->
                if (open && event.type == KeyEventType.KeyDown && event.key == Key.Escape) {
                    onOpenChange(false)
                    true
                } else {
                    false
                }
            },
    ) {
        trigger()

        if (open) {
            val gap = 6.dp
            val density = androidx.compose.ui.platform.LocalDensity.current.density
            Popup(
                popupPositionProvider = remember(placement, density) {
                    GuiTooltipPositionProvider(placement = placement, gap = gap, density = density)
                },
            ) {
                val radius = popup.radius?.toComposeDp() ?: 0.dp
                val shape = RoundedCornerShape(radius)
                var popupModifier = Modifier
                    .clip(shape)
                    .alpha(popup.tooltipOpacity())
                    .semantics { liveRegion = LiveRegionMode.Polite }
                popup.fill?.let { popupModifier = popupModifier.background(it.toComposeColor(), shape) }
                popup.border?.let {
                    popupModifier = popupModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
                }
                popupModifier = popupModifier.padding(
                    horizontal = popup.paddingHorizontal?.toComposeDp() ?: 0.dp,
                    vertical = popup.paddingVertical?.toComposeDp() ?: 0.dp,
                )
                Box(modifier = popupModifier, contentAlignment = Alignment.Center) {
                    BasicText(text = content, style = contentStyle.tooltipTextStyle())
                }
            }
        }
    }
}
