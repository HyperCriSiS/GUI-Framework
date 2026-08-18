// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose.internal

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import gui.framework.generated.internal.GuiColorValue
import gui.framework.generated.internal.GuiDimensionValue
import gui.framework.generated.internal.GuiDurationValue
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * Maps a resolved neutral sRGB color token to the host Compose color primitive.
 *
 * Other color spaces are deliberately rejected until their conversion semantics
 * are defined by the neutral specification/toolchain.
 */
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
 *
 * DTCG defines `px` as an idealized UI/reference pixel and identifies Android
 * `dp` as the equivalent unit. It is therefore mapped directly and must not be
 * multiplied by the physical display density.
 *
 * `rem` is intentionally rejected because its meaning is font-size-relative and
 * requires a separate context-aware mapping rather than an approximation to Dp.
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
 * Maps a resolved neutral duration token to Kotlin's platform-neutral Duration.
 *
 * DTCG duration values use `ms` or `s`. Keeping the value as Duration avoids
 * leaking animation-engine-specific integer millisecond assumptions into the
 * generated contract or the Compose adapter.
 */
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
