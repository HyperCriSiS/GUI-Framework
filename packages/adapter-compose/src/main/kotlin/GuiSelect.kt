// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
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
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiSelectContract
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSelectState
import gui.framework.generated.internal.GuiSelectVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

data class GuiSelectOption(
    val value: String,
    val label: String,
    val disabled: Boolean = false,
) {
    init {
        require(label.isNotBlank()) { "GUI select option label must not be blank" }
    }
}

private fun Modifier.guiSelectFocusOutline(
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

private fun GuiVisualPartStyle.selectOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.selectTextStyle(fallback: GuiVisualPartStyle? = null): TextStyle {
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

private object GuiSelectPopupPositionProvider : PopupPositionProvider {
    override fun calculatePosition(
        anchorBounds: IntRect,
        windowSize: IntSize,
        layoutDirection: LayoutDirection,
        popupContentSize: IntSize,
    ): IntOffset {
        val preferredX = when (layoutDirection) {
            LayoutDirection.Ltr -> anchorBounds.left
            LayoutDirection.Rtl -> anchorBounds.right - popupContentSize.width
        }
        val maxX = (windowSize.width - popupContentSize.width).coerceAtLeast(0)
        val x = preferredX.coerceIn(0, maxX)

        val below = anchorBounds.bottom
        val above = anchorBounds.top - popupContentSize.height
        val y = if (below + popupContentSize.height <= windowSize.height) {
            below
        } else {
            above.coerceAtLeast(0)
        }
        return IntOffset(x, y)
    }
}

/**
 * Controlled Foundation-only Select / editable ComboBox mapped from the neutral Select recipe.
 * The host owns value, query and expanded state. The adapter owns active-option keyboard navigation.
 */
@Composable
fun GuiSelect(
    value: String,
    options: List<GuiSelectOption>,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    query: String = "",
    onQueryChange: (String) -> Unit = {},
    editable: Boolean = false,
    accessibilityLabel: String = "",
    expanded: Boolean = false,
    onExpandedChange: (Boolean) -> Unit = {},
    variant: GuiSelectVariant = GuiSelectVariant.STANDARD,
    size: GuiSelectSize = GuiSelectSize.MEDIUM,
    disabled: Boolean = false,
    error: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    val selection = LocalGuiThemeSelection.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val enabled = !disabled

    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "select",
    ) ?: error(
        "No Compose visual recipe for select with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiSelectContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "select",
    )

    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (expanded && enabled) add("expanded")
        if (!enabled) add("disabled")
        if (error) add("error")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiSelectState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI select visual is missing required root part")
    val placeholderStyle = resolved["placeholder"] ?: GuiVisualPartStyle()
    val indicatorStyle = resolved["indicator"] ?: GuiVisualPartStyle()
    val popupStyle = resolved["popup"] ?: root
    val optionsStyle = resolved["options"] ?: root
    val radius = root.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    val enabledOptions = options.filterNot { it.disabled }
    var activeIndex by remember(value, options) {
        val selectedIndex = enabledOptions.indexOfFirst { it.value == value }
        mutableStateOf(if (selectedIndex >= 0) selectedIndex else 0)
    }

    fun moveActive(delta: Int) {
        if (enabledOptions.isEmpty()) return
        activeIndex = (activeIndex + delta + enabledOptions.size) % enabledOptions.size
    }

    fun commitActive() {
        val option = enabledOptions.getOrNull(activeIndex) ?: return
        onValueChange(option.value)
        if (expanded) onExpandedChange(false)
    }

    val selectedLabel = options.firstOrNull { it.value == value }?.label ?: value
    val fieldValue = if (editable) query else selectedLabel
    val density = LocalDensity.current
    var anchorSize by remember { mutableStateOf(IntSize.Zero) }

    var fieldModifier = Modifier
        .defaultMinSize(
            minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(shape)

    root.fill?.let { fieldModifier = fieldModifier.background(it.toComposeColor(), shape) }
    root.border?.let {
        fieldModifier = fieldModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
    }
    if (accessibilityLabel.isNotBlank()) {
        fieldModifier = fieldModifier.semantics { contentDescription = accessibilityLabel }
    }
    if (!editable) {
        fieldModifier = fieldModifier.clickable(enabled = enabled) { onExpandedChange(!expanded) }
    }

    fieldModifier = fieldModifier
        .alpha(root.selectOpacity())
        .hoverable(interactionSource = source, enabled = enabled)
        .onFocusChanged {
            if (it.isFocused && editable && enabled && !expanded) onExpandedChange(true)
        }
        .onPreviewKeyEvent { event ->
            if (!enabled || event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
            when (event.key) {
                Key.DirectionDown -> {
                    if (!expanded) onExpandedChange(true)
                    moveActive(1)
                    true
                }
                Key.DirectionUp -> {
                    if (!expanded) onExpandedChange(true)
                    moveActive(-1)
                    true
                }
                Key.Enter, Key.NumPadEnter -> {
                    if (expanded) commitActive() else onExpandedChange(true)
                    true
                }
                Key.Escape -> {
                    if (expanded) onExpandedChange(false)
                    expanded
                }
                else -> false
            }
        }
        .padding(
            horizontal = root.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = root.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    Box(
        modifier = modifier.onSizeChanged { anchorSize = it },
        propagateMinConstraints = true,
    ) {
        Box(
            modifier = Modifier.guiSelectFocusOutline(root.outline, radius),
            propagateMinConstraints = true,
        ) {
            BasicTextField(
                value = fieldValue,
                onValueChange = {
                    if (editable && enabled) {
                        onQueryChange(it)
                        if (!expanded) onExpandedChange(true)
                    }
                },
                modifier = fieldModifier,
                enabled = enabled,
                readOnly = !editable,
                textStyle = root.selectTextStyle(),
                singleLine = true,
                interactionSource = source,
                cursorBrush = SolidColor(
                    root.outline?.color?.toComposeColor()
                        ?: root.foreground?.toComposeColor()
                        ?: Color.Unspecified,
                ),
                decorationBox = { innerTextField ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.weight(1f),
                            contentAlignment = Alignment.CenterStart,
                        ) {
                            if (fieldValue.isEmpty() && placeholder.isNotEmpty()) {
                                BasicText(
                                    text = placeholder,
                                    style = placeholderStyle.selectTextStyle(root),
                                )
                            }
                            innerTextField()
                        }
                        BasicText(text = "⌄", style = indicatorStyle.selectTextStyle(root))
                    }
                },
            )
        }

        if (expanded && enabled) {
            Popup(
                popupPositionProvider = GuiSelectPopupPositionProvider,
                onDismissRequest = { onExpandedChange(false) },
            ) {
                val popupRadius = popupStyle.radius?.toComposeDp() ?: radius
                val popupShape = RoundedCornerShape(popupRadius)
                var popupModifier = Modifier.clip(popupShape)
                if (anchorSize.width > 0) {
                    popupModifier = popupModifier.width(with(density) { anchorSize.width.toDp() })
                }
                popupStyle.fill?.let {
                    popupModifier = popupModifier.background(it.toComposeColor(), popupShape)
                }
                popupStyle.border?.let {
                    popupModifier = popupModifier.border(
                        it.width.toComposeDp(),
                        it.color.toComposeColor(),
                        popupShape,
                    )
                }
                Column(modifier = popupModifier) {
                    options.forEach { option ->
                        val selectedOption = option.value == value
                        var optionModifier = Modifier
                            .fillMaxWidth()
                            .semantics {
                                selected = selectedOption
                                if (option.disabled) disabled()
                                contentDescription = option.label
                            }
                            .clickable(enabled = !option.disabled) {
                                onValueChange(option.value)
                                onExpandedChange(false)
                            }
                            .padding(
                                horizontal = optionsStyle.paddingHorizontal?.toComposeDp()
                                    ?: root.paddingHorizontal?.toComposeDp()
                                    ?: 0.dp,
                                vertical = optionsStyle.paddingVertical?.toComposeDp()
                                    ?: root.paddingVertical?.toComposeDp()
                                    ?: 0.dp,
                            )
                        if (option.disabled) {
                            optionModifier = optionModifier.alpha(root.selectOpacity())
                        }
                        BasicText(
                            text = option.label,
                            modifier = optionModifier,
                            style = optionsStyle.selectTextStyle(root),
                        )
                    }
                }
            }
        }
    }
}
