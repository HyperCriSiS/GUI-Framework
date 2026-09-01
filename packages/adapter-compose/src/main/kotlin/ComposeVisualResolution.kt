// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose.internal

import gui.framework.generated.internal.GuiComponentCapabilities
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRecipe
import gui.framework.generated.internal.GuiVisualScopedRecipe


internal data class GuiCapabilitySelection(
    val fallbackId: String?,
    val missingRequired: Set<String>,
) {
    val supported: Boolean get() = missingRequired.isEmpty()
}

internal fun selectGuiCapabilityFallback(
    capabilities: GuiComponentCapabilities,
    recipe: GuiVisualRecipe,
    availableCapabilities: Set<String>,
): GuiCapabilitySelection {
    val missingRequired = capabilities.required
        .filterNot(availableCapabilities::contains)
        .toSortedSet()
    if (missingRequired.isNotEmpty()) {
        return GuiCapabilitySelection(fallbackId = null, missingRequired = missingRequired)
    }

    for (fallbackId in capabilities.fallbackOrder) {
        val fallback = recipe.fallbacks[fallbackId] ?: continue
        if (fallback.requires.all(availableCapabilities::contains)) {
            return GuiCapabilitySelection(fallbackId = fallbackId, missingRequired = emptySet())
        }
    }

    return GuiCapabilitySelection(fallbackId = null, missingRequired = emptySet())
}

internal fun resolveGuiCapabilityRecipe(
    capabilities: GuiComponentCapabilities,
    recipe: GuiVisualRecipe,
    availableCapabilities: Set<String>,
    componentId: String,
): GuiVisualRecipe {
    val selection = selectGuiCapabilityFallback(capabilities, recipe, availableCapabilities)
    require(selection.supported) {
        "GUI component $componentId requires unavailable capabilities: " +
            selection.missingRequired.joinToString()
    }
    val fallback = selection.fallbackId?.let(recipe.fallbacks::get)?.recipe ?: return recipe
    return recipe.overlay(fallback)
}

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
    shadow = override.shadow ?: shadow,
    backdropBlur = override.backdropBlur ?: backdropBlur,
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

private fun mergePartMapGroups(
    base: Map<String, Map<String, GuiVisualPartStyle>>,
    override: Map<String, Map<String, GuiVisualPartStyle>>,
): Map<String, Map<String, GuiVisualPartStyle>> {
    if (override.isEmpty()) return base
    val output = base.toMutableMap()
    for ((id, partMap) in override) {
        output[id] = mergePartMaps(output[id].orEmpty(), partMap)
    }
    return output
}

private fun GuiVisualScopedRecipe.overlay(override: GuiVisualScopedRecipe): GuiVisualScopedRecipe =
    GuiVisualScopedRecipe(
        base = mergePartMaps(base, override.base),
        sizes = mergePartMapGroups(sizes, override.sizes),
        states = mergePartMapGroups(states, override.states),
    )

private fun mergeScopedRecipes(
    base: Map<String, GuiVisualScopedRecipe>,
    override: Map<String, GuiVisualScopedRecipe>,
): Map<String, GuiVisualScopedRecipe> {
    if (override.isEmpty()) return base
    val output = base.toMutableMap()
    for ((id, scoped) in override) {
        output[id] = output[id]?.overlay(scoped) ?: scoped
    }
    return output
}

private fun GuiVisualRecipe.overlay(override: GuiVisualRecipe): GuiVisualRecipe = GuiVisualRecipe(
    base = mergePartMaps(base, override.base),
    sizes = mergePartMapGroups(sizes, override.sizes),
    states = mergePartMapGroups(states, override.states),
    variants = mergeScopedRecipes(variants, override.variants),
    fallbacks = emptyMap(),
)

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
