// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.progressBarRangeInfo
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
import gui.framework.compose.internal.toKotlinDuration
import gui.framework.generated.internal.GuiDurationValue
import gui.framework.generated.internal.GuiPrimitiveTokens
import gui.framework.generated.internal.GuiProgressContract
import gui.framework.generated.internal.GuiProgressSize
import gui.framework.generated.internal.GuiProgressState
import gui.framework.generated.internal.GuiProgressVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry
import kotlin.math.roundToInt

private fun GuiVisualPartStyle.progressOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI progress opacity must be in the range 0..1" }
    return value
}

private fun GuiVisualPartStyle.progressTextStyle(): TextStyle {
    val composeFontSize = fontSize?.toComposeSp() ?: TextUnit.Unspecified
    val lineHeightMultiplier = lineHeight?.toComposeUnitlessFloat()
    val composeLineHeight = if (fontSize != null && lineHeightMultiplier != null) {
        (fontSize.value * lineHeightMultiplier).toFloat().sp
    } else {
        TextUnit.Unspecified
    }
    val weight = fontWeight?.value?.roundToInt()?.also {
        require(it in 1..1000) { "GUI progress font weight must be in the range 1..1000" }
    }
    return TextStyle(
        color = foreground?.toComposeColor() ?: androidx.compose.ui.graphics.Color.Unspecified,
        fontSize = composeFontSize,
        fontWeight = weight?.let(::FontWeight),
        lineHeight = composeLineHeight,
    )
}

private fun progressIndeterminateDurationMillis(): Int {
    val token = GuiPrimitiveTokens.all["component.progress.indeterminate.duration"] as? GuiDurationValue
        ?: error("Missing neutral component.progress.indeterminate.duration token")
    val milliseconds = token.toKotlinDuration().inWholeMilliseconds
    require(milliseconds > 0L && milliseconds <= Int.MAX_VALUE.toLong()) {
        "GUI progress indeterminate duration must fit a positive animation duration"
    }
    return milliseconds.toInt()
}

/**
 * Foundation-only progress primitive driven by the neutral Progress / Spinner
 * contract. Determinate state exposes a real range; indeterminate state uses
 * platform progress semantics without inventing a synthetic percentage.
 */
@Composable
fun GuiProgress(
    value: Double = 0.0,
    modifier: Modifier = Modifier,
    min: Double = 0.0,
    max: Double = 100.0,
    indeterminate: Boolean = false,
    disabled: Boolean = false,
    accessibilityLabel: String = "",
    label: String = "",
    variant: GuiProgressVariant = GuiProgressVariant.LINEAR,
    size: GuiProgressSize = GuiProgressSize.MEDIUM,
) {
    require(value.isFinite()) { "GUI progress value must be finite" }
    require(min.isFinite()) { "GUI progress min must be finite" }
    require(max.isFinite()) { "GUI progress max must be finite" }
    require(max > min) { "GUI progress max must be greater than min" }
    if (!indeterminate) {
        require(value in min..max) { "GUI progress value must be between min and max when determinate" }
    }

    val selection = LocalGuiThemeSelection.current
    val baseRecipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "progress",
    ) ?: error(
        "No Compose visual recipe for progress with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )
    val recipe = resolveGuiCapabilityRecipe(
        capabilities = GuiProgressContract.capabilities,
        recipe = baseRecipe,
        availableCapabilities = LocalGuiAvailableCapabilities.current,
        componentId = "progress",
    )
    val activeStates = buildSet {
        if (indeterminate) add("indeterminate")
        if (disabled) add("disabled")
    }
    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = activeStates,
        statePriority = GuiProgressState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI progress visual is missing required root part")
    val track = resolved["track"] ?: error("Resolved GUI progress visual is missing required track part")
    val indicator = resolved["indicator"] ?: error("Resolved GUI progress visual is missing required indicator part")
    val labelStyle = resolved["label"]
    val accessibleName = accessibilityLabel.trim().ifEmpty { label.trim() }
    val fraction = if (indeterminate) 0f else ((value - min) / (max - min)).toFloat()

    val phase = if (indeterminate && !disabled) {
        val transition = rememberInfiniteTransition(label = "GUI progress indeterminate")
        val animatedPhase by transition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(
                    durationMillis = progressIndeterminateDurationMillis(),
                    easing = LinearEasing,
                ),
                repeatMode = RepeatMode.Restart,
            ),
            label = "GUI progress phase",
        )
        animatedPhase
    } else {
        0f
    }

    val rangeInfo = if (indeterminate) {
        ProgressBarRangeInfo.Indeterminate
    } else {
        ProgressBarRangeInfo(
            current = value.toFloat(),
            range = min.toFloat()..max.toFloat(),
            steps = 0,
        )
    }

    val rootModifier = modifier
        .alpha(root.progressOpacity())
        .semantics(mergeDescendants = true) {
            progressBarRangeInfo = rangeInfo
            if (disabled) disabled()
            if (accessibleName.isNotEmpty()) contentDescription = accessibleName
        }

    Column(
        modifier = rootModifier,
        horizontalAlignment = if (variant == GuiProgressVariant.CIRCULAR) {
            Alignment.CenterHorizontally
        } else {
            Alignment.Start
        },
    ) {
        when (variant) {
            GuiProgressVariant.LINEAR -> {
                val trackColor = track.fill?.toComposeColor()
                    ?: error("Resolved linear GUI progress track is missing fill")
                val indicatorColor = indicator.fill?.toComposeColor()
                    ?: error("Resolved linear GUI progress indicator is missing fill")
                val trackRadius = track.radius?.toComposeDp() ?: 0.dp
                val indicatorRadius = indicator.radius?.toComposeDp() ?: trackRadius
                val trackHeight = track.minHeight?.toComposeDp()
                    ?: error("Resolved linear GUI progress track is missing minHeight")

                Canvas(
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = trackHeight),
                ) {
                    val trackCorner = trackRadius.toPx().coerceAtMost(this.size.height / 2f)
                    drawRoundRect(
                        color = trackColor,
                        size = this.size,
                        cornerRadius = CornerRadius(trackCorner, trackCorner),
                    )

                    val indicatorWidth: Float
                    val indicatorStart: Float
                    if (indeterminate) {
                        indicatorWidth = this.size.width * 0.4f
                        indicatorStart = this.size.width * (-0.4f + phase * 1.8f)
                    } else {
                        indicatorWidth = this.size.width * fraction
                        indicatorStart = 0f
                    }
                    if (indicatorWidth > 0f) {
                        val indicatorCorner = indicatorRadius.toPx().coerceAtMost(this.size.height / 2f)
                        drawRoundRect(
                            color = indicatorColor,
                            topLeft = Offset(indicatorStart, 0f),
                            size = Size(indicatorWidth, this.size.height),
                            cornerRadius = CornerRadius(indicatorCorner, indicatorCorner),
                        )
                    }
                }
            }

            GuiProgressVariant.CIRCULAR -> {
                val trackBorder = track.border
                    ?: error("Resolved circular GUI progress track is missing border")
                val indicatorBorder = indicator.border
                    ?: error("Resolved circular GUI progress indicator is missing border")
                val width = root.minWidth?.toComposeDp()
                    ?: error("Resolved circular GUI progress root is missing minWidth")
                val height = root.minHeight?.toComposeDp()
                    ?: error("Resolved circular GUI progress root is missing minHeight")

                Canvas(modifier = Modifier.size(width = width, height = height)) {
                    val trackStroke = trackBorder.width.toComposeDp().toPx()
                    val indicatorStroke = indicatorBorder.width.toComposeDp().toPx()
                    val inset = maxOf(trackStroke, indicatorStroke) / 2f
                    val arcSize = Size(
                        width = (this.size.width - inset * 2f).coerceAtLeast(0f),
                        height = (this.size.height - inset * 2f).coerceAtLeast(0f),
                    )
                    val topLeft = Offset(inset, inset)

                    drawArc(
                        color = trackBorder.color.toComposeColor(),
                        startAngle = -90f,
                        sweepAngle = 360f,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = trackStroke, cap = StrokeCap.Round),
                    )
                    val startAngle = if (indeterminate) -90f + phase * 360f else -90f
                    val sweepAngle = if (indeterminate) 90f else fraction * 360f
                    if (sweepAngle > 0f) {
                        drawArc(
                            color = indicatorBorder.color.toComposeColor(),
                            startAngle = startAngle,
                            sweepAngle = sweepAngle,
                            useCenter = false,
                            topLeft = topLeft,
                            size = arcSize,
                            style = Stroke(width = indicatorStroke, cap = StrokeCap.Round),
                        )
                    }
                }
            }
        }

        if (label.isNotBlank()) {
            BasicText(
                text = label,
                style = labelStyle?.progressTextStyle() ?: TextStyle.Default,
            )
        }
    }
}
