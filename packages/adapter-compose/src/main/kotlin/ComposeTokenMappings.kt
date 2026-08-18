// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose.internal

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gui.framework.generated.internal.GuiColorValue
import gui.framework.generated.internal.GuiDimensionValue
import gui.framework.generated.internal.GuiDurationValue
import gui.framework.generated.internal.GuiNumberValue
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/** Maps a resolved neutral sRGB color token to the host Compose color primitive. */
internal fun GuiColorValue.toComposeColor(): Color {
    require(colorSpace == "srgb") {
        "Unsupported neutral color space for Compose mapping: $colorSpace"
    }
    require(components.size == 3) {
        "Neutral sRGB color must contain exactly three components"
    }
    require(components.all { it in 0.0..1.0 }) {
        "Neutral sRGB components must be in the range 0..1"
    }

    return Color(
        red = components[0].toFloat(),
        green = components[1].toFloat(),
        blue = components[2].toFloat(),
        alpha = 1f,
    )
}

/**
 * Maps a DTCG `px` dimension to Compose density-independent pixels.
 * `rem` is intentionally rejected because it requires context-aware mapping.
 */
internal fun GuiDimensionValue.toComposeDp(): Dp {
    require(unit == "px") {
        "Unsupported neutral dimension unit for Compose Dp mapping: $unit"
    }
    require(value.isFinite()) {
        "Neutral dimension value must be finite"
    }
    return value.toFloat().dp
}

/**
 * Maps a neutral typography dimension to Compose scale-independent pixels.
 * The property context, not the DTCG dimension type alone, determines that a
 * font-size token must respect the host user's font scale.
 */
internal fun GuiDimensionValue.toComposeSp(): TextUnit {
    require(unit == "px") {
        "Unsupported neutral font-size unit for Compose mapping: $unit"
    }
    require(value.isFinite() && value >= 0.0) {
        "Neutral font-size value must be finite and non-negative"
    }
    return value.toFloat().sp
}

internal fun GuiNumberValue.toComposeUnitlessFloat(): Float {
    require(value.isFinite()) {
        "Neutral number value must be finite"
    }
    return value.toFloat()
}

/** Maps a resolved neutral duration token to Kotlin's platform-neutral Duration. */
internal fun GuiDurationValue.toKotlinDuration(): Duration {
    require(value.isFinite()) {
        "Neutral duration value must be finite"
    }
    require(value >= 0.0) {
        "Neutral duration value must not be negative"
    }

    return when (unit) {
        "ms" -> value.milliseconds
        "s" -> value.seconds
        else -> error("Unsupported neutral duration unit for Kotlin mapping: $unit")
    }
}
