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
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
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
import gui.framework.generated.internal.GuiTabsContract
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiTabsState
import gui.framework.generated.internal.GuiTabsVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

/** One controlled Tabs item. Item-level disablement is adapter data, like Select options. */
data class GuiTabItem(
    val value: String,
    val label: String,
    val disabled: Boolean = false,
) {
    init {
        require(label.isNotBlank()) { "GUI tab label must not be blank" }
    }
}

private fun GuiVisualPartStyle.tabsOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.tabsTextStyle(): TextStyle {
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
        color = foreground?.toComposeColor() ?: Color.Unspecified,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

private fun Modifier.guiTabsFocusOutline(
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

private fun Modifier.guiTabsIndicator(
    indicator: GuiVisualPartStyle,
    selected: Boolean,
): Modifier {
    if (!selected || indicator.fill == null) return this
    return drawWithContent {
        drawContent()
        val height = indicator.minHeight?.toComposeDp()?.toPx() ?: 0f
        if (height <= 0f) return@drawWithContent
        drawRect(
            color = indicator.fill!!.toComposeColor(),
            topLeft = Offset(0f, size.height - height.coerceAtMost(size.height)),
            size = Size(size.width, height.coerceAtMost(size.height)),
        )
    }
}

private fun nextEnabledIndex(
    tabs: List<GuiTabItem>,
    currentIndex: Int,
    direction: Int,
    globallyDisabled: Boolean,
): Int? {
    if (globallyDisabled || tabs.isEmpty()) return null
    for (step in 1..tabs.size) {
        val candidate = (currentIndex + direction * step).mod(tabs.size)
        if (!tabs[candidate].disabled) return candidate
    }
    return null
}

private fun edgeEnabledIndex(
    tabs: List<GuiTabItem>,
    fromStart: Boolean,
    globallyDisabled: Boolean,
): Int? {
    if (globallyDisabled) return null
    val indices = if (fromStart) tabs.indices else tabs.indices.reversed()
    return indices.firstOrNull { !tabs[it].disabled }
}

/**
 * Foundation-only controlled Tabs.
 *
 * Keyboard behavior intentionally uses manual activation: Left/Right/Home/End move focus
 * without changing [value]. Enter/Space activation is provided by the native selectable tab.
 * This avoids loading expensive panels merely because keyboard focus moved.
 */
@Composable
fun GuiTabs(
    value: String,
    tabs: List<GuiTabItem>,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    accessibilityLabel: String = "",
    variant: GuiTabsVariant = GuiTabsVariant.STANDARD,
    size: GuiTabsSize = GuiTabsSize.MEDIUM,
    disabled: Boolean = false,
    panelContent: @Composable (GuiTabItem) -> Unit,
) {
    require(tabs.map { it.value }.toSet().size == tabs.size) { "GUI tab values must be unique" }

    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "tabs",
    ) ?: error(
        "No Compose visual recipe for tabs with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiTabsContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "tabs",
    )

    val containerStates = if (disabled) setOf("disabled") else emptySet()
    val containerResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = containerStates,
        statePriority = GuiTabsState.entries.map { it.wireValue },
    )
    val root = containerResolved["root"] ?: error("Resolved GUI tabs visual is missing required root part")
    val tabList = containerResolved["tabList"] ?: error("Resolved GUI tabs visual is missing required tabList part")
    val panel = containerResolved["panel"] ?: error("Resolved GUI tabs visual is missing required panel part")
    val focusRequesters = remember(tabs.map { it.value }) { List(tabs.size) { FocusRequester() } }

    val rootModifier = modifier.alpha(root.tabsOpacity())
    val tabListModifierBase = Modifier
        .then(
            if (accessibilityLabel.isBlank()) Modifier else Modifier.semantics {
                contentDescription = accessibilityLabel
            },
        )
        .selectableGroup()
    var tabListModifier = tabListModifierBase
    tabList.border?.let {
        tabListModifier = tabListModifier.border(it.width.toComposeDp(), it.color.toComposeColor())
    }
    tabListModifier = tabListModifier.padding(
        horizontal = tabList.paddingHorizontal?.toComposeDp() ?: 0.dp,
        vertical = tabList.paddingVertical?.toComposeDp() ?: 0.dp,
    )

    Column(modifier = rootModifier) {
        Row(modifier = tabListModifier) {
            tabs.forEachIndexed { index, item ->
                key(item.value) {
                    val source = remember { MutableInteractionSource() }
                    val pressed by source.collectIsPressedAsState()
                    val hovered by source.collectIsHoveredAsState()
                    val focused by source.collectIsFocusedAsState()
                    val selected = item.value == value
                    val enabled = !disabled && !item.disabled
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
                        statePriority = GuiTabsState.entries.map { it.wireValue },
                    )
                    val tab = resolved["tab"] ?: error("Resolved GUI tabs visual is missing required tab part")
                    val indicator = resolved["indicator"] ?: error("Resolved GUI tabs visual is missing required indicator part")
                    val disabledCompositeRoot = resolved["root"] ?: root
                    val radius = tab.radius?.toComposeDp() ?: 0.dp
                    val shape = RoundedCornerShape(radius)

                    var tabModifier = Modifier
                        .defaultMinSize(
                            minWidth = tab.minWidth?.toComposeDp() ?: 0.dp,
                            minHeight = tab.minHeight?.toComposeDp() ?: 0.dp,
                        )
                        .clip(shape)
                    tab.fill?.let { tabModifier = tabModifier.background(it.toComposeColor(), shape) }
                    tab.border?.let {
                        tabModifier = tabModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
                    }
                    val tabOpacity = if (item.disabled && !disabled) {
                        disabledCompositeRoot.tabsOpacity()
                    } else {
                        tab.tabsOpacity()
                    }
                    tabModifier = tabModifier
                        .alpha(tabOpacity)
                        .guiTabsIndicator(indicator, selected)
                        .guiTabsFocusOutline(tab.outline, radius)
                        .focusRequester(focusRequesters[index])
                        .hoverable(interactionSource = source, enabled = enabled)
                        .onPreviewKeyEvent { event ->
                            if (!enabled || event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                            val target = when (event.key) {
                                Key.DirectionRight -> nextEnabledIndex(tabs, index, 1, disabled)
                                Key.DirectionLeft -> nextEnabledIndex(tabs, index, -1, disabled)
                                Key.MoveHome, Key.NumPadMoveHome -> edgeEnabledIndex(tabs, true, disabled)
                                Key.MoveEnd, Key.NumPadMoveEnd -> edgeEnabledIndex(tabs, false, disabled)
                                else -> null
                            }
                            if (target == null) return@onPreviewKeyEvent false
                            focusRequesters[target].requestFocus()
                            true
                        }
                        .selectable(
                            selected = selected,
                            interactionSource = source,
                            indication = null,
                            enabled = enabled,
                            role = Role.Tab,
                            onClick = { if (!selected) onValueChange(item.value) },
                        )
                        .padding(
                            horizontal = tab.paddingHorizontal?.toComposeDp() ?: 0.dp,
                            vertical = tab.paddingVertical?.toComposeDp() ?: 0.dp,
                        )

                    Box(modifier = tabModifier) {
                        BasicText(text = item.label, style = tab.tabsTextStyle())
                    }
                }
            }
        }

        tabs.firstOrNull { it.value == value }?.let { selectedItem ->
            var panelModifier = Modifier
                .defaultMinSize(
                    minWidth = panel.minWidth?.toComposeDp() ?: 0.dp,
                    minHeight = panel.minHeight?.toComposeDp() ?: 0.dp,
                )
            val panelRadius = panel.radius?.toComposeDp() ?: 0.dp
            val panelShape = RoundedCornerShape(panelRadius)
            panelModifier = panelModifier.clip(panelShape)
            panel.fill?.let { panelModifier = panelModifier.background(it.toComposeColor(), panelShape) }
            panel.border?.let {
                panelModifier = panelModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), panelShape)
            }
            panelModifier = panelModifier
                .alpha(panel.tabsOpacity())
                .padding(
                    horizontal = panel.paddingHorizontal?.toComposeDp() ?: 0.dp,
                    vertical = panel.paddingVertical?.toComposeDp() ?: 0.dp,
                )
            Box(modifier = panelModifier) {
                panelContent(selectedItem)
            }
        }
    }
}
