// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextReplacement
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferenceRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun referenceControlsRemainUsableAtHostScale() {
        exerciseReferenceControls("Scaled reference")
    }

    @Test
    fun compactReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setReferenceDensity(ReferenceDensity.Compact)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Compact reference")
    }

    private fun exerciseReferenceControls(replacement: String) {
        composeRule
            .onNodeWithContentDescription("Reference name")
            .assertIsDisplayed()
            .performTextReplacement(replacement)

        val referenceSwitch = composeRule.onNodeWithContentDescription("Reference switch")
        referenceSwitch.assertIsDisplayed().performClick()
        referenceSwitch.performClick()

        composeRule
            .onNodeWithText("Open dialog")
            .assertIsDisplayed()
            .performClick()

        composeRule
            .onNodeWithText("Close")
            .assertIsDisplayed()
            .performClick()

        composeRule.onNodeWithText("Close").assertDoesNotExist()
    }
}
