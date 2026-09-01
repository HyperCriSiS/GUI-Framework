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
import androidx.compose.foundation.selection.triStateToggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiCheckboxContract
import gui.framework.generated.internal.GuiCheckboxSize
import gui.framework.generated.internal.GuiCheckboxState
import gui.framework.generated.internal.GuiCheckboxVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

private fun Modifier.guiCheckboxFocusOutline(
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

private fun GuiVisualPartStyle.checkboxOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.checkboxTextStyle(root: GuiVisualPartStyle): TextStyle {
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
        color = (foreground ?: root.foreground)?.toComposeColor() ?: Color.Unspecified,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

/**
 * Native controlled tri-state Compose checkbox driven by the neutral GUI checkbox recipe.
 * Foundation selection semantics are used directly; Material styling and animations are absent.
 */
@Composable
fun GuiCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    accessibilityLabel: String,
    modifier: Modifier = Modifier,
    variant: GuiCheckboxVariant = GuiCheckboxVariant.STANDARD,
    size: GuiCheckboxSize = GuiCheckboxSize.MEDIUM,
    indeterminate: Boolean = false,
    disabled: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    require(accessibilityLabel.isNotBlank()) { "GUI checkbox accessibilityLabel must not be blank" }

    val selection = LocalGuiThemeSelection.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val enabled = !disabled
    val toggleState = when {
        indeterminate -> ToggleableState.Indeterminate
        checked -> ToggleableState.On
        else -> ToggleableState.Off
    }

    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "checkbox",
    ) ?: error(
        "No Compose visual recipe for checkbox with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiCheckboxContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "checkbox",
    )

    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (pressed && enabled) add("pressed")
        if (indeterminate) add("indeterminate") else if (checked) add("checked")
        if (!enabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiCheckboxState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI checkbox visual is missing required root part")
    val indicator = resolved["indicator"] ?: error("Resolved GUI checkbox visual is missing required indicator part")
    val radius = root.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    var controlModifier = Modifier
        .defaultMinSize(
            minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(shape)

    root.fill?.let { controlModifier = controlModifier.background(it.toComposeColor(), shape) }
    root.border?.let {
        controlModifier = controlModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
    }

    controlModifier = controlModifier
        .alpha(root.checkboxOpacity())
        .hoverable(interactionSource = source, enabled = enabled)
        .semantics { contentDescription = accessibilityLabel }
        .triStateToggleable(
            state = toggleState,
            interactionSource = source,
            indication = null,
            enabled = enabled,
            role = Role.Checkbox,
            onClick = { onCheckedChange(if (indeterminate) true else !checked) },
        )

    val mark = when {
        indeterminate -> "−"
        checked -> "✓"
        else -> null
    }

    Box(
        modifier = modifier.guiCheckboxFocusOutline(root.outline, radius),
        propagateMinConstraints = true,
    ) {
        Box(
            modifier = controlModifier,
            contentAlignment = Alignment.Center,
        ) {
            if (mark != null) {
                BasicText(
                    text = mark,
                    style = indicator.checkboxTextStyle(root),
                )
            }
        }
    }
}
