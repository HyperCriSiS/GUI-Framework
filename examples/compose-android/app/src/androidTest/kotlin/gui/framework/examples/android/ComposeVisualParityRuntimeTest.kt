// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import gui.framework.examples.showcase.verifyShowcaseComposeVisualParity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class ComposeVisualParityRuntimeTest {
    @Test
    fun sixThemeEffectiveVisualRecipesMatchGeneratedComposeBaseline() {
        val fingerprints = verifyShowcaseComposeVisualParity()

        assertEquals(12, fingerprints.size)
        assertEquals(
            fingerprints["reference-dark/glass"],
            fingerprints["reference-dark/frosted-glass"],
        )
        assertEquals(
            fingerprints["reference-light/glass"],
            fingerprints["reference-light/frosted-glass"],
        )
        assertNotNull(fingerprints["reference-dark/cyberpunk"])
        assertNotNull(fingerprints["reference-light/spacey"])
    }
}
