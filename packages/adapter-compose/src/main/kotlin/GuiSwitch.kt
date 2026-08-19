// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiSwitchState
import gui.framework.generated.internal.GuiSwitchVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry

private fun Modifier.guiSwitchFocusOutline(
    outline: GuiVisualOutline?,
    radius: androidx.compose.ui.unit.Dp,
): Modifier {
    if (outline == null) return this
    return drawWithContent {
        drawContent()
        val width = outline.width.toComposeDp().toPx()
        val offset = outline.offset.toComposeDp().toPx()
        if (width <= 0f) return@drawWithContent
        val extra = offset + width / 2f
        val corner = radius.toPx() + extra
        drawRoundRect(
            color = outline.color.toComposeColor(),
            topLeft = Offset(-extra, -extra),
            size = Size(size.width + extra * 2f, size.height + extra * 2f),
            cornerRadius = CornerRadius(corner, corner),
            style = Stroke(width = width),
        )
    }
}

private fun GuiVisualPartStyle.switchOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

/**
 * Native two-state Compose switch driven by the neutral GUI switch recipe.
 * Foundation toggle semantics are used directly; Material styling and animations are intentionally absent.
 */
@Composable
fun GuiSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    accessibilityLabel: String,
    modifier: Modifier = Modifier,
    variant: GuiSwitchVariant = GuiSwitchVariant.STANDARD,
    size: GuiSwitchSize = GuiSwitchSize.MEDIUM,
    disabled: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    require(accessibilityLabel.isNotBlank()) { "GUI switch accessibilityLabel must not be blank" }

    val selection = LocalGuiThemeSelection.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val enabled = !disabled

    val recipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "switch",
    ) ?: error(
        "No Compose visual recipe for switch with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )

    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (pressed && enabled) add("pressed")
        if (checked) add("checked")
        if (!enabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiSwitchState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI switch visual is missing required root part")
    val thumb = resolved["thumb"] ?: error("Resolved GUI switch visual is missing required thumb part")
    val rootRadius = root.radius?.toComposeDp() ?: 0.dp
    val rootShape = RoundedCornerShape(rootRadius)
    val thumbRadius = thumb.radius?.toComposeDp() ?: 0.dp
    val thumbShape = RoundedCornerShape(thumbRadius)

    var trackModifier = Modifier
        .defaultMinSize(
            minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(rootShape)

    root.fill?.let { trackModifier = trackModifier.background(it.toComposeColor(), rootShape) }
    root.border?.let {
        trackModifier = trackModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), rootShape)
    }

    trackModifier = trackModifier
        .alpha(root.switchOpacity())
        .hoverable(interactionSource = source, enabled = enabled)
        .semantics { contentDescription = accessibilityLabel }
        .toggleable(
            value = checked,
            interactionSource = source,
            indication = null,
            enabled = enabled,
            role = Role.Switch,
            onValueChange = onCheckedChange,
        )
        .padding(
            horizontal = root.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = root.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    var thumbModifier = Modifier
        .defaultMinSize(
            minWidth = thumb.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = thumb.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(thumbShape)
        .alpha(thumb.switchOpacity())

    thumb.fill?.let { thumbModifier = thumbModifier.background(it.toComposeColor(), thumbShape) }
    thumb.border?.let {
        thumbModifier = thumbModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), thumbShape)
    }

    Box(
        modifier = modifier.guiSwitchFocusOutline(root.outline, rootRadius),
        propagateMinConstraints = true,
    ) {
        Box(
            modifier = trackModifier,
            contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart,
        ) {
            Box(modifier = thumbModifier)
        }
    }
}
