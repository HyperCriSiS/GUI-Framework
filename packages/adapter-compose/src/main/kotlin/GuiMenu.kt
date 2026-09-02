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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
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
import androidx.compose.ui.window.PopupProperties
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeSp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiMenuContract
import gui.framework.generated.internal.GuiMenuSize
import gui.framework.generated.internal.GuiMenuState
import gui.framework.generated.internal.GuiMenuVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

data class GuiMenuItem(
    val value: String,
    val label: String,
    val shortcut: String = "",
    val disabled: Boolean = false,
) {
    init {
        require(value.isNotBlank()) { "GUI menu item value must not be blank" }
        require(label.isNotBlank()) { "GUI menu item label must not be blank" }
    }
}

/**
 * Optional adapter-level context position relative to the trigger anchor.
 * This keeps pointer coordinates out of the renderer-neutral component contract.
 */
data class GuiMenuContextOffset(
    val x: Int,
    val y: Int,
)

private fun GuiVisualPartStyle.menuOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.menuTextStyle(fallback: GuiVisualPartStyle? = null): TextStyle {
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

private class GuiMenuPopupPositionProvider(
    private val gapPx: Int,
    private val marginPx: Int,
    private val contextOffset: GuiMenuContextOffset?,
) : PopupPositionProvider {
    override fun calculatePosition(
        anchorBounds: IntRect,
        windowSize: IntSize,
        layoutDirection: LayoutDirection,
        popupContentSize: IntSize,
    ): IntOffset {
        val desired = if (contextOffset != null) {
            IntOffset(
                x = anchorBounds.left + contextOffset.x,
                y = anchorBounds.top + contextOffset.y,
            )
        } else {
            val preferredX = when (layoutDirection) {
                LayoutDirection.Ltr -> anchorBounds.left
                LayoutDirection.Rtl -> anchorBounds.right - popupContentSize.width
            }
            val below = anchorBounds.bottom + gapPx
            val above = anchorBounds.top - popupContentSize.height - gapPx
            val y = if (below + popupContentSize.height <= windowSize.height - marginPx) below else above
            IntOffset(preferredX, y)
        }

        val maxX = (windowSize.width - marginPx - popupContentSize.width).coerceAtLeast(marginPx)
        val maxY = (windowSize.height - marginPx - popupContentSize.height).coerceAtLeast(marginPx)
        return IntOffset(
            x = desired.x.coerceIn(marginPx, maxX),
            y = desired.y.coerceIn(marginPx, maxY),
        )
    }
}

private fun Modifier.menuOutline(outline: GuiVisualOutline?): Modifier {
    if (outline == null) return this
    return border(
        width = outline.width.toComposeDp(),
        color = outline.color.toComposeColor(),
        shape = RoundedCornerShape(outline.offset.toComposeDp()),
    )
}

/**
 * Controlled Foundation-only Menu / Context Menu mapped from the neutral Menu contract.
 *
 * The host owns [open]. The adapter owns temporary roving focus and keyboard navigation.
 * Passing [contextOffset] switches placement from trigger-anchored dropdown behavior to
 * context-menu placement while preserving the same neutral component and item contract.
 */
@Composable
fun GuiMenu(
    open: Boolean,
    items: List<GuiMenuItem>,
    onOpenChange: (Boolean) -> Unit,
    onActivate: (String) -> Unit,
    modifier: Modifier = Modifier,
    accessibilityLabel: String = "",
    disabled: Boolean = false,
    variant: GuiMenuVariant = GuiMenuVariant.STANDARD,
    size: GuiMenuSize = GuiMenuSize.MEDIUM,
    contextOffset: GuiMenuContextOffset? = null,
    trigger: (@Composable (MutableInteractionSource) -> Unit)? = null,
) {
    val selection = LocalGuiThemeSelection.current
    val triggerSource = remember { MutableInteractionSource() }
    val enabledItems = items.filterNot { it.disabled }
    var activeIndex by remember(items) { mutableIntStateOf(0) }
    val focusRequesters = remember(enabledItems.map { it.value }) {
        List(enabledItems.size) { FocusRequester() }
    }

    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "menu",
    ) ?: error(
        "No Compose visual recipe for menu with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiMenuContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "menu",
    )
    val rootResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = buildSet {
            if (open && !disabled) add("expanded")
            if (disabled) add("disabled")
        },
        statePriority = GuiMenuState.entries.map { it.wireValue },
    )
    val popupStyle = rootResolved["popup"] ?: error("Resolved GUI menu visual is missing required popup part")
    val popupRadius = popupStyle.radius?.toComposeDp() ?: 0.dp
    val popupShape = RoundedCornerShape(popupRadius)
    val density = LocalDensity.current
    val positionProvider = remember(contextOffset, density.density) {
        GuiMenuPopupPositionProvider(
            gapPx = with(density) { 4.dp.roundToPx() },
            marginPx = with(density) { 4.dp.roundToPx() },
            contextOffset = contextOffset,
        )
    }

    fun moveActive(delta: Int, edge: Int? = null) {
        if (enabledItems.isEmpty()) return
        activeIndex = when (edge) {
            0 -> 0
            1 -> enabledItems.lastIndex
            else -> (activeIndex + delta + enabledItems.size) % enabledItems.size
        }
        focusRequesters.getOrNull(activeIndex)?.requestFocus()
    }

    fun activateActive() {
        val item = enabledItems.getOrNull(activeIndex) ?: return
        onActivate(item.value)
        onOpenChange(false)
    }

    LaunchedEffect(open, enabledItems.size) {
        if (open && !disabled && enabledItems.isNotEmpty()) {
            activeIndex = activeIndex.coerceIn(0, enabledItems.lastIndex)
            focusRequesters[activeIndex].requestFocus()
        }
    }

    Column(modifier = modifier) {
        if (trigger != null) trigger(triggerSource)

        if (open && !disabled) {
            Popup(
                popupPositionProvider = positionProvider,
                onDismissRequest = { onOpenChange(false) },
                properties = PopupProperties(focusable = true),
            ) {
                var popupModifier = Modifier
                    .clip(popupShape)
                    .alpha(popupStyle.menuOpacity())
                    .verticalScroll(rememberScrollState())
                    .onPreviewKeyEvent { event ->
                        if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                        when (event.key) {
                            Key.DirectionDown -> { moveActive(1); true }
                            Key.DirectionUp -> { moveActive(-1); true }
                            Key.MoveHome -> { moveActive(0, edge = 0); true }
                            Key.MoveEnd -> { moveActive(0, edge = 1); true }
                            Key.Enter, Key.NumPadEnter, Key.Spacebar -> { activateActive(); true }
                            Key.Escape -> { onOpenChange(false); true }
                            else -> false
                        }
                    }
                popupStyle.fill?.let { popupModifier = popupModifier.background(it.toComposeColor(), popupShape) }
                popupStyle.border?.let {
                    popupModifier = popupModifier.border(
                        width = it.width.toComposeDp(),
                        color = it.color.toComposeColor(),
                        shape = popupShape,
                    )
                }
                if (accessibilityLabel.isNotBlank()) {
                    popupModifier = popupModifier.semantics { contentDescription = accessibilityLabel }
                }
                popupModifier = popupModifier.padding(
                    vertical = popupStyle.paddingVertical?.toComposeDp() ?: 0.dp,
                )

                Column(modifier = popupModifier) {
                    var enabledIndex = 0
                    items.forEach { item ->
                        val requester = if (!item.disabled) focusRequesters.getOrNull(enabledIndex++) else null
                        GuiMenuItemRow(
                            item = item,
                            recipe = recipe,
                            variant = variant,
                            size = size,
                            requester = requester,
                            active = !item.disabled && enabledItems.getOrNull(activeIndex)?.value == item.value,
                            onFocus = {
                                val index = enabledItems.indexOfFirst { it.value == item.value }
                                if (index >= 0) activeIndex = index
                            },
                            onActivate = {
                                onActivate(item.value)
                                onOpenChange(false)
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GuiMenuItemRow(
    item: GuiMenuItem,
    recipe: gui.framework.generated.internal.GuiVisualRecipe,
    variant: GuiMenuVariant,
    size: GuiMenuSize,
    requester: FocusRequester?,
    active: Boolean,
    onFocus: () -> Unit,
    onActivate: () -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = buildSet {
            if (hovered && !item.disabled) add("hover")
            if ((focused || active) && !item.disabled) add("focus")
            if (item.disabled) add("disabled")
        },
        statePriority = GuiMenuState.entries.map { it.wireValue },
    )
    val itemStyle = resolved["item"] ?: error("Resolved GUI menu visual is missing required item part")
    val labelStyle = resolved["label"] ?: itemStyle
    val shortcutStyle = resolved["shortcut"] ?: labelStyle
    val radius = itemStyle.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    var rowModifier = Modifier
        .fillMaxWidth()
        .defaultMinSize(
            minWidth = itemStyle.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = itemStyle.minHeight?.toComposeDp() ?: 0.dp,
        )
        .clip(shape)
        .alpha(itemStyle.menuOpacity())
        .hoverable(source, enabled = !item.disabled)
        .clickable(
            interactionSource = source,
            indication = null,
            enabled = !item.disabled,
            onClick = onActivate,
        )
        .focusable(enabled = !item.disabled, interactionSource = source)
        .menuOutline(itemStyle.outline)
        .padding(
            horizontal = itemStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = itemStyle.paddingVertical?.toComposeDp() ?: 0.dp,
        )
    if (requester != null) rowModifier = rowModifier.focusRequester(requester)
    if (item.disabled) rowModifier = rowModifier.semantics { disabled() }

    LaunchedEffect(focused) {
        if (focused) onFocus()
    }

    Row(
        modifier = rowModifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        BasicText(text = item.label, style = labelStyle.menuTextStyle(itemStyle))
        if (item.shortcut.isNotBlank()) {
            Spacer(Modifier.width(itemStyle.gap?.toComposeDp() ?: 0.dp).weight(1f))
            BasicText(text = item.shortcut, style = shortcutStyle.menuTextStyle(itemStyle))
        }
    }
}
