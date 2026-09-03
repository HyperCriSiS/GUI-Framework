// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiToastContract
import gui.framework.generated.internal.GuiToastSize
import gui.framework.generated.internal.GuiToastState
import gui.framework.generated.internal.GuiToastVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

private fun GuiVisualPartStyle.toastOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.toastTextStyle(fallback: GuiVisualPartStyle? = null): TextStyle {
    val sizeToken = fontSize ?: fallback?.fontSize
    val composeFontSize = sizeToken?.toComposeSp() ?: TextUnit.Unspecified
    val lineHeightMultiplier = (lineHeight ?: fallback?.lineHeight)?.toComposeUnitlessFloat()
    val composeLineHeight = if (sizeToken != null && lineHeightMultiplier != null) {
        (sizeToken.value * lineHeightMultiplier).toFloat().sp
    } else {
        TextUnit.Unspecified
    }
    val weight = (fontWeight ?: fallback?.fontWeight)?.value?.roundToInt()?.also {
        require(it in 1..1000) { "GUI font weight must be in the range 1..1000" }
    }
    return TextStyle(
        color = (foreground ?: fallback?.foreground)?.toComposeColor() ?: Color.Unspecified,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

private fun Modifier.toastSurface(style: GuiVisualPartStyle): Modifier {
    val radius = style.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)
    var current = clip(shape).alpha(style.toastOpacity())
    style.fill?.let { current = current.background(it.toComposeColor(), shape) }
    style.border?.let { border ->
        current = current.border(
            width = border.width.toComposeDp(),
            color = border.color.toComposeColor(),
            shape = shape,
        )
    }
    return current
}

private fun Modifier.toastControl(
    style: GuiVisualPartStyle,
    interactionSource: MutableInteractionSource,
    accessibilityLabel: String,
    onActivate: () -> Unit,
): Modifier {
    val radius = style.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)
    var current = clip(shape).alpha(style.toastOpacity())
    style.fill?.let { current = current.background(it.toComposeColor(), shape) }
    style.border?.let { border ->
        current = current.border(
            width = border.width.toComposeDp(),
            color = border.color.toComposeColor(),
            shape = shape,
        )
    }
    style.outline?.let { outline ->
        current = current.border(
            width = outline.width.toComposeDp(),
            color = outline.color.toComposeColor(),
            shape = shape,
        )
    }
    current = current.defaultMinSize(
        minWidth = style.minWidth?.toComposeDp() ?: 0.dp,
        minHeight = style.minHeight?.toComposeDp() ?: 0.dp,
    )
    if (style.paddingHorizontal != null || style.paddingVertical != null) {
        current = current.padding(
            horizontal = style.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = style.paddingVertical?.toComposeDp() ?: 0.dp,
        )
    }
    return current
        .semantics { contentDescription = accessibilityLabel }
        .clickable(
            interactionSource = interactionSource,
            indication = null,
            onClick = onActivate,
        )
        .focusable(interactionSource = interactionSource)
        .hoverable(interactionSource = interactionSource)
}

/**
 * Controlled Foundation-only in-app Toast / Notification.
 *
 * [open] remains host-owned. A positive [durationMs] requests close after the display interval;
 * zero keeps the notification persistent. Hovering or focusing an interactive Toast pauses the
 * timeout. Resuming interaction deliberately grants a full interval again, avoiding a notification
 * disappearing immediately after the user finishes reading or operating it.
 *
 * Error notifications use an assertive live region; all other variants use a polite live region.
 * No decorative entrance/exit animation is introduced by the adapter.
 */
@Composable
fun GuiToast(
    open: Boolean,
    message: String,
    onOpenChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    title: String = "",
    actionLabel: String = "",
    actionValue: String = "",
    dismissible: Boolean = true,
    durationMs: Long = 5000L,
    accessibilityLabel: String = "",
    onActivate: (String) -> Unit = {},
    variant: GuiToastVariant = GuiToastVariant.INFO,
    size: GuiToastSize = GuiToastSize.MEDIUM,
) {
    require(message.isNotBlank()) { "GUI toast message must not be blank" }
    require(durationMs >= 0L) { "GUI toast durationMs must be non-negative" }

    val selection = LocalGuiThemeSelection.current
    val rootInteractionSource = remember { MutableInteractionSource() }
    val actionInteractionSource = remember { MutableInteractionSource() }
    val dismissInteractionSource = remember { MutableInteractionSource() }
    val rootHovered by rootInteractionSource.collectIsHoveredAsState()
    val actionHovered by actionInteractionSource.collectIsHoveredAsState()
    val actionFocused by actionInteractionSource.collectIsFocusedAsState()
    val actionPressed by actionInteractionSource.collectIsPressedAsState()
    val dismissHovered by dismissInteractionSource.collectIsHoveredAsState()
    val dismissFocused by dismissInteractionSource.collectIsFocusedAsState()
    val dismissPressed by dismissInteractionSource.collectIsPressedAsState()
    val interactionPaused = rootHovered || actionHovered || actionFocused || actionPressed ||
        dismissHovered || dismissFocused || dismissPressed

    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "toast",
    ) ?: error(
        "No Compose visual recipe for toast with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiToastContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "toast",
    )
    val rootResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiToastState.entries.map { it.wireValue },
    )
    val rootStyle = rootResolved["root"] ?: error("Resolved GUI toast visual is missing required root part")
    val titleStyle = rootResolved["title"] ?: error("Resolved GUI toast visual is missing title part")
    val messageStyle = rootResolved["message"] ?: error("Resolved GUI toast visual is missing required message part")
    val dismissBaseStyle = rootResolved["dismiss"] ?: error("Resolved GUI toast visual is missing dismiss part")

    val actionStates = buildSet {
        if (actionHovered) add("hover")
        if (actionFocused) add("focus")
        if (actionPressed) add("pressed")
    }
    val actionResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = actionStates,
        statePriority = GuiToastState.entries.map { it.wireValue },
    )
    val actionStyle = actionResolved["action"] ?: error("Resolved GUI toast visual is missing action part")

    LaunchedEffect(open, durationMs, interactionPaused) {
        if (open && durationMs > 0L && !interactionPaused) {
            delay(durationMs)
            onOpenChange(false)
        }
    }

    if (!open) return

    val density = LocalDensity.current
    val edgeOffset = with(density) { 16.dp.roundToPx() }
    val hasInteractiveControls = actionLabel.isNotBlank() || dismissible

    Popup(
        alignment = Alignment.BottomEnd,
        offset = IntOffset(-edgeOffset, -edgeOffset),
        onDismissRequest = {
            if (dismissible) onOpenChange(false)
        },
        properties = PopupProperties(focusable = hasInteractiveControls),
    ) {
        val rootGap = rootStyle.gap?.toComposeDp() ?: 0.dp
        val rootModifier = modifier
            .toastSurface(rootStyle)
            .hoverable(rootInteractionSource)
            .semantics {
                liveRegion = if (variant == GuiToastVariant.ERROR) LiveRegionMode.Assertive else LiveRegionMode.Polite
                if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
            }
            .padding(
                horizontal = rootStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
                vertical = rootStyle.paddingVertical?.toComposeDp() ?: 0.dp,
            )

        Row(
            modifier = rootModifier,
            horizontalArrangement = Arrangement.spacedBy(rootGap),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                if (title.isNotBlank()) {
                    BasicText(
                        text = title,
                        style = titleStyle.toastTextStyle(rootStyle),
                    )
                }
                BasicText(
                    text = message,
                    style = messageStyle.toastTextStyle(rootStyle),
                )
            }

            if (actionLabel.isNotBlank()) {
                BasicText(
                    text = actionLabel,
                    modifier = Modifier.toastControl(
                        style = actionStyle,
                        interactionSource = actionInteractionSource,
                        accessibilityLabel = actionLabel,
                        onActivate = {
                            onActivate(actionValue)
                            onOpenChange(false)
                        },
                    ),
                    style = actionStyle.toastTextStyle(rootStyle),
                )
            }

            if (dismissible) {
                BasicText(
                    text = "×",
                    modifier = Modifier.toastControl(
                        style = dismissBaseStyle,
                        interactionSource = dismissInteractionSource,
                        accessibilityLabel = "Dismiss notification",
                        onActivate = { onOpenChange(false) },
                    ),
                    style = dismissBaseStyle.toastTextStyle(rootStyle),
                )
            }
        }
    }
}
