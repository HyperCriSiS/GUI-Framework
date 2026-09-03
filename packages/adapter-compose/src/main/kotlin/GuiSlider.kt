// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.focusable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.matchParentSize
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.setProgress
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiSliderContract
import gui.framework.generated.internal.GuiSliderSize
import gui.framework.generated.internal.GuiSliderState
import gui.framework.generated.internal.GuiSliderVariant
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.floor
import kotlin.math.round

private fun GuiVisualPartStyle.sliderOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI slider opacity must be in the range 0..1" }
    return value
}

private fun Modifier.guiSliderFocusOutline(
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

private fun snapSliderValue(
    raw: Double,
    min: Double,
    max: Double,
    step: Double,
): Double {
    if (raw <= min) return min
    if (raw >= max) return max
    val stepsFromMin = round((raw - min) / step)
    return (min + stepsFromMin * step).coerceIn(min, max)
}

private fun sliderSemanticSteps(min: Double, max: Double, step: Double): Int {
    val intervals = floor((max - min) / step).toLong()
    return (intervals - 1L).coerceIn(0L, Int.MAX_VALUE.toLong()).toInt()
}

/**
 * Foundation-only controlled slider driven by the renderer-neutral Slider
 * contract. Pointer, keyboard and accessibility actions only request a new
 * value; the caller remains the source of truth and must recompose with it.
 */
@Composable
fun GuiSlider(
    value: Double,
    onValueChange: (Double) -> Unit,
    accessibilityLabel: String,
    modifier: Modifier = Modifier,
    min: Double = 0.0,
    max: Double = 100.0,
    step: Double = 1.0,
    accessibilityValueText: String = "",
    disabled: Boolean = false,
    variant: GuiSliderVariant = GuiSliderVariant.HORIZONTAL,
    size: GuiSliderSize = GuiSliderSize.MEDIUM,
    interactionSource: MutableInteractionSource? = null,
) {
    require(value.isFinite()) { "GUI slider value must be finite" }
    require(min.isFinite()) { "GUI slider min must be finite" }
    require(max.isFinite()) { "GUI slider max must be finite" }
    require(step.isFinite()) { "GUI slider step must be finite" }
    require(max > min) { "GUI slider max must be greater than min" }
    require((max - min).isFinite()) { "GUI slider range must be finite" }
    require(step > 0.0) { "GUI slider step must be greater than zero" }
    require(value in min..max) { "GUI slider value must be between min and max" }
    require(accessibilityLabel.isNotBlank()) { "GUI slider accessibilityLabel must not be blank" }

    val selection = LocalGuiThemeSelection.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val hovered by source.collectIsHoveredAsState()
    val focused by source.collectIsFocusedAsState()
    val enabled = !disabled
    var pressed by remember { mutableStateOf(false) }
    var measuredSize by remember { mutableStateOf(IntSize.Zero) }
    val currentValue by rememberUpdatedState(value)
    val currentOnValueChange by rememberUpdatedState(onValueChange)

    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "slider",
    ) ?: error(
        "No Compose visual recipe for slider with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiSliderContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "slider",
    )
    val activeStates = buildSet {
        if (hovered && enabled) add("hover")
        if (focused && enabled) add("focus")
        if (pressed && enabled) add("pressed")
        if (!enabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiSliderState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI slider visual is missing required root part")
    val track = resolved["track"] ?: error("Resolved GUI slider visual is missing required track part")
    val fill = resolved["fill"] ?: error("Resolved GUI slider visual is missing required fill part")
    val thumb = resolved["thumb"] ?: error("Resolved GUI slider visual is missing required thumb part")
    val rootRadius = root.radius?.toComposeDp() ?: 0.dp
    val fraction = ((value - min) / (max - min)).toFloat().coerceIn(0f, 1f)

    fun request(raw: Double) {
        if (!enabled) return
        val next = snapSliderValue(raw, min, max, step)
        if (next != currentValue) currentOnValueChange(next)
    }

    fun requestFromPosition(position: Offset) {
        if (!enabled || measuredSize.width <= 0 || measuredSize.height <= 0) return
        val rawFraction = when (variant) {
            GuiSliderVariant.HORIZONTAL -> position.x / measuredSize.width.toFloat()
            GuiSliderVariant.VERTICAL -> 1f - position.y / measuredSize.height.toFloat()
        }.coerceIn(0f, 1f)
        request(min + rawFraction.toDouble() * (max - min))
    }

    val rootModifier = modifier
        .defaultMinSize(
            minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
            minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
        )
        .alpha(root.sliderOpacity())
        .guiSliderFocusOutline(root.outline, rootRadius)
        .onSizeChanged { measuredSize = it }
        .hoverable(interactionSource = source, enabled = enabled)
        .semantics {
            contentDescription = accessibilityLabel
            progressBarRangeInfo = ProgressBarRangeInfo(
                current = value.toFloat(),
                range = min.toFloat()..max.toFloat(),
                steps = sliderSemanticSteps(min, max, step),
            )
            if (accessibilityValueText.isNotBlank()) stateDescription = accessibilityValueText
            if (disabled) disabled()
            if (enabled) {
                setProgress { target ->
                    request(target.toDouble())
                    true
                }
            }
        }
        .focusable(enabled = enabled, interactionSource = source)
        .onKeyEvent { event ->
            if (!enabled || event.type != KeyEventType.KeyDown) return@onKeyEvent false
            val next = when (event.key) {
                Key.MoveHome -> min
                Key.MoveEnd -> max
                Key.DirectionLeft, Key.DirectionDown -> currentValue - step
                Key.DirectionRight, Key.DirectionUp -> currentValue + step
                else -> return@onKeyEvent false
            }
            request(next.coerceIn(min, max))
            true
        }
        .pointerInput(enabled, variant, min, max, step) {
            if (!enabled) return@pointerInput
            detectTapGestures(
                onPress = {
                    pressed = true
                    try {
                        tryAwaitRelease()
                    } finally {
                        pressed = false
                    }
                },
                onTap = { requestFromPosition(it) },
            )
        }
        .pointerInput(enabled, variant, min, max, step) {
            if (!enabled) return@pointerInput
            var dragStartValue = currentValue
            var dragDelta = 0f
            detectDragGestures(
                onDragStart = {
                    pressed = true
                    dragStartValue = currentValue
                    dragDelta = 0f
                },
                onDragCancel = { pressed = false },
                onDragEnd = { pressed = false },
                onDrag = { change, amount ->
                    change.consume()
                    val extent = when (variant) {
                        GuiSliderVariant.HORIZONTAL -> measuredSize.width.toFloat()
                        GuiSliderVariant.VERTICAL -> measuredSize.height.toFloat()
                    }
                    if (extent <= 0f) return@detectDragGestures
                    dragDelta += when (variant) {
                        GuiSliderVariant.HORIZONTAL -> amount.x
                        GuiSliderVariant.VERTICAL -> -amount.y
                    }
                    val valueDelta = dragDelta / extent * (max - min)
                    request((dragStartValue + valueDelta).coerceIn(min, max))
                },
            )
        }

    Box(modifier = rootModifier) {
        Canvas(modifier = Modifier.matchParentSize()) {
            val thumbWidth = thumb.minWidth?.toComposeDp()?.toPx()
                ?: error("Resolved GUI slider thumb is missing minWidth")
            val thumbHeight = thumb.minHeight?.toComposeDp()?.toPx()
                ?: error("Resolved GUI slider thumb is missing minHeight")
            val trackWidth = track.minWidth?.toComposeDp()?.toPx() ?: this.size.width
            val trackHeight = track.minHeight?.toComposeDp()?.toPx() ?: this.size.height
            val fillWidth = fill.minWidth?.toComposeDp()?.toPx() ?: trackWidth
            val fillHeight = fill.minHeight?.toComposeDp()?.toPx() ?: trackHeight
            val trackColor = track.fill?.toComposeColor()
                ?: error("Resolved GUI slider track is missing fill")
            val fillColor = fill.fill?.toComposeColor()
                ?: error("Resolved GUI slider fill is missing fill")
            val thumbColor = thumb.fill?.toComposeColor()
                ?: error("Resolved GUI slider thumb is missing fill")
            val trackRadius = track.radius?.toComposeDp()?.toPx() ?: 0f
            val fillRadius = fill.radius?.toComposeDp()?.toPx() ?: trackRadius
            val thumbRadius = thumb.radius?.toComposeDp()?.toPx() ?: 0f
            val trackBorder = track.border
            val thumbBorder = thumb.border

            val thumbCenter: Offset
            val trackTopLeft: Offset
            val trackSize: Size
            val fillTopLeft: Offset
            val fillSize: Size

            when (variant) {
                GuiSliderVariant.HORIZONTAL -> {
                    val visualTrackWidth = trackWidth.coerceAtMost(this.size.width)
                    val start = (this.size.width - visualTrackWidth) / 2f
                    val centerY = this.size.height / 2f
                    val travelStart = start + thumbWidth / 2f
                    val travelEnd = start + visualTrackWidth - thumbWidth / 2f
                    val centerX = travelStart + (travelEnd - travelStart).coerceAtLeast(0f) * fraction
                    trackTopLeft = Offset(start, centerY - trackHeight / 2f)
                    trackSize = Size(visualTrackWidth, trackHeight)
                    fillTopLeft = Offset(start, centerY - fillHeight / 2f)
                    fillSize = Size((centerX - start).coerceAtLeast(0f), fillHeight)
                    thumbCenter = Offset(centerX, centerY)
                }

                GuiSliderVariant.VERTICAL -> {
                    val visualTrackHeight = trackHeight.coerceAtMost(this.size.height)
                    val top = (this.size.height - visualTrackHeight) / 2f
                    val centerX = this.size.width / 2f
                    val travelTop = top + thumbHeight / 2f
                    val travelBottom = top + visualTrackHeight - thumbHeight / 2f
                    val centerY = travelBottom - (travelBottom - travelTop).coerceAtLeast(0f) * fraction
                    trackTopLeft = Offset(centerX - trackWidth / 2f, top)
                    trackSize = Size(trackWidth, visualTrackHeight)
                    fillTopLeft = Offset(centerX - fillWidth / 2f, centerY)
                    fillSize = Size(fillWidth, (top + visualTrackHeight - centerY).coerceAtLeast(0f))
                    thumbCenter = Offset(centerX, centerY)
                }
            }

            drawRoundRect(
                color = trackColor,
                topLeft = trackTopLeft,
                size = trackSize,
                cornerRadius = CornerRadius(trackRadius, trackRadius),
            )
            trackBorder?.let {
                val width = it.width.toComposeDp().toPx()
                if (width > 0f) {
                    drawRoundRect(
                        color = it.color.toComposeColor(),
                        topLeft = trackTopLeft,
                        size = trackSize,
                        cornerRadius = CornerRadius(trackRadius, trackRadius),
                        style = Stroke(width = width),
                    )
                }
            }
            if (fillSize.width > 0f && fillSize.height > 0f) {
                drawRoundRect(
                    color = fillColor,
                    topLeft = fillTopLeft,
                    size = fillSize,
                    cornerRadius = CornerRadius(fillRadius, fillRadius),
                )
            }
            val thumbTopLeft = Offset(
                x = thumbCenter.x - thumbWidth / 2f,
                y = thumbCenter.y - thumbHeight / 2f,
            )
            drawRoundRect(
                color = thumbColor,
                topLeft = thumbTopLeft,
                size = Size(thumbWidth, thumbHeight),
                cornerRadius = CornerRadius(thumbRadius, thumbRadius),
            )
            thumbBorder?.let {
                val width = it.width.toComposeDp().toPx()
                if (width > 0f) {
                    drawRoundRect(
                        color = it.color.toComposeColor(),
                        topLeft = thumbTopLeft,
                        size = Size(thumbWidth, thumbHeight),
                        cornerRadius = CornerRadius(thumbRadius, thumbRadius),
                        style = Stroke(width = width),
                    )
                }
            }
        }
    }
}
