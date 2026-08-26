// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextReplacement
import androidx.test.ext.junit.runners.AndroidJUnit4
import gui.framework.generated.internal.GuiThemeId
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferenceRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun referenceControlsRemainUsableAtHostScale() {
        exerciseReferenceControls("Scaled reference", includeExtendedComponents = true)
    }

    @Test
    fun compactReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.applyReferenceDensity(ReferenceDensity.Compact)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Compact reference", includeExtendedComponents = true)
    }

    @Test
    fun modernReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.applyReferenceTheme(GuiThemeId.MODERN)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Modern reference")
    }

    @Test
    fun glassReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.applyReferenceTheme(GuiThemeId.GLASS)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Glass reference")
    }

    @Test
    fun frostedGlassReferenceFallsBackAndRemainsUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.applyReferenceTheme(GuiThemeId.FROSTED_GLASS)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Frosted Glass reference")
    }

    @Test
    fun spaceyReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.applyReferenceTheme(GuiThemeId.SPACEY)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Spacey reference")
    }

    @Test
    fun cyberpunkReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.applyReferenceTheme(GuiThemeId.CYBERPUNK)
        }
        composeRule.waitForIdle()

        exerciseReferenceControls("Cyberpunk reference")
    }

    private fun exerciseReferenceControls(
        replacement: String,
        includeExtendedComponents: Boolean = false,
    ) {
        composeRule
            .onNodeWithContentDescription("Reference name")
            .assertIsDisplayed()
            .performTextReplacement(replacement)

        val referenceSwitch = composeRule.onNodeWithContentDescription("Reference switch")
        referenceSwitch.assertIsDisplayed().performClick()
        referenceSwitch.performClick()

        if (includeExtendedComponents) {
            val referenceCheckbox = composeRule.onNodeWithContentDescription("Reference checkbox")
            referenceCheckbox.assertIsDisplayed().performClick()
            referenceCheckbox.performClick()

            val summaryRadio = composeRule.onNodeWithContentDescription("Summary review")
            val detailedRadio = composeRule.onNodeWithContentDescription("Detailed review")
            summaryRadio.assertIsDisplayed().assertIsSelected()
            detailedRadio.assertIsDisplayed().assertIsNotSelected().performClick()
            composeRule.waitForIdle()
            summaryRadio.assertIsNotSelected()
            detailedRadio.assertIsSelected()

            val deliverySelect = composeRule.onNodeWithContentDescription("Delivery channel")
            deliverySelect.assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule
                .onNodeWithContentDescription("Legacy channel")
                .assertIsDisplayed()
                .assertIsNotEnabled()
            composeRule
                .onNodeWithContentDescription("Push")
                .assertIsDisplayed()
                .performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Push").assertIsDisplayed()
        }

        composeRule
            .onNodeWithText("Open dialog")
            .performScrollTo()
            .assertIsDisplayed()
            .performClick()

        composeRule
            .onNodeWithText("Close")
            .assertIsDisplayed()
            .performClick()

        composeRule.onNodeWithText("Close").assertDoesNotExist()
    }
}
