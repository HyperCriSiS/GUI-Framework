// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiInputContract
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiInputState
import gui.framework.generated.internal.GuiInputVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

private fun Modifier.guiInputFocusOutline(
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

private fun GuiVisualPartStyle.inputOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.inputTextStyle(fallback: GuiVisualPartStyle? = null): TextStyle {
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

@Composable
fun GuiInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    accessibilityLabel: String = "",
    variant: GuiInputVariant = GuiInputVariant.STANDARD,
    size: GuiInputSize = GuiInputSize.MEDIUM,
    disabled: Boolean = false,
    readOnly: Boolean = false,
    error: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    val selection = LocalGuiThemeSelection.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val enabled = !disabled
    var editingValue by remember {
        mutableStateOf(TextFieldValue(text = value, selection = TextRange(value.length)))
    }
    val fieldValue = if (editingValue.composition != null || editingValue.text == value) {
        editingValue
    } else {
        TextFieldValue(text = value, selection = TextRange(value.length))
    }
    SideEffect {
        if (editingValue.composition == null && editingValue != fieldValue) editingValue = fieldValue
    }

    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "input",
    ) ?: error("No Compose visual recipe for input with theme ${selection.theme.wireValue} and palette ${selection.paletteId}")
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiInputContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "input",
    )
    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (!enabled) add("disabled")
        if (error) add("error")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiInputState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI input visual is missing required root part")
    val placeholderStyle = resolved["placeholder"] ?: GuiVisualPartStyle()
    val radius = root.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)
    var fieldModifier = Modifier.defaultMinSize(
        minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
        minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
    ).clip(shape)
    root.fill?.let { fieldModifier = fieldModifier.background(it.toComposeColor(), shape) }
    root.border?.let { fieldModifier = fieldModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape) }
    if (accessibilityLabel.isNotBlank()) fieldModifier = fieldModifier.semantics { contentDescription = accessibilityLabel }
    fieldModifier = fieldModifier.alpha(root.inputOpacity()).hoverable(interactionSource = source, enabled = enabled).padding(
        horizontal = root.paddingHorizontal?.toComposeDp() ?: 0.dp,
        vertical = root.paddingVertical?.toComposeDp() ?: 0.dp,
    )
    Box(modifier = modifier.guiInputFocusOutline(root.outline, radius), propagateMinConstraints = true) {
        BasicTextField(
            value = fieldValue,
            onValueChange = { nextValue ->
                editingValue = nextValue
                if (nextValue.text != value) onValueChange(nextValue.text)
            },
            modifier = fieldModifier,
            enabled = enabled,
            readOnly = readOnly,
            textStyle = root.inputTextStyle(),
            singleLine = true,
            interactionSource = source,
            cursorBrush = SolidColor(root.outline?.color?.toComposeColor() ?: root.foreground?.toComposeColor() ?: Color.Unspecified),
            decorationBox = { innerTextField ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (fieldValue.text.isEmpty() && placeholder.isNotEmpty()) BasicText(text = placeholder, style = placeholderStyle.inputTextStyle(root))
                    innerTextField()
                }
            },
        )
    }
}
