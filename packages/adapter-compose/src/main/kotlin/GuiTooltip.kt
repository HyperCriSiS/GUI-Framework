// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
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

enum class GuiTooltipPlacement(val wireValue: String) {
    TOP("top"),
    BOTTOM("bottom"),
    LEFT("left"),
    RIGHT("right"),
}

private fun GuiVisualPartStyle.tooltipOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.tooltipTextStyle(fallback: GuiVisualPartStyle): TextStyle {
    val sizeToken = fontSize ?: fallback.fontSize
    val composeFontSize = sizeToken?.toComposeSp() ?: TextUnit.Unspecified
    val lineHeightMultiplier = (lineHeight ?: fallback.lineHeight)?.toComposeUnitlessFloat()
    val composeLineHeight = if (sizeToken != null && lineHeightMultiplier != null) {
        (sizeToken.value * lineHeightMultiplier).toFloat().sp
    } else {
        TextUnit.Unspecified
    }
    val weight = (fontWeight ?: fallback.fontWeight)?.value?.roundToInt()?.also {
        require(it in 1..1000) { "GUI font weight must be in the range 1..1000" }
    }
    return TextStyle(
        color = (foreground ?: fallback.foreground)?.toComposeColor() ?: Color.Unspecified,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

private class GuiTooltipPopupPositionProvider(
    private val placement: GuiTooltipPlacement,
    private val gapPx: Int,
    private val marginPx: Int,
) : PopupPositionProvider {
    override fun calculatePosition(
        anchorBounds: IntRect,
        windowSize: IntSize,
        layoutDirection: LayoutDirection,
        popupContentSize: IntSize,
    ): IntOffset {
        val preferred = coordinates(placement, anchorBounds, popupContentSize)
        val oppositePlacement = when (placement) {
            GuiTooltipPlacement.TOP -> GuiTooltipPlacement.BOTTOM
            GuiTooltipPlacement.BOTTOM -> GuiTooltipPlacement.TOP
            GuiTooltipPlacement.LEFT -> GuiTooltipPlacement.RIGHT
            GuiTooltipPlacement.RIGHT -> GuiTooltipPlacement.LEFT
        }
        val opposite = coordinates(oppositePlacement, anchorBounds, popupContentSize)
        val preferredOverflow = primaryAxisOverflow(placement, preferred, popupContentSize, windowSize)
        val oppositeOverflow = primaryAxisOverflow(oppositePlacement, opposite, popupContentSize, windowSize)
        val selected = if (preferredOverflow > 0 && oppositeOverflow < preferredOverflow) opposite else preferred
        val maxX = (windowSize.width - marginPx - popupContentSize.width).coerceAtLeast(marginPx)
        val maxY = (windowSize.height - marginPx - popupContentSize.height).coerceAtLeast(marginPx)
        return IntOffset(
            x = selected.x.coerceIn(marginPx, maxX),
            y = selected.y.coerceIn(marginPx, maxY),
        )
    }

    private fun coordinates(
        candidate: GuiTooltipPlacement,
        anchorBounds: IntRect,
        popupContentSize: IntSize,
    ): IntOffset {
        val centerX = anchorBounds.left + anchorBounds.width / 2
        val centerY = anchorBounds.top + anchorBounds.height / 2
        return when (candidate) {
            GuiTooltipPlacement.TOP -> IntOffset(
                x = centerX - popupContentSize.width / 2,
                y = anchorBounds.top - popupContentSize.height - gapPx,
            )
            GuiTooltipPlacement.BOTTOM -> IntOffset(
                x = centerX - popupContentSize.width / 2,
                y = anchorBounds.bottom + gapPx,
            )
            GuiTooltipPlacement.LEFT -> IntOffset(
                x = anchorBounds.left - popupContentSize.width - gapPx,
                y = centerY - popupContentSize.height / 2,
            )
            GuiTooltipPlacement.RIGHT -> IntOffset(
                x = anchorBounds.right + gapPx,
                y = centerY - popupContentSize.height / 2,
            )
        }
    }

    private fun primaryAxisOverflow(
        candidate: GuiTooltipPlacement,
        position: IntOffset,
        popupContentSize: IntSize,
        windowSize: IntSize,
    ): Int =
        when (candidate) {
            GuiTooltipPlacement.TOP, GuiTooltipPlacement.BOTTOM -> {
                val before = (marginPx - position.y).coerceAtLeast(0)
                val after = (position.y + popupContentSize.height - (windowSize.height - marginPx)).coerceAtLeast(0)
                before + after
            }
            GuiTooltipPlacement.LEFT, GuiTooltipPlacement.RIGHT -> {
                val before = (marginPx - position.x).coerceAtLeast(0)
                val after = (position.x + popupContentSize.width - (windowSize.width - marginPx)).coerceAtLeast(0)
                before + after
            }
        }
}

/**
 * Foundation-only controlled Tooltip.
 *
 * The host renders its real semantic trigger through [trigger] and passes the supplied
 * [MutableInteractionSource] into that control. Tooltip observes pointer hover through that source
 * and focus through the non-focusable trigger container; [open] remains host-owned.
 * The popup is deliberately non-focusable and non-interactive and introduces no animation.
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
    interactionSource: MutableInteractionSource? = null,
    trigger: @Composable (MutableInteractionSource) -> Unit,
) {
    require(content.isNotBlank()) { "GUI tooltip content must not be blank" }

    val selection = LocalGuiThemeSelection.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    var triggerHasFocus by remember { mutableStateOf(false) }
    var triggerInteractionObserved by remember { mutableStateOf(false) }

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
    val popupRadius = popup.radius?.toComposeDp() ?: 0.dp
    val popupShape = RoundedCornerShape(popupRadius)
    val density = LocalDensity.current
    val positionProvider = remember(placement, density.density) {
        GuiTooltipPopupPositionProvider(
            placement = placement,
            gapPx = with(density) { 8.dp.roundToPx() },
            marginPx = with(density) { 4.dp.roundToPx() },
        )
    }

    LaunchedEffect(hovered, triggerHasFocus) {
        val interactionActive = hovered || triggerHasFocus
        if (interactionActive) {
            triggerInteractionObserved = true
            if (!open) onOpenChange(true)
        } else if (triggerInteractionObserved && open) {
            triggerInteractionObserved = false
            onOpenChange(false)
        }
    }

    Box(
        modifier = modifier
            .onFocusChanged { triggerHasFocus = it.hasFocus }
            .focusGroup()
            .onPreviewKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown && event.key == Key.Escape && open) {
                    onOpenChange(false)
                    true
                } else {
                    false
                }
            },
    ) {
        trigger(source)

        if (open) {
            Popup(
                popupPositionProvider = positionProvider,
                onDismissRequest = { onOpenChange(false) },
                properties = PopupProperties(focusable = false),
            ) {
                var popupModifier = Modifier.clip(popupShape)
                popup.fill?.let { popupModifier = popupModifier.background(it.toComposeColor(), popupShape) }
                popup.border?.let {
                    popupModifier = popupModifier.border(
                        width = it.width.toComposeDp(),
                        color = it.color.toComposeColor(),
                        shape = popupShape,
                    )
                }
                popupModifier = popupModifier
                    .alpha(popup.tooltipOpacity())
                    .padding(
                        horizontal = popup.paddingHorizontal?.toComposeDp() ?: 0.dp,
                        vertical = popup.paddingVertical?.toComposeDp() ?: 0.dp,
                    )
                Box(modifier = popupModifier) {
                    BasicText(
                        text = content,
                        style = contentStyle.tooltipTextStyle(popup),
                    )
                }
            }
        }
    }
}
