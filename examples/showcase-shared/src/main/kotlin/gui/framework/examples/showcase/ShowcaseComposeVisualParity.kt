// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.showcase

import gui.framework.compose.internal.resolveGuiCapabilityRecipe
import gui.framework.compose.internal.selectGuiCapabilityFallback
import gui.framework.generated.internal.GuiColorValue
import gui.framework.generated.internal.GuiComposeVisualParityBaseline
import gui.framework.generated.internal.GuiComposeVisualParityMetadata
import gui.framework.generated.internal.GuiDimensionValue
import gui.framework.generated.internal.GuiDurationValue
import gui.framework.generated.internal.GuiNumberValue
import gui.framework.generated.internal.GuiShadowValue
import gui.framework.generated.internal.GuiThemeId
import gui.framework.generated.internal.GuiTransitionValue
import gui.framework.generated.internal.GuiVisualBorder
import gui.framework.generated.internal.GuiVisualOutline
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRecipe
import gui.framework.generated.internal.GuiVisualRegistry
import gui.framework.generated.internal.GuiVisualScopedRecipe
import java.security.MessageDigest

private val composeParityPalettes = listOf("reference-dark", "reference-light")
private val composeParityThemeIds = listOf(
    "basic",
    "modern",
    "glass",
    "frosted-glass",
    "spacey",
    "cyberpunk",
)

/**
 * Verifies the effective Compose visual recipes used by both Desktop and Android.
 *
 * The probe intentionally advertises no backdropBlur capability because the current Compose
 * adapter does not render it. Frosted Glass therefore resolves to the same crisp effective
 * recipe as Glass while retaining a distinct high-capability Web path in the neutral spec.
 */
fun verifyShowcaseComposeVisualParity(): Map<String, String> {
    val generatedThemeIds = GuiThemeId.entries.map { it.wireValue }
    check(generatedThemeIds == composeParityThemeIds) {
        "Compose visual parity expects exactly the six initial themes; found $generatedThemeIds"
    }

    val fingerprints = linkedMapOf<String, String>()
    for (paletteId in composeParityPalettes) {
        val paletteFingerprints = linkedMapOf<String, String>()
        for (themeId in composeParityThemeIds) {
            val actual = composeThemeFingerprint(paletteId, themeId)
            val expected = GuiComposeVisualParityBaseline.fingerprint(paletteId, themeId)
                ?: error("Missing generated Compose visual parity baseline for $paletteId/$themeId")
            check(actual == expected) {
                "Compose visual parity mismatch for $paletteId/$themeId: expected $expected, got $actual"
            }
            paletteFingerprints[themeId] = actual
            fingerprints["$paletteId/$themeId"] = actual
        }

        check(composeThemeVisualPayload(paletteId, "glass") == composeThemeVisualPayload(paletteId, "frosted-glass")) {
            "Frosted Glass must resolve to the crisp Glass visual recipe on Compose for $paletteId"
        }
        check(paletteFingerprints.values.toSet().size == composeParityThemeIds.size) {
            "Compose parity fingerprints must remain theme-scoped even when two themes resolve to the same visual payload"
        }
    }

    check(fingerprints.size == composeParityPalettes.size * composeParityThemeIds.size)
    return fingerprints.toMap()
}

private fun composeThemeFingerprint(
    paletteId: String,
    themeId: String,
): String = sha256(
    "Q(${canonicalString(paletteId)};${canonicalString(themeId)};[${composeThemeVisualPayload(paletteId, themeId)}])",
)

private fun composeThemeVisualPayload(
    paletteId: String,
    themeId: String,
): String {
    val recipes = GuiVisualRegistry.theme(paletteId, themeId)
        ?: error("Missing generated Compose visual recipes for $paletteId/$themeId")

    return recipes.entries
        .sortedBy { it.key }
        .joinToString(",") { (componentId, recipe) ->
            val capabilities = GuiComposeVisualParityMetadata.capabilities(componentId)
            val selection = selectGuiCapabilityFallback(
                capabilities = capabilities,
                recipe = recipe,
                availableCapabilities = emptySet(),
            )
            check(selection.supported) {
                "Compose cannot satisfy required capabilities for $componentId: ${selection.missingRequired}"
            }
            val resolved = resolveGuiCapabilityRecipe(
                capabilities = capabilities,
                recipe = recipe,
                availableCapabilities = emptySet(),
                componentId = componentId,
            )
            "E(${canonicalString(componentId)};${canonicalOptionalString(selection.fallbackId)};" +
                "${canonicalRecipe(resolved)})"
        }
}

private fun sha256(value: String): String =
    MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8))
        .joinToString("") { byte -> (byte.toInt() and 0xff).toString(16).padStart(2, '0') }

private fun canonicalString(value: String): String = "${value.length}:$value"

private fun canonicalOptionalString(value: String?): String = value?.let(::canonicalString) ?: "~"

private fun canonicalDouble(value: Double): String =
    value.toRawBits().toULong().toString(16).padStart(16, '0')

private fun canonicalColor(value: GuiColorValue): String =
    "C(${canonicalString(value.colorSpace)};" +
        "[${value.components.joinToString(",") { canonicalDouble(it) }}];" +
        "${canonicalOptionalString(value.hex)};${canonicalDouble(value.alpha)})"

private fun canonicalDimension(value: GuiDimensionValue): String =
    "D(${canonicalDouble(value.value)};${canonicalString(value.unit)})"

private fun canonicalNumber(value: GuiNumberValue): String =
    "N(${canonicalDouble(value.value)})"

private fun canonicalShadow(value: GuiShadowValue): String =
    "S(${canonicalColor(value.color)};${canonicalDimension(value.offsetX)};" +
        "${canonicalDimension(value.offsetY)};${canonicalDimension(value.blur)};" +
        "${canonicalDimension(value.spread)};${if (value.inset) "1" else "0"})"

private fun canonicalDuration(value: GuiDurationValue): String =
    "U(${canonicalDouble(value.value)};${canonicalString(value.unit)})"

private fun canonicalTransition(value: GuiTransitionValue): String =
    "T(${canonicalDuration(value.duration)};${canonicalDuration(value.delay)};" +
        "B(${canonicalDouble(value.timingFunction.x1)},${canonicalDouble(value.timingFunction.y1)}," +
        "${canonicalDouble(value.timingFunction.x2)},${canonicalDouble(value.timingFunction.y2)}))"

private fun canonicalBorder(value: GuiVisualBorder): String =
    "R(${canonicalColor(value.color)};${canonicalDimension(value.width)})"

private fun canonicalOutline(value: GuiVisualOutline): String =
    "O(${canonicalColor(value.color)};${canonicalDimension(value.width)};" +
        "${canonicalDimension(value.offset)})"

private fun <T> canonicalOptional(value: T?, mapper: (T) -> String): String = value?.let(mapper) ?: "~"

private fun canonicalStyle(value: GuiVisualPartStyle): String =
    "P(${listOf(
        canonicalOptional(value.fill, ::canonicalColor),
        canonicalOptional(value.foreground, ::canonicalColor),
        canonicalOptional(value.opacity, ::canonicalNumber),
        canonicalOptional(value.radius, ::canonicalDimension),
        canonicalOptional(value.paddingHorizontal, ::canonicalDimension),
        canonicalOptional(value.paddingVertical, ::canonicalDimension),
        canonicalOptional(value.gap, ::canonicalDimension),
        canonicalOptional(value.minWidth, ::canonicalDimension),
        canonicalOptional(value.minHeight, ::canonicalDimension),
        canonicalOptional(value.fontSize, ::canonicalDimension),
        canonicalOptional(value.fontWeight, ::canonicalNumber),
        canonicalOptional(value.lineHeight, ::canonicalNumber),
        canonicalOptional(value.border, ::canonicalBorder),
        canonicalOptional(value.outline, ::canonicalOutline),
        canonicalOptional(value.shadow, ::canonicalShadow),
        canonicalOptional(value.backdropBlur, ::canonicalDimension),
        canonicalOptional(value.transition, ::canonicalTransition),
    ).joinToString(";")})"

private fun canonicalPartMap(values: Map<String, GuiVisualPartStyle>): String =
    values.entries.sortedBy { it.key }.joinToString(",", prefix = "{", postfix = "}") { (key, value) ->
        "${canonicalString(key)}=${canonicalStyle(value)}"
    }

private fun canonicalPartMapGroups(values: Map<String, Map<String, GuiVisualPartStyle>>): String =
    values.entries.sortedBy { it.key }.joinToString(",", prefix = "{", postfix = "}") { (key, value) ->
        "${canonicalString(key)}=${canonicalPartMap(value)}"
    }

private fun canonicalScopedRecipe(value: GuiVisualScopedRecipe): String =
    "W(${canonicalPartMap(value.base)};${canonicalPartMapGroups(value.sizes)};" +
        "${canonicalPartMapGroups(value.states)})"

private fun canonicalVariants(values: Map<String, GuiVisualScopedRecipe>): String =
    values.entries.sortedBy { it.key }.joinToString(",", prefix = "{", postfix = "}") { (key, value) ->
        "${canonicalString(key)}=${canonicalScopedRecipe(value)}"
    }

private fun canonicalRecipe(value: GuiVisualRecipe): String =
    "V(${canonicalPartMap(value.base)};${canonicalPartMapGroups(value.sizes)};" +
        "${canonicalPartMapGroups(value.states)};${canonicalVariants(value.variants)})"
