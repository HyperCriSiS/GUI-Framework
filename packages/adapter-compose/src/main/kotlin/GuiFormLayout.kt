// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiFormLayoutContract
import gui.framework.generated.internal.GuiFormLayoutSize
import gui.framework.generated.internal.GuiFormLayoutState
import gui.framework.generated.internal.GuiFormLayoutVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRecipe
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.max
import kotlin.math.roundToInt

private enum class GuiFormLayoutSpan { FIELD, FULL }

private data class GuiFormLayoutContext(
    val variant: GuiFormLayoutVariant,
    val size: GuiFormLayoutSize,
    val recipe: GuiVisualRecipe,
    val columns: Int,
    val compact: Boolean,
)

private val LocalGuiFormLayoutContext = compositionLocalOf<GuiFormLayoutContext?> { null }

private fun GuiVisualPartStyle.formOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.formTextStyle(fallbackColor: Color): TextStyle {
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
        color = foreground?.toComposeColor() ?: fallbackColor,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

private fun Modifier.applyFormBox(style: GuiVisualPartStyle): Modifier {
    val radius = style.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)
    var result = this.defaultMinSize(
        minWidth = style.minWidth?.toComposeDp() ?: 0.dp,
        minHeight = style.minHeight?.toComposeDp() ?: 0.dp,
    )
    if (radius > 0.dp) result = result.clip(shape)
    style.fill?.let { result = result.background(it.toComposeColor(), shape) }
    style.border?.let { result = result.border(it.width.toComposeDp(), it.color.toComposeColor(), shape) }
    result = result.alpha(style.formOpacity())
    return result.padding(
        horizontal = style.paddingHorizontal?.toComposeDp() ?: 0.dp,
        vertical = style.paddingVertical?.toComposeDp() ?: 0.dp,
    )
}

@Composable
private fun resolveFormLayoutRecipe(): GuiVisualRecipe {
    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "form-layout",
    ) ?: error(
        "No Compose visual recipe for form-layout with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    return resolveGuiCapabilityRecipe(
        capabilities = GuiFormLayoutContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "form-layout",
    )
}

private data class GuiMeasuredFormChild(
    val placeable: androidx.compose.ui.layout.Placeable,
    val fullSpan: Boolean,
    var x: Int = 0,
    var y: Int = 0,
)

@Composable
private fun GuiFormGrid(
    columns: Int,
    gap: Dp,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    require(columns > 0) { "GUI form-layout columns must be a positive integer" }
    Layout(modifier = modifier, content = content) { measurables, constraints ->
        val bounded = constraints.hasBoundedWidth
        val effectiveColumns = if (bounded) columns else 1
        val gapPx = gap.roundToPx()
        val width = if (bounded) constraints.maxWidth else constraints.minWidth
        val columnWidth = if (bounded) {
            val totalGap = gapPx * (effectiveColumns - 1)
            ((width - totalGap).coerceAtLeast(0)) / effectiveColumns
        } else {
            0
        }

        val measured = measurables.map { measurable ->
            val fullSpan = measurable.layoutId == GuiFormLayoutSpan.FULL
            val maxHeight = constraints.maxHeight
            val childConstraints = if (bounded) {
                val childWidth = if (fullSpan) width else columnWidth
                androidx.compose.ui.unit.Constraints(
                    minWidth = childWidth,
                    maxWidth = childWidth,
                    minHeight = 0,
                    maxHeight = maxHeight,
                )
            } else {
                androidx.compose.ui.unit.Constraints(
                    minWidth = 0,
                    maxWidth = androidx.compose.ui.unit.Constraints.Infinity,
                    minHeight = 0,
                    maxHeight = maxHeight,
                )
            }
            GuiMeasuredFormChild(measurable.measure(childConstraints), fullSpan)
        }

        var y = 0
        var column = 0
        var rowHeight = 0
        var hasPlaced = false
        fun finishRow() {
            if (column == 0) return
            y += rowHeight + gapPx
            column = 0
            rowHeight = 0
        }

        measured.forEach { child ->
            if (child.fullSpan) {
                finishRow()
                child.x = 0
                child.y = y
                y += child.placeable.height + gapPx
                hasPlaced = true
                return@forEach
            }
            child.x = if (bounded) column * (columnWidth + gapPx) else 0
            child.y = y
            rowHeight = max(rowHeight, child.placeable.height)
            column += 1
            hasPlaced = true
            if (column == effectiveColumns) finishRow()
        }
        finishRow()

        val naturalHeight = if (hasPlaced) (y - gapPx).coerceAtLeast(0) else 0
        val naturalWidth = if (bounded) width else measured.maxOfOrNull { it.placeable.width } ?: 0
        val layoutWidth = constraints.constrainWidth(naturalWidth)
        val layoutHeight = constraints.constrainHeight(naturalHeight)
        layout(layoutWidth, layoutHeight) {
            measured.forEach { child -> child.placeable.placeRelative(child.x, child.y) }
        }
    }
}

/**
 * Renderer-neutral Form Layout mapped to Foundation Compose.
 *
 * This primitive owns only structure and visual/semantic field metadata. Caller-owned controls retain
 * their value, interaction and enabled state; [GuiFormField.disabled] is deliberately not propagated
 * into the supplied control slot.
 */
@Composable
fun GuiFormLayout(
    modifier: Modifier = Modifier,
    columns: Int = 1,
    accessibilityLabel: String = "",
    variant: GuiFormLayoutVariant = GuiFormLayoutVariant.STACKED,
    size: GuiFormLayoutSize = GuiFormLayoutSize.MEDIUM,
    content: @Composable () -> Unit,
) {
    require(columns > 0) { "GUI form-layout columns must be a positive integer" }
    val recipe = resolveFormLayoutRecipe()
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiFormLayoutState.entries.map { it.wireValue },
    )
    val rootStyle = resolved["root"] ?: error("Resolved GUI form-layout visual is missing required root part")
    val rootGap = rootStyle.gap?.toComposeDp() ?: 0.dp

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                isTraversalGroup = true
                if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
            }
            .applyFormBox(rootStyle),
    ) {
        val compact = maxWidth < 480.dp
        val effectiveColumns = if (compact) 1 else columns
        val context = GuiFormLayoutContext(
            variant = variant,
            size = size,
            recipe = recipe,
            columns = effectiveColumns,
            compact = compact,
        )
        CompositionLocalProvider(LocalGuiFormLayoutContext provides context) {
            GuiFormGrid(
                columns = effectiveColumns,
                gap = rootGap,
                modifier = Modifier.fillMaxWidth(),
                content = content,
            )
        }
    }
}

/** Full-width structural section that inherits the enclosing Form Layout column model. */
@Composable
fun GuiFormLayoutSection(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val context = LocalGuiFormLayoutContext.current
        ?: error("GuiFormLayoutSection must be used inside GuiFormLayout")
    val resolved = resolveGuiVisualRecipe(
        recipe = context.recipe,
        variant = context.variant.wireValue,
        size = context.size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiFormLayoutState.entries.map { it.wireValue },
    )
    val style = resolved["section"] ?: GuiVisualPartStyle()
    GuiFormGrid(
        columns = context.columns,
        gap = style.gap?.toComposeDp() ?: 0.dp,
        modifier = modifier
            .layoutId(GuiFormLayoutSpan.FULL)
            .fillMaxWidth()
            .applyFormBox(style),
        content = content,
    )
}

/**
 * One Form Layout field. Error/disabled state belongs to this wrapper only; the supplied control is
 * never mutated or replaced by the framework.
 */
@Composable
fun GuiFormField(
    label: String = "",
    description: String = "",
    errorMessage: String = "",
    disabled: Boolean = false,
    modifier: Modifier = Modifier,
    control: @Composable () -> Unit,
) {
    val context = LocalGuiFormLayoutContext.current
        ?: error("GuiFormField must be used inside GuiFormLayout")
    val activeStates = buildSet {
        if (errorMessage.isNotBlank()) add("error")
        if (disabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = context.recipe,
        variant = context.variant.wireValue,
        size = context.size.wireValue,
        activeStates = activeStates,
        statePriority = GuiFormLayoutState.entries.map { it.wireValue },
    )
    val fieldStyle = resolved["field"] ?: error("Resolved GUI form-layout visual is missing required field part")
    val labelStyle = resolved["label"] ?: GuiVisualPartStyle()
    val controlStyle = resolved["control"] ?: GuiVisualPartStyle()
    val descriptionStyle = resolved["description"] ?: GuiVisualPartStyle()
    val errorStyle = resolved["error"] ?: GuiVisualPartStyle()
    val gap = fieldStyle.gap?.toComposeDp() ?: 0.dp
    val fallback = fieldStyle.foreground?.toComposeColor() ?: Color.Unspecified

    val fieldModifier = modifier
        .layoutId(GuiFormLayoutSpan.FIELD)
        .fillMaxWidth()
        .semantics {
            if (errorMessage.isNotBlank()) error(errorMessage)
            if (disabled) disabled()
        }
        .applyFormBox(fieldStyle)

    @Composable
    fun Label() {
        if (label.isNotBlank()) {
            BasicText(
                text = label,
                modifier = Modifier.applyFormBox(labelStyle),
                style = labelStyle.formTextStyle(fallback),
            )
        }
    }

    @Composable
    fun ControlDetails() {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            Box(modifier = Modifier.fillMaxWidth().applyFormBox(controlStyle)) { control() }
            if (description.isNotBlank()) {
                BasicText(
                    text = description,
                    modifier = Modifier.applyFormBox(descriptionStyle),
                    style = descriptionStyle.formTextStyle(fallback),
                )
            }
            if (errorMessage.isNotBlank()) {
                BasicText(
                    text = errorMessage,
                    modifier = Modifier.applyFormBox(errorStyle),
                    style = errorStyle.formTextStyle(fallback),
                )
            }
        }
    }

    val inline = context.variant == GuiFormLayoutVariant.INLINE && !context.compact
    if (inline && label.isNotBlank()) {
        Row(
            modifier = fieldModifier,
            horizontalArrangement = Arrangement.spacedBy(gap),
            verticalAlignment = Alignment.Top,
        ) {
            Label()
            Box(modifier = Modifier.weight(1f)) { ControlDetails() }
        }
    } else {
        Column(
            modifier = fieldModifier,
            verticalArrangement = Arrangement.spacedBy(gap),
        ) {
            Label()
            ControlDetails()
        }
    }
}

/** Full-width action group. Actions wrap instead of forcing horizontal overflow. */
@Composable
fun GuiFormActions(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val context = LocalGuiFormLayoutContext.current
        ?: error("GuiFormActions must be used inside GuiFormLayout")
    val resolved = resolveGuiVisualRecipe(
        recipe = context.recipe,
        variant = context.variant.wireValue,
        size = context.size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiFormLayoutState.entries.map { it.wireValue },
    )
    val style = resolved["actions"] ?: GuiVisualPartStyle()
    val gap = style.gap?.toComposeDp() ?: 0.dp
    FlowRow(
        modifier = modifier
            .layoutId(GuiFormLayoutSpan.FULL)
            .fillMaxWidth()
            .applyFormBox(style),
        horizontalArrangement = Arrangement.spacedBy(gap),
        verticalArrangement = Arrangement.spacedBy(gap),
    ) {
        content()
    }
}
