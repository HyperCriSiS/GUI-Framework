// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.collapse
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.expand
import androidx.compose.ui.semantics.selected
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
import gui.framework.generated.internal.GuiTreeContract
import gui.framework.generated.internal.GuiTreeSize
import gui.framework.generated.internal.GuiTreeState
import gui.framework.generated.internal.GuiTreeVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRecipe
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

/** One caller-owned hierarchy node. Expansion remains controlled through [expanded]. */
data class GuiTreeItem(
    val value: String,
    val label: String = "",
    val icon: String = "",
    val accessibilityLabel: String = "",
    val expanded: Boolean = false,
    val branch: Boolean = false,
    val disabled: Boolean = false,
    val children: List<GuiTreeItem> = emptyList(),
) {
    init {
        require(value.isNotBlank()) { "GUI tree item value must not be blank" }
        require(label.isNotBlank() || accessibilityLabel.isNotBlank()) {
            "GUI tree item requires a label or accessibilityLabel"
        }
    }

    val isBranch: Boolean get() = branch || children.isNotEmpty()
}

private data class GuiFlatTreeNode(
    val item: GuiTreeItem,
    val parentValue: String?,
)

private class GuiTreeClickTracker {
    private var lastValue: String? = null
    private var lastClickNanos: Long = 0L

    fun register(value: String, nowNanos: Long, timeoutMillis: Long): Boolean {
        val elapsedMillis = if (lastClickNanos == 0L) Long.MAX_VALUE else (nowNanos - lastClickNanos) / 1_000_000L
        val activate = lastValue == value && elapsedMillis > 0L && elapsedMillis <= timeoutMillis
        if (activate) {
            lastValue = null
            lastClickNanos = 0L
        } else {
            lastValue = value
            lastClickNanos = nowNanos
        }
        return activate
    }
}

private fun flattenTree(items: List<GuiTreeItem>, parentValue: String? = null): List<GuiFlatTreeNode> = buildList {
    items.forEach { item ->
        add(GuiFlatTreeNode(item, parentValue))
        addAll(flattenTree(item.children, item.value))
    }
}

private fun flattenVisibleTree(items: List<GuiTreeItem>, parentValue: String? = null): List<GuiFlatTreeNode> = buildList {
    items.forEach { item ->
        add(GuiFlatTreeNode(item, parentValue))
        if (item.isBranch && item.expanded) addAll(flattenVisibleTree(item.children, item.value))
    }
}

private fun GuiVisualPartStyle.treeOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.treeTextStyle(fallbackColor: Color): TextStyle {
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

private fun Modifier.guiTreeFocusOutline(outline: GuiVisualOutline?, radius: Dp): Modifier {
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

private fun Modifier.applyTreeBox(style: GuiVisualPartStyle): Modifier {
    val radius = style.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)
    var result = this.defaultMinSize(
        minWidth = style.minWidth?.toComposeDp() ?: 0.dp,
        minHeight = style.minHeight?.toComposeDp() ?: 0.dp,
    )
    if (radius > 0.dp) result = result.clip(shape)
    style.fill?.let { result = result.background(it.toComposeColor(), shape) }
    style.border?.let { result = result.border(it.width.toComposeDp(), it.color.toComposeColor(), shape) }
    return result.alpha(style.treeOpacity())
}

@Composable
private fun GuiTreeNodeContent(
    item: GuiTreeItem,
    value: String,
    globallyDisabled: Boolean,
    variant: GuiTreeVariant,
    size: GuiTreeSize,
    recipe: GuiVisualRecipe,
    visibleIndexByValue: Map<String, Int>,
    rovingValue: String?,
    requester: FocusRequester,
    requesters: Map<String, FocusRequester>,
    parentByValue: Map<String, String?>,
    enabledVisibleValues: List<String>,
    onFocused: (String) -> Unit,
    onRequestFocus: (String) -> Unit,
    onValueChange: (String) -> Unit,
    onExpandedChange: (String) -> Unit,
    onNodeActivate: (String) -> Unit,
    onRowClick: (String) -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val pressed by source.collectIsPressedAsState()
    val enabled = !globallyDisabled && !item.disabled
    val isSelected = item.value == value
    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (pressed && enabled) add("pressed")
        if (isSelected) add("selected")
        if (item.isBranch && item.expanded) add("expanded")
        if (!enabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiTreeState.entries.map { it.wireValue },
    )
    val rootStyle = resolved["root"] ?: error("Resolved GUI tree visual is missing required root part")
    val itemStyle = resolved["item"] ?: error("Resolved GUI tree visual is missing required item part")
    val disclosureStyle = resolved["disclosure"] ?: error("Resolved GUI tree visual is missing required disclosure part")
    val iconStyle = resolved["icon"] ?: error("Resolved GUI tree visual is missing required icon part")
    val labelStyle = resolved["label"] ?: error("Resolved GUI tree visual is missing required label part")
    val groupStyle = resolved["group"] ?: error("Resolved GUI tree visual is missing required group part")
    val radius = itemStyle.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    fun moveFocus(target: String?) {
        if (target != null && target in enabledVisibleValues) onRequestFocus(target)
    }

    fun moveRelative(delta: Int) {
        val index = enabledVisibleValues.indexOf(item.value)
        if (index < 0) return
        val targetIndex = (index + delta).coerceIn(0, enabledVisibleValues.lastIndex)
        moveFocus(enabledVisibleValues[targetIndex])
    }

    var rowModifier = Modifier
        .fillMaxWidth()
        .defaultMinSize(
            minWidth = itemStyle.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = itemStyle.minHeight?.toComposeDp() ?: 0.dp,
        )
        .then(if (radius > 0.dp) Modifier.clip(shape) else Modifier)
    itemStyle.fill?.let { rowModifier = rowModifier.background(it.toComposeColor(), shape) }
    itemStyle.border?.let { rowModifier = rowModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape) }
    rowModifier = rowModifier
        .alpha(itemStyle.treeOpacity())
        .guiTreeFocusOutline(itemStyle.outline, radius)
        .hoverable(source, enabled = enabled)
        .clickable(
            interactionSource = source,
            indication = null,
            enabled = enabled,
            onClick = { onRowClick(item.value) },
        )
        .focusRequester(requester)
        .focusProperties { canFocus = enabled && rovingValue == item.value }
        .onFocusChanged { if (it.isFocused) onFocused(item.value) }
        .focusable(enabled = enabled, interactionSource = source)
        .onPreviewKeyEvent { event ->
            if (!enabled || event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
            when (event.key) {
                Key.DirectionDown -> { moveRelative(1); true }
                Key.DirectionUp -> { moveRelative(-1); true }
                Key.MoveHome -> { moveFocus(enabledVisibleValues.firstOrNull()); true }
                Key.MoveEnd -> { moveFocus(enabledVisibleValues.lastOrNull()); true }
                Key.DirectionRight -> {
                    if (!item.isBranch) false
                    else if (!item.expanded) { onExpandedChange(item.value); true }
                    else {
                        val child = item.children.firstOrNull { !globallyDisabled && !it.disabled }
                        if (child != null) moveFocus(child.value)
                        true
                    }
                }
                Key.DirectionLeft -> {
                    if (item.isBranch && item.expanded) { onExpandedChange(item.value); true }
                    else {
                        val parent = parentByValue[item.value]
                        if (parent != null) { moveFocus(parent); true } else false
                    }
                }
                Key.Spacebar -> { if (!isSelected) onValueChange(item.value); true }
                Key.Enter, Key.NumPadEnter -> { onNodeActivate(item.value); true }
                else -> false
            }
        }
        .semantics(mergeDescendants = true) {
            selected = isSelected
            collectionItemInfo = CollectionItemInfo(
                rowIndex = visibleIndexByValue.getValue(item.value),
                rowSpan = 1,
                columnIndex = 0,
                columnSpan = 1,
            )
            if (item.accessibilityLabel.isNotBlank()) contentDescription = item.accessibilityLabel
            if (!enabled) disabled()
            if (item.isBranch && enabled) {
                if (item.expanded) collapse(action = { onExpandedChange(item.value); true })
                else expand(action = { onExpandedChange(item.value); true })
            }
        }
        .padding(
            horizontal = itemStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = itemStyle.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    val fallbackColor = itemStyle.foreground?.toComposeColor()
        ?: rootStyle.foreground?.toComposeColor()
        ?: Color.Unspecified
    val gap = itemStyle.gap?.toComposeDp() ?: 0.dp

    Column {
        Row(
            modifier = rowModifier,
            horizontalArrangement = Arrangement.spacedBy(gap),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .defaultMinSize(
                        minWidth = disclosureStyle.minWidth?.toComposeDp() ?: 0.dp,
                        minHeight = disclosureStyle.minHeight?.toComposeDp() ?: 0.dp,
                    )
                    .pointerInput(item.value, item.expanded, enabled, item.isBranch) {
                        if (enabled && item.isBranch) detectTapGestures(onTap = { onExpandedChange(item.value) })
                    },
                contentAlignment = Alignment.Center,
            ) {
                BasicText(
                    text = if (!item.isBranch) "" else if (item.expanded) "▾" else "▸",
                    style = disclosureStyle.treeTextStyle(fallbackColor),
                )
            }
            if (item.icon.isNotBlank()) BasicText(item.icon, style = iconStyle.treeTextStyle(fallbackColor))
            if (item.label.isNotBlank()) {
                BasicText(
                    text = item.label,
                    modifier = Modifier.weight(1f),
                    style = labelStyle.treeTextStyle(fallbackColor),
                )
            }
        }
        if (item.isBranch && item.expanded && item.children.isNotEmpty()) {
            Column(
                modifier = Modifier.padding(
                    horizontal = groupStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
                    vertical = groupStyle.paddingVertical?.toComposeDp() ?: 0.dp,
                ),
            ) {
                item.children.forEach { child ->
                    key(child.value) {
                        GuiTreeNodeContent(
                            item = child,
                            value = value,
                            globallyDisabled = globallyDisabled,
                            variant = variant,
                            size = size,
                            recipe = recipe,
                            visibleIndexByValue = visibleIndexByValue,
                            rovingValue = rovingValue,
                            requester = requesters.getValue(child.value),
                            requesters = requesters,
                            parentByValue = parentByValue,
                            enabledVisibleValues = enabledVisibleValues,
                            onFocused = onFocused,
                            onRequestFocus = onRequestFocus,
                            onValueChange = onValueChange,
                            onExpandedChange = onExpandedChange,
                            onNodeActivate = onNodeActivate,
                            onRowClick = onRowClick,
                        )
                    }
                }
            }
        }
    }
}

/**
 * Foundation-only controlled Tree / Hierarchy primitive.
 *
 * Selection and expansion remain caller-owned. Up/Down/Home/End move roving focus across visible
 * enabled nodes, Right expands or enters a branch, Left collapses or returns to the parent, Space
 * requests selection, and Enter activates. Expansion is immediate and never implicitly animated.
 */
@Composable
fun GuiTree(
    value: String,
    items: List<GuiTreeItem>,
    onValueChange: (String) -> Unit,
    onExpandedChange: (String) -> Unit,
    onNodeActivate: (String) -> Unit,
    modifier: Modifier = Modifier,
    accessibilityLabel: String = "",
    variant: GuiTreeVariant = GuiTreeVariant.STANDARD,
    size: GuiTreeSize = GuiTreeSize.MEDIUM,
    disabled: Boolean = false,
) {
    val allNodes = flattenTree(items)
    require(allNodes.map { it.item.value }.toSet().size == allNodes.size) { "GUI tree item values must be unique" }

    val visibleNodes = flattenVisibleTree(items)
    val visibleIndexByValue = visibleNodes.mapIndexed { index, node -> node.item.value to index }.toMap()
    val enabledVisibleValues = visibleNodes.filterNot { disabled || it.item.disabled }.map { it.item.value }
    val allValues = allNodes.map { it.item.value }
    val parentByValue = allNodes.associate { it.item.value to it.parentValue }
    val requesters = remember(allValues) { allValues.associateWith { FocusRequester() } }
    var rovingValue by remember(allValues) {
        mutableStateOf(enabledVisibleValues.firstOrNull { it == value } ?: enabledVisibleValues.firstOrNull())
    }
    var pendingFocusValue by remember(allValues) { mutableStateOf<String?>(null) }

    LaunchedEffect(enabledVisibleValues, value) {
        if (rovingValue !in enabledVisibleValues) {
            rovingValue = enabledVisibleValues.firstOrNull { it == value } ?: enabledVisibleValues.firstOrNull()
        }
    }
    LaunchedEffect(pendingFocusValue) {
        val target = pendingFocusValue ?: return@LaunchedEffect
        requesters[target]?.requestFocus()
        pendingFocusValue = null
    }

    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "tree",
    ) ?: error("No Compose visual recipe for tree with theme ${selection.theme.wireValue} and palette ${selection.paletteId}")
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiTreeContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "tree",
    )
    val rootResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = if (disabled) setOf("disabled") else emptySet(),
        statePriority = GuiTreeState.entries.map { it.wireValue },
    )
    val rootStyle = rootResolved["root"] ?: error("Resolved GUI tree visual is missing required root part")
    val clickTracker = remember { GuiTreeClickTracker() }
    val viewConfiguration = LocalViewConfiguration.current

    fun requestFocus(target: String) {
        if (target !in enabledVisibleValues) return
        rovingValue = target
        pendingFocusValue = target
    }

    fun rowClick(itemValue: String) {
        rovingValue = itemValue
        val activate = clickTracker.register(
            value = itemValue,
            nowNanos = System.nanoTime(),
            timeoutMillis = viewConfiguration.doubleTapTimeoutMillis,
        )
        if (activate) onNodeActivate(itemValue)
        else if (itemValue != value) onValueChange(itemValue)
    }

    var rootModifier = modifier
        .fillMaxWidth()
        .semantics {
            collectionInfo = CollectionInfo(rowCount = visibleNodes.size, columnCount = 1)
            if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
            if (disabled) disabled()
        }
        .applyTreeBox(rootStyle)
        .padding(
            horizontal = rootStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = rootStyle.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    Column(modifier = rootModifier) {
        items.forEach { item ->
            key(item.value) {
                GuiTreeNodeContent(
                    item = item,
                    value = value,
                    globallyDisabled = disabled,
                    variant = variant,
                    size = size,
                    recipe = recipe,
                    visibleIndexByValue = visibleIndexByValue,
                    rovingValue = rovingValue,
                    requester = requesters.getValue(item.value),
                    requesters = requesters,
                    parentByValue = parentByValue,
                    enabledVisibleValues = enabledVisibleValues,
                    onFocused = { rovingValue = it },
                    onRequestFocus = ::requestFocus,
                    onValueChange = onValueChange,
                    onExpandedChange = onExpandedChange,
                    onNodeActivate = onNodeActivate,
                    onRowClick = ::rowClick,
                )
            }
        }
    }
}
