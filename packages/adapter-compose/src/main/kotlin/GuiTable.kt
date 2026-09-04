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
    val disabled: Boolean = false,
) {
    init { require(value.isNotBlank()) { "GUI data-grid row value must not be blank" } }
}

private fun String?.tableNumber(defaultValue: Float): Float = this?.toFloatOrNull() ?: defaultValue

private fun GuiVisualPartStyle.tableOpacity(): Float = opacity?.toComposeUnitlessFloat() ?: 1f

private fun GuiVisualPartStyle.tablePaddingHorizontal(): Dp = padding?.horizontal?.toComposeDp() ?: 0.dp

private fun GuiVisualPartStyle.tablePaddingVertical(): Dp = padding?.vertical?.toComposeDp() ?: 0.dp

private fun GuiVisualPartStyle.tableTextStyle(
    fallbackColor: Color = Color.Unspecified,
    fallbackSize: TextUnit = TextUnit.Unspecified,
    bold: Boolean = false,
): TextStyle = TextStyle(
    color = textColor?.toComposeColor() ?: fallbackColor,
    fontSize = typography?.size?.toComposeSp() ?: fallbackSize,
    lineHeight = typography?.lineHeight?.toComposeSp() ?: TextUnit.Unspecified,
    fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
)

private fun GuiVisualPartStyle.tableCellModifier(): Modifier {
    var modifier = Modifier
        .defaultMinSize(
            minWidth = minWidth?.toComposeDp() ?: 0.dp,
            minHeight = minHeight?.toComposeDp() ?: 0.dp,
        )
        .padding(
            horizontal = tablePaddingHorizontal(),
            vertical = tablePaddingVertical(),
        )
    fill?.let { modifier = modifier.background(it.toComposeColor()) }
    border?.let { modifier = modifier.tableCellBorder(it) }
    return modifier.alpha(tableOpacity())
}

private fun Modifier.tableCellBorder(border: gui.framework.generated.internal.GuiVisualBorder): Modifier = drawWithContent {
    drawContent()
    val width = border.width.toComposeDp().toPx()
    if (width <= 0f) return@drawWithContent
    drawLine(
        color = border.color.toComposeColor(),
        start = Offset(0f, size.height - width / 2f),
        end = Offset(size.width, size.height - width / 2f),
        strokeWidth = width,
    )
}

private fun Modifier.guiTableOutline(style: GuiVisualPartStyle, radius: Dp): Modifier {
    val outline = style.outline ?: return this
    return drawWithContent {
        drawContent()
        val width = outline.width.toComposeDp().toPx()
        if (width <= 0f) return@drawWithContent
        val inset = width / 2f
        drawRoundRect(
            color = outline.color.toComposeColor(),
            topLeft = Offset(inset, inset),
            size = Size((size.width - width).coerceAtLeast(0f), (size.height - width).coerceAtLeast(0f)),
            cornerRadius = CornerRadius(radius.toPx()),
            style = Stroke(width = width),
        )
    }
}

private fun Modifier.guiTableEdgeBorder(
    border: gui.framework.generated.internal.GuiVisualBorder?,
    drawStart: Boolean = false,
    drawTop: Boolean = false,
    drawBottom: Boolean = false,
): Modifier {
    if (border == null) return this
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
        state = GuiTableState.DEFAULT.wireValue,
    )
    val root = resolved["root"] ?: error("Resolved GUI table visual is missing required root part")
    val captionStyle = resolved["caption"] ?: error("Resolved GUI table visual is missing required caption part")
    val headerStyle = resolved["header"] ?: error("Resolved GUI table visual is missing required header part")
    val rowStyle = resolved["row"] ?: error("Resolved GUI table visual is missing required row part")
    val cellStyle = resolved["cell"] ?: error("Resolved GUI table visual is missing required cell part")

    Column(
        modifier = modifier
            .applyTableBox(root)
            .semantics {
                collectionInfo = CollectionInfo(rowCount = rows.size + 1, columnCount = columns.size)
                if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
            },
    ) {
        if (caption.isNotBlank()) {
            BasicText(
                text = caption,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        horizontal = captionStyle.tablePaddingHorizontal(),
                        vertical = captionStyle.tablePaddingVertical(),
                    ),
                style = captionStyle.tableTextStyle(bold = true),
            )
        }
        Row(modifier = Modifier.fillMaxWidth().applyTableBox(headerStyle)) {
            columns.forEachIndexed { columnIndex, column ->
                BasicText(
                    text = column.label,
                    modifier = Modifier
                        .weight(1f)
                        .tableCellModifier()
                        .semantics {
                            heading()
                            collectionItemInfo = CollectionItemInfo(
                                rowIndex = 0,
                                rowSpan = 1,
                                columnIndex = columnIndex,
                                columnSpan = 1,
                            )
                        },
                    style = headerStyle.tableTextStyle(bold = true),
                )
            }
        }
        rows.forEachIndexed { rowIndex, row ->
            Row(modifier = Modifier.fillMaxWidth().applyTableBox(rowStyle)) {
                row.cells.forEachIndexed { columnIndex, cell ->
                    BasicText(
                        text = cell,
                        modifier = Modifier
                            .weight(1f)
                            .tableCellModifier()
                            .semantics {
                                collectionItemInfo = CollectionItemInfo(
                                    rowIndex = rowIndex + 1,
                                    rowSpan = 1,
                                    columnIndex = columnIndex,
                                    columnSpan = 1,
                                )
                            },
                        style = cellStyle.tableTextStyle(),
                    )
                }
            }
        }
    }
}

/**
 * Foundation-only row-selection Data Grid. Selection is controlled by [value] and [onValueChange].
 * One row is tabbable at a time and arrow/home/end keys move focus between enabled rows.
 */
@Composable
fun GuiDataGrid(
    columns: List<GuiDataGridColumn>,
    rows: List<GuiDataGridRow>,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    accessibilityLabel: String = "",
    disabled: Boolean = false,
    variant: GuiDataGridVariant = GuiDataGridVariant.STANDARD,
    size: GuiDataGridSize = GuiDataGridSize.MEDIUM,
    onRowActivate: (String) -> Unit = {},
) {
    require(columns.isNotEmpty()) { "GUI data-grid requires at least one column" }
    require(rows.isNotEmpty()) { "GUI data-grid requires at least one row" }
    require(rows.all { it.cells.size == columns.size }) { "GUI data-grid row cell count must match column count" }
    require(rows.map { it.value }.toSet().size == rows.size) { "GUI data-grid row values must be unique" }

    val recipe = resolveTableRecipe("data-grid", GuiDataGridContract.capabilities)
    val rootRecipe = resolveGuiVisualRecipe(recipe, variant.wireValue, size.wireValue, GuiDataGridState.DEFAULT.wireValue)
    val rootStyle = rootRecipe["root"] ?: error("Resolved GUI data-grid visual is missing required root part")
    val headerStyle = rootRecipe["header"] ?: error("Resolved GUI data-grid visual is missing required header part")
    val focusRequesters = remember(rows.map { it.value }) { rows.associate { it.value to FocusRequester() } }
    val enabledRows = rows.filterNot { disabled || it.disabled }

    fun moveFocus(currentValue: String, delta: Int) {
        val index = enabledRows.indexOfFirst { it.value == currentValue }
        if (index < 0 || enabledRows.isEmpty()) return
        val target = when (delta) {
            Int.MIN_VALUE -> 0
            Int.MAX_VALUE -> enabledRows.lastIndex
            else -> (index + delta).coerceIn(0, enabledRows.lastIndex)
        }
        focusRequesters[enabledRows[target].value]?.requestFocus()
    }

    Column(
        modifier = modifier
            .applyTableBox(rootStyle)
            .semantics {
                collectionInfo = CollectionInfo(rowCount = rows.size + 1, columnCount = columns.size)
                if (accessibilityLabel.isNotBlank()) contentDescription = accessibilityLabel
                if (disabled) disabled()
            },
    ) {
        Row(modifier = Modifier.fillMaxWidth().applyTableBox(headerStyle)) {
            columns.forEachIndexed { columnIndex, column ->
                BasicText(
                    text = column.label,
                    modifier = Modifier
                        .weight(1f)
                        .tableCellModifier()
                        .semantics {
                            heading()
                            collectionItemInfo = CollectionItemInfo(0, 1, columnIndex, 1)
                        },
                    style = headerStyle.tableTextStyle(bold = true),
                )
            }
        }
        rows.forEachIndexed { rowIndex, row ->
            key(row.value) {
                GuiDataGridRowView(
                    row = row,
                    rowIndex = rowIndex,
                    columnCount = columns.size,
                    selectedValue = value,
                    globallyDisabled = disabled,
                    recipe = recipe,
                    variant = variant,
                    size = size,
                    requester = focusRequesters.getValue(row.value),
                    onValueChange = onValueChange,
                    onRowActivate = onRowActivate,
                    onMoveFocus = ::moveFocus,
                )
            }
        }
    }
}

@Composable
private fun GuiDataGridRowView(
    row: GuiDataGridRow,
    rowIndex: Int,
    columnCount: Int,
    selectedValue: String,
    globallyDisabled: Boolean,
    recipe: GuiVisualRecipe,
    variant: GuiDataGridVariant,
    size: GuiDataGridSize,
    requester: FocusRequester,
    onValueChange: (String) -> Unit,
    onRowActivate: (String) -> Unit,
    onMoveFocus: (String, Int) -> Unit,
) {
    val source = remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val pressed by source.collectIsPressedAsState()
    val enabled = !globallyDisabled && !row.disabled
    val isSelected = row.value == selectedValue
    val state = when {
        !enabled -> GuiDataGridState.DISABLED
        pressed -> GuiDataGridState.PRESSED
        focused -> GuiDataGridState.FOCUS
        hovered -> GuiDataGridState.HOVER
        isSelected -> GuiDataGridState.SELECTED
        else -> GuiDataGridState.DEFAULT
    }
    val resolved = resolveGuiVisualRecipe(recipe, variant.wireValue, size.wireValue, state.wireValue)
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
            if (!enabled) disabled()
        }

    Row(modifier = rowModifier) {
        row.cells.forEach { cell ->
            BasicText(
                text = cell,
                modifier = Modifier
                    .weight(1f)
                    .tableCellModifier(),
                style = cellStyle.tableTextStyle(
                    fallbackColor = root.textColor?.toComposeColor() ?: Color.Unspecified,
                ),
            )
        }
    }
}
