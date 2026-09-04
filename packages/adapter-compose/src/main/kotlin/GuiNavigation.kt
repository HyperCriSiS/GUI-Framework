// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
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
import gui.framework.generated.internal.GuiNavigationContract
import gui.framework.generated.internal.GuiNavigationSize
import gui.framework.generated.internal.GuiNavigationState
import gui.framework.generated.internal.GuiNavigationVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualRecipe
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

/** One controlled navigation destination. Icon content is deliberately renderer-neutral text for now. */
data class GuiNavigationItem(
    val value: String,
    val label: String = "",
    val icon: String = "",
    val accessibilityLabel: String = "",
    val disabled: Boolean = false,
) {
    init {
        require(value.isNotBlank()) { "GUI navigation item value must not be blank" }
        require(label.isNotBlank() || accessibilityLabel.isNotBlank()) {
            "GUI navigation item requires a label or accessibilityLabel"
        }
    }
}

private fun GuiVisualPartStyle.navigationOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.navigationTextStyle(fallbackColor: Color): TextStyle {
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

private fun Modifier.guiNavigationFocusOutline(
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

private fun Modifier.guiNavigationIndicator(
    indicator: GuiVisualPartStyle,
    selected: Boolean,
    variant: GuiNavigationVariant,
): Modifier {
    if (!selected || indicator.fill == null) return this
    return drawWithContent {
        drawContent()
        val thickness = indicator.minHeight?.toComposeDp()?.toPx() ?: 0f
        if (thickness <= 0f) return@drawWithContent
        val bounded = thickness.coerceAtMost(if (variant == GuiNavigationVariant.VERTICAL) size.width else size.height)
        if (variant == GuiNavigationVariant.VERTICAL) {
            drawRect(
                color = indicator.fill!!.toComposeColor(),
                topLeft = Offset.Zero,
                size = Size(bounded, size.height),
            )
        } else {
            drawRect(
                color = indicator.fill!!.toComposeColor(),
                topLeft = Offset(0f, size.height - bounded),
                size = Size(size.width, bounded),
            )
        }
    }
}

@Composable
private fun GuiNavigationDestination(
    item: GuiNavigationItem,
    selected: Boolean,
    globallyDisabled: Boolean,
    variant: GuiNavigationVariant,
    size: GuiNavigationSize,
    recipe: GuiVisualRecipe,
    modifier: Modifier,
    onValueChange: (String) -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val enabled = !globallyDisabled && !item.disabled
    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (pressed && enabled) add("pressed")
        if (selected) add("selected")
        if (!enabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiNavigationState.entries.map { it.wireValue },
    )
    val visualItem = resolved["item"] ?: error("Resolved GUI navigation visual is missing required item part")
    val label = resolved["label"] ?: error("Resolved GUI navigation visual is missing required label part")
    val icon = resolved["icon"] ?: error("Resolved GUI navigation visual is missing required icon part")
    val indicator = resolved["indicator"] ?: error("Resolved GUI navigation visual is missing required indicator part")
    val radius = visualItem.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    var itemModifier = modifier
        .defaultMinSize(
            minWidth = visualItem.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = visualItem.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(shape)
    visualItem.fill?.let { itemModifier = itemModifier.background(it.toComposeColor(), shape) }
    visualItem.border?.let {
        itemModifier = itemModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
    }
    itemModifier = itemModifier
        .alpha(visualItem.navigationOpacity())
        .guiNavigationIndicator(indicator, selected, variant)
        .guiNavigationFocusOutline(visualItem.outline, radius)
        .hoverable(interactionSource = source, enabled = enabled)
        .then(
            if (item.accessibilityLabel.isBlank()) Modifier else Modifier.semantics {
                contentDescription = item.accessibilityLabel
            },
        )
        .selectable(
            selected = selected,
            interactionSource = source,
            indication = null,
            enabled = enabled,
            role = Role.Tab,
            onClick = { if (!selected) onValueChange(item.value) },
        )
        .padding(
            horizontal = visualItem.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = visualItem.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    val fallbackColor = visualItem.foreground?.toComposeColor() ?: Color.Unspecified
    val itemGap = visualItem.gap?.toComposeDp() ?: 0.dp
    if (variant == GuiNavigationVariant.VERTICAL) {
        Row(
            modifier = itemModifier,
            horizontalArrangement = Arrangement.spacedBy(itemGap),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (item.icon.isNotBlank()) BasicText(item.icon, style = icon.navigationTextStyle(fallbackColor))
            if (item.label.isNotBlank()) BasicText(item.label, style = label.navigationTextStyle(fallbackColor))
        }
    } else {
        Column(
            modifier = itemModifier,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(itemGap),
        ) {
            if (item.icon.isNotBlank()) BasicText(item.icon, style = icon.navigationTextStyle(fallbackColor))
            if (item.label.isNotBlank()) BasicText(item.label, style = label.navigationTextStyle(fallbackColor))
        }
    }
}

/**
 * Foundation-only controlled navigation bar / rail.
 *
 * Horizontal and vertical variants share the same controlled destination model. Selection
 * changes only after [value] is updated by the host; disabled destinations never emit changes.
 */
@Composable
fun GuiNavigation(
    value: String,
    items: List<GuiNavigationItem>,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    accessibilityLabel: String = "",
    variant: GuiNavigationVariant = GuiNavigationVariant.HORIZONTAL,
    size: GuiNavigationSize = GuiNavigationSize.MEDIUM,
    disabled: Boolean = false,
) {
    require(items.map { it.value }.toSet().size == items.size) { "GUI navigation item values must be unique" }

    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "navigation",
    ) ?: error(
        "No Compose visual recipe for navigation with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiNavigationContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "navigation",
    )
    val containerResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiNavigationState.entries.map { it.wireValue },
    )
    val root = containerResolved["root"] ?: error("Resolved GUI navigation visual is missing required root part")
    val list = containerResolved["list"] ?: error("Resolved GUI navigation visual is missing required list part")
    val listRadius = list.radius?.toComposeDp() ?: 0.dp
    val listShape = RoundedCornerShape(listRadius)

    val rootModifier = modifier.alpha(root.navigationOpacity())
    var listModifier = Modifier
        .then(
            if (accessibilityLabel.isBlank()) Modifier else Modifier.semantics {
                contentDescription = accessibilityLabel
            },
        )
        .selectableGroup()
        .clip(listShape)
    list.fill?.let { listModifier = listModifier.background(it.toComposeColor(), listShape) }
    list.border?.let {
        listModifier = listModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), listShape)
    }
    listModifier = listModifier.padding(
        horizontal = list.paddingHorizontal?.toComposeDp() ?: 0.dp,
        vertical = list.paddingVertical?.toComposeDp() ?: 0.dp,
    )
    val listGap = list.gap?.toComposeDp() ?: 0.dp

    if (variant == GuiNavigationVariant.VERTICAL) {
        Column(
            modifier = rootModifier.then(listModifier),
            verticalArrangement = Arrangement.spacedBy(listGap),
        ) {
            items.forEach { item ->
                key(item.value) {
                    GuiNavigationDestination(
                        item = item,
                        selected = item.value == value,
                        globallyDisabled = disabled,
                        variant = variant,
                        size = size,
                        recipe = recipe,
                        modifier = Modifier.fillMaxWidth(),
                        onValueChange = onValueChange,
                    )
                }
            }
        }
    } else {
        Row(
            modifier = rootModifier.then(listModifier),
            horizontalArrangement = Arrangement.spacedBy(listGap),
        ) {
            items.forEach { item ->
                key(item.value) {
                    GuiNavigationDestination(
                        item = item,
                        selected = item.value == value,
                        globallyDisabled = disabled,
                        variant = variant,
                        size = size,
                        recipe = recipe,
                        modifier = Modifier.weight(1f),
                        onValueChange = onValueChange,
                    )
                }
            }
        }
    }
}
