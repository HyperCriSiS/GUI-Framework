// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose.internal

import androidx.compose.ui.graphics.Color
import gui.framework.generated.internal.GuiColorValue

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
