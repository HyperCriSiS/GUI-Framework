// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose.internal

import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRecipe

internal fun GuiVisualPartStyle.overlay(override: GuiVisualPartStyle): GuiVisualPartStyle = copy(
    fill = override.fill ?: fill,
    foreground = override.foreground ?: foreground,
    opacity = override.opacity ?: opacity,
    radius = override.radius ?: radius,
    paddingHorizontal = override.paddingHorizontal ?: paddingHorizontal,
    paddingVertical = override.paddingVertical ?: paddingVertical,
    gap = override.gap ?: gap,
    minWidth = override.minWidth ?: minWidth,
    minHeight = override.minHeight ?: minHeight,
    fontSize = override.fontSize ?: fontSize,
    fontWeight = override.fontWeight ?: fontWeight,
    lineHeight = override.lineHeight ?: lineHeight,
    border = override.border ?: border,
    outline = override.outline ?: outline,
    transition = override.transition ?: transition,
)

private fun mergePartMaps(
    base: Map<String, GuiVisualPartStyle>,
    override: Map<String, GuiVisualPartStyle>,
): Map<String, GuiVisualPartStyle> {
    if (override.isEmpty()) return base
    val output = base.toMutableMap()
    for ((partId, style) in override) {
        output[partId] = output[partId]?.overlay(style) ?: style
    }
    return output
}

internal fun resolveGuiVisualRecipe(
    recipe: GuiVisualRecipe,
    variant: String?,
    size: String?,
    activeStates: Set<String>,
    statePriority: List<String>,
): Map<String, GuiVisualPartStyle> {
    val unknownStates = activeStates - statePriority.toSet()
    require(unknownStates.isEmpty()) {
        "Active GUI states have no declared priority: ${unknownStates.sorted().joinToString()}"
    }

    val variantRecipe = variant?.let(recipe.variants::get)
    var output: Map<String, GuiVisualPartStyle> = emptyMap()
    output = mergePartMaps(output, recipe.base)
    if (size != null) output = mergePartMaps(output, recipe.sizes[size].orEmpty())
    output = mergePartMaps(output, variantRecipe?.base.orEmpty())
    if (size != null) output = mergePartMaps(output, variantRecipe?.sizes?.get(size).orEmpty())

    for (state in statePriority) {
        if (state == "default" || state !in activeStates) continue
        output = mergePartMaps(output, recipe.states[state].orEmpty())
        output = mergePartMaps(output, variantRecipe?.states?.get(state).orEmpty())
    }

    return output
}
