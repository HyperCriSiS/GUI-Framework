// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.integration.hostcontext

enum class GuiHostContextPreset(val wireValue: String, val availableCapabilities: Set<String>) {
    PORTABLE("portable", emptySet()),
    BLEND_EFFECTS("blend-effects", setOf("advancedBlendModes")),
    BACKDROP_EFFECTS("backdrop-effects", setOf("backdropBlur")),
    RICH_EFFECTS("rich-effects", setOf("advancedBlendModes", "backdropBlur")),
}

fun guiHostContextPreset(wireValue: String): GuiHostContextPreset {
    require(wireValue.isNotBlank()) { "host-context preset id must not be blank" }
    return GuiHostContextPreset.entries.firstOrNull { it.wireValue == wireValue.trim() }
        ?: throw IllegalArgumentException("Unknown GUI host-context preset: ${wireValue.trim()}")
}

fun resolveGuiHostCapabilities(
    preset: GuiHostContextPreset,
    additionalCapabilities: Set<String> = emptySet(),
): Set<String> {
    require(additionalCapabilities.none { it.isBlank() }) {
        "capability identifiers must not be blank"
    }
    return (preset.availableCapabilities + additionalCapabilities.map { it.trim() }).toSortedSet()
}
