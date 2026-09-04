// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.heading
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
import gui.framework.generated.internal.GuiDataGridContract
import gui.framework.generated.internal.GuiDataGridSize
import gui.framework.generated.internal.GuiDataGridState
import gui.framework.generated.internal.GuiDataGridVariant
import gui.framework.generated.internal.GuiComponentCapabilities
import gui.framework.generated.internal.GuiTableContract
import gui.framework.generated.internal.GuiTableSize
import gui.framework.generated.internal.GuiTableState
import gui.framework.generated.internal.GuiTableVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRecipe
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

/** Passive table column metadata used by the Foundation Compose adapter. */
data class GuiTableColumn(val label: String) {
    init { require(label.isNotBlank()) { "GUI table column label must not be blank" } }
}

/** Passive table row. Cell count must match the table column count. */
data class GuiTableRow(val cells: List<String>)

/** Interactive row-selection grid column metadata. */
data class GuiDataGridColumn(val label: String) {
    init { require(label.isNotBlank()) { "GUI data-grid column label must not be blank" } }
}

/** One controlled Data Grid row. */
data class GuiDataGridRow(
    val value: String,
    val cells: List<String>,
    val accessibilityLabel: String = "",
    val disabled: Boolean = false,
) {
    init { require(value.isNotBlank()) { "GUI data-grid row value must not be blank" } }
}

private fun GuiVisualPartStyle.tableOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.tableTextStyle(fallbackColor: Color): TextStyle {
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

private fun Modifier.guiTableOutline(style: GuiVisualPartStyle, radius: Dp): Modifier {
    val outline = style.outline ?: return this
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

private fun Modifier.guiTableInteriorLines(
    style: GuiVisualPartStyle,
    drawStart: Boolean = false,
    drawTop: Boolean = false,
    drawBottom: Boolean = false,
): Modifier {
    val border = style.border ?: return this
    if (!drawStart && !drawTop && !drawBottom) return this
    return drawWithContent {
        drawContent()
        val width = border.width.toComposeDp().toPx()
        if (width <= 0f) return@drawWithContent
        val color = border.color.toComposeColor()
        val half = width / 2f
        if (drawStart) drawLine(color, Offset(half, 0f), Offset(half, size.height), width)
        if (drawTop) drawLine(color, Offset(0f, half), Offset(size.width, half), width)
        if (drawBottom) drawLine(color, Offset(0f, size.height - half), Offset(size.width, size.height - half), width)
    }
}

private fun Modifier.guiGridSelectionIndicator(style: GuiVisualPartStyle, selected: Boolean): Modifier {
    if (!selected || style.fill == null) return this
    return drawWithContent {
        drawContent()
        val width = style.minWidth?.toComposeDp()?.toPx() ?: 0f
        if (width > 0f) drawRect(style.fill!!.toComposeColor(), topLeft = Offset.Zero, size = Size(width, size.height))
    }
}

private fun Modifier.applyTableBox(style: GuiVisualPartStyle): Modifier {
    val radius = style.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)
    var result = this.defaultMinSize(
        minWidth = style.minWidth?.toComposeDp() ?: 0.dp,
        minHeight = style.minHeight?.toComposeDp() ?: 0.dp,
    )
    if (radius > 0.dp) result = result.clip(shape)
    style.fill?.let { result = result.background(it.toComposeColor(), shape) }
    style.border?.let { result = result.border(it.width.toComposeDp(), it.color.toComposeColor(), shape) }
    return result.alpha(style.tableOpacity())
}

@Composable
private fun resolveTableRecipe(componentId: String, contractCapabilities: GuiComponentCapabilities): GuiVisualRecipe {
    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = componentId,
    ) ?: error("No Compose visual recipe for $componentId with theme ${selection.theme.wireValue} and palette ${selection.paletteId}")
    return resolveGuiCapabilityRecipe(
        capabilities = contractCapabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = componentId,
    )
}

/**
 * Foundation-only passive Table. It intentionally has no selection or activation behavior;
 * collection semantics describe the tabular structure to accessibility services.
 */
@Composable
fun GuiTable(
    columns: List<GuiTableColumn>,
    rows: List<GuiTableRow>,
    modifier: Modifier = Modifier,
    caption: String = "",
    accessibilityLabel: String = "",
    variant: GuiTableVariant = GuiTableVariant.PLAIN,
    size: GuiTableSize = GuiTableSize.MEDIUM,
) {
    require(columns.isNotEmpty()) { "GUI table requires at least one column" }
    require(rows.all { it.cells.size == columns.size }) { "GUI table row cell count must match column count" }
    val recipe = resolveTableRecipe("table", GuiTableContract.capabilities)
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet(),
        statePriority = GuiTableState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI table visual is missing required root part")
    val captionStyle = resolved["caption"] ?: error("Resolved GUI table visual is missing caption part")
    val header = resolved["header"] ?: error("Resolved GUI table visual is missing required header part")
    val headerCell = resolved["headerCell"] ?: error("Resolved GUI table visual is missing required headerCell part")
    val cell = resolved["cell"] ?: error("Resolved GUI table visual is missing required cell part")
    val rootColor = root.foreground?.toComposeColor() ?: Color.Unspecified

    var rootModifier = modifier
        .fillMaxWidth()
        .semantics {
            collectionInfo = CollectionInfo(rowCount = rows.size + 1, columnCount = columns.size)
            if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
        }
        .applyTableBox(root)

    Column(modifier = rootModifier) {
        if (caption.isNotBlank()) {
            BasicText(
                text = caption,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        horizontal = captionStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
                        vertical = captionStyle.paddingVertical?.toComposeDp() ?: 0.dp,
                    ),
                style = captionStyle.tableTextStyle(rootColor),
            )
        }
        Row(modifier = Modifier.fillMaxWidth().applyTableBox(header)) {
            columns.forEachIndexed { columnIndex, column ->
                var cellModifier = Modifier
                    .weight(1f)
                    .defaultMinSize(minHeight = headerCell.minHeight?.toComposeDp() ?: 0.dp)
                    .semantics {
                        heading()
                        collectionItemInfo = CollectionItemInfo(
                            rowIndex = 0,
                            rowSpan = 1,
                            columnIndex = columnIndex,
                            columnSpan = 1,
                        )
                    }
                    .guiTableInteriorLines(
                        style = headerCell,
                        drawStart = variant == GuiTableVariant.GRIDLINED && columnIndex > 0,
                        drawBottom = variant == GuiTableVariant.PLAIN,
                    )
                    .padding(
                        horizontal = headerCell.paddingHorizontal?.toComposeDp() ?: 0.dp,
                        vertical = headerCell.paddingVertical?.toComposeDp() ?: 0.dp,
                    )
                headerCell.fill?.let { cellModifier = cellModifier.background(it.toComposeColor()) }
                BasicText(column.label, modifier = cellModifier, style = headerCell.tableTextStyle(rootColor))
            }
        }
        rows.forEachIndexed { rowIndex, row ->
            Row(modifier = Modifier.fillMaxWidth()) {
                row.cells.forEachIndexed { columnIndex, value ->
                    var cellModifier = Modifier
                        .weight(1f)
                        .defaultMinSize(minHeight = cell.minHeight?.toComposeDp() ?: 0.dp)
                        .semantics {
                            collectionItemInfo = CollectionItemInfo(
                                rowIndex = rowIndex + 1,
                                rowSpan = 1,
                                columnIndex = columnIndex,
                                columnSpan = 1,
                            )
                        }
                        .guiTableInteriorLines(
                            style = cell,
                            drawStart = variant == GuiTableVariant.GRIDLINED && columnIndex > 0,
                            drawTop = variant == GuiTableVariant.GRIDLINED,
                        )
                        .padding(
                            horizontal = cell.paddingHorizontal?.toComposeDp() ?: 0.dp,
                            vertical = cell.paddingVertical?.toComposeDp() ?: 0.dp,
                        )
                    cell.fill?.let { cellModifier = cellModifier.background(it.toComposeColor()) }
                    BasicText(value, modifier = cellModifier, style = cell.tableTextStyle(rootColor))
                }
            }
        }
    }
}

@Composable
private fun GuiDataGridRowContent(
    row: GuiDataGridRow,
    rowIndex: Int,
    columnCount: Int,
    selectedValue: String,
    globallyDisabled: Boolean,
    variant: GuiDataGridVariant,
    size: GuiDataGridSize,
    recipe: GuiVisualRecipe,
    requester: FocusRequester,
    onMoveFocus: (String, Int?) -> Unit,
    onValueChange: (String) -> Unit,
    onRowActivate: (String) -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val pressed by source.collectIsPressedAsState()
    val enabled = !globallyDisabled && !row.disabled
    val isSelected = enabled && row.value == selectedValue
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = buildSet {
            if (hovered && enabled) add("hover")
            if (focused && enabled) add("focus")
            if (pressed && enabled) add("pressed")
            if (isSelected) add("selected")
            if (!enabled) add("disabled")
        },
        statePriority = GuiDataGridState.entries.map { it.wireValue },
    )
    val rowStyle = resolved["row"] ?: error("Resolved GUI data-grid visual is missing required row part")
    val cellStyle = resolved["cell"] ?: error("Resolved GUI data-grid visual is missing required cell part")
    val indicator = resolved["selectionIndicator"] ?: error("Resolved GUI data-grid visual is missing selectionIndicator part")
    val root = resolved["root"] ?: error("Resolved GUI data-grid visual is missing required root part")
    val radius = rowStyle.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    var rowModifier = Modifier
        .fillMaxWidth()
        .defaultMinSize(minHeight = rowStyle.minHeight?.toComposeDp() ?: 0.dp)
        .then(if (radius > 0.dp) Modifier.clip(shape) else Modifier)
        .alpha(rowStyle.tableOpacity())
    rowStyle.fill?.let { rowModifier = rowModifier.background(it.toComposeColor(), shape) }
    rowStyle.border?.let { rowModifier = rowModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape) }
    rowModifier = rowModifier
        .guiGridSelectionIndicator(indicator, isSelected)
        .guiTableOutline(rowStyle, radius)
        .hoverable(source, enabled = enabled)
        .combinedClickable(
            interactionSource = source,
            indication = null,
            enabled = enabled,
            onClick = { if (!isSelected) onValueChange(row.value) },
            onDoubleClick = { onRowActivate(row.value) },
        )
        .focusable(enabled = enabled, interactionSource = source)
        .focusRequester(requester)
        .onPreviewKeyEvent { event ->
            if (!enabled || event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
            when (event.key) {
                Key.DirectionDown -> { onMoveFocus(row.value, 1); true }
                Key.DirectionUp -> { onMoveFocus(row.value, -1); true }
                Key.MoveHome -> { onMoveFocus(row.value, Int.MIN_VALUE); true }
                Key.MoveEnd -> { onMoveFocus(row.value, Int.MAX_VALUE); true }
                Key.Spacebar -> { if (!isSelected) onValueChange(row.value); true }
                Key.Enter, Key.NumPadEnter -> { onRowActivate(row.value); true }
                else -> false
            }
        }
        .semantics {
            collectionItemInfo = CollectionItemInfo(
                rowIndex = rowIndex + 1,
                rowSpan = 1,
                columnIndex = 0,
                columnSpan = columnCount,
            )
            selected = isSelected
            if (row.accessibilityLabel.isNotBlank()) contentDescription = row.accessibilityLabel
            if (!enabled) disabled()
        }
        .padding(
            horizontal = rowStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
            vertical = rowStyle.paddingVertical?.toComposeDp() ?: 0.dp,
        )

    Row(modifier = rowModifier) {
        row.cells.forEach { value ->
            var cellModifier = Modifier
                .weight(1f)
                .padding(
                    horizontal = cellStyle.paddingHorizontal?.toComposeDp() ?: 0.dp,
                    vertical = cellStyle.paddingVertical?.toComposeDp() ?: 0.dp,
                )
            cellStyle.fill?.let { cellModifier = cellModifier.background(it.toComposeColor()) }
            BasicText(
                text = value,
                modifier = cellModifier,
                style = cellStyle.tableTextStyle(root.foreground?.toComposeColor() ?: Color.Unspecified),
            )
        }
    }
}

/**
 * Foundation-only controlled row-selection Data Grid. Arrow/Home/End keys move focus without
 * mutating selection; Space requests selection and Enter/double-click emits row activation.
 */
@Composable
fun GuiDataGrid(
    value: String,
    columns: List<GuiDataGridColumn>,
    rows: List<GuiDataGridRow>,
    onValueChange: (String) -> Unit,
    onRowActivate: (String) -> Unit,
    modifier: Modifier = Modifier,
    accessibilityLabel: String = "",
    variant: GuiDataGridVariant = GuiDataGridVariant.ROW_SELECTION,
    size: GuiDataGridSize = GuiDataGridSize.MEDIUM,
    disabled: Boolean = false,
) {
    require(columns.isNotEmpty()) { "GUI data-grid requires at least one column" }
    require(rows.all { it.cells.size == columns.size }) { "GUI data-grid row cell count must match column count" }
    require(rows.map { it.value }.toSet().size == rows.size) { "GUI data-grid row values must be unique" }

    val recipe = resolveTableRecipe("data-grid", GuiDataGridContract.capabilities)
    val rootResolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = if (disabled) setOf("disabled") else emptySet(),
        statePriority = GuiDataGridState.entries.map { it.wireValue },
    )
    val root = rootResolved["root"] ?: error("Resolved GUI data-grid visual is missing required root part")
    val header = rootResolved["header"] ?: error("Resolved GUI data-grid visual is missing required header part")
    val columnHeader = rootResolved["columnHeader"] ?: error("Resolved GUI data-grid visual is missing required columnHeader part")
    val rootRadius = root.radius?.toComposeDp() ?: 0.dp
    val rootShape = RoundedCornerShape(rootRadius)
    val enabledRows = rows.filterNot { disabled || it.disabled }
    val requesters = remember(rows.map { it.value }) { rows.associate { it.value to FocusRequester() } }

    fun moveFocus(current: String, directive: Int?) {
        if (enabledRows.isEmpty()) return
        val index = enabledRows.indexOfFirst { it.value == current }.coerceAtLeast(0)
        val target = when (directive) {
            Int.MIN_VALUE -> enabledRows.first()
            Int.MAX_VALUE -> enabledRows.last()
            1 -> enabledRows[(index + 1).coerceAtMost(enabledRows.lastIndex)]
            -1 -> enabledRows[(index - 1).coerceAtLeast(0)]
            else -> enabledRows[index]
        }
        requesters[target.value]?.requestFocus()
    }

    var rootModifier = modifier
        .fillMaxWidth()
        .semantics {
            collectionInfo = CollectionInfo(rowCount = rows.size + 1, columnCount = columns.size)
            if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
            if (disabled) disabled()
        }
        .then(if (rootRadius > 0.dp) Modifier.clip(rootShape) else Modifier)
        .alpha(root.tableOpacity())
    root.fill?.let { rootModifier = rootModifier.background(it.toComposeColor(), rootShape) }
    root.border?.let { rootModifier = rootModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), rootShape) }

    Column(modifier = rootModifier) {
        Row(modifier = Modifier.fillMaxWidth().applyTableBox(header)) {
            columns.forEachIndexed { columnIndex, column ->
                var headerModifier = Modifier
                    .weight(1f)
                    .defaultMinSize(minHeight = columnHeader.minHeight?.toComposeDp() ?: 0.dp)
                    .semantics {
                        heading()
                        collectionItemInfo = CollectionItemInfo(
                            rowIndex = 0,
                            rowSpan = 1,
                            columnIndex = columnIndex,
                            columnSpan = 1,
                        )
                    }
                    .padding(
                        horizontal = columnHeader.paddingHorizontal?.toComposeDp() ?: 0.dp,
                        vertical = columnHeader.paddingVertical?.toComposeDp() ?: 0.dp,
                    )
                columnHeader.fill?.let { headerModifier = headerModifier.background(it.toComposeColor()) }
                BasicText(
                    column.label,
                    modifier = headerModifier,
                    style = columnHeader.tableTextStyle(root.foreground?.toComposeColor() ?: Color.Unspecified),
                )
            }
        }
        rows.forEachIndexed { rowIndex, row ->
            key(row.value) {
                GuiDataGridRowContent(
                    row = row,
                    rowIndex = rowIndex,
                    columnCount = columns.size,
                    selectedValue = value,
                    globallyDisabled = disabled,
                    variant = variant,
                    size = size,
                    recipe = recipe,
                    requester = requesters.getValue(row.value),
                    onMoveFocus = ::moveFocus,
                    onValueChange = onValueChange,
                    onRowActivate = onRowActivate,
                )
            }
        }
    }
}
