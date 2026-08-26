// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import androidx.compose.ui.test.junit4.createAndroidComposeRule
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
        exerciseReferenceControls(replacement = "Android runtime")
    }

    @Test
    fun compactReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setCompactReferenceMode(true)
        }
        composeRule.waitForIdle()
        exerciseReferenceControls(
            replacement = "Compact runtime",
            includeExtendedComponents = true,
        )
    }

    @Test
    fun basicReferenceThemeCanBeSelected() {
        composeRule
            .onNodeWithText("Basic", substring = true)
            .performScrollTo()
            .assertIsDisplayed()
    }

    @Test
    fun modernReferenceThemeCanBeSelected() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setReferenceTheme("modern")
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Modern", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun glassReferenceThemeCanBeSelected() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setReferenceTheme("glass")
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Glass", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun frostedReferenceThemeCanBeSelected() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setReferenceTheme("frosted-glass")
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Frosted Glass", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun spaceyReferenceThemeCanBeSelected() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setReferenceTheme("spacey")
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Spacey", substring = true).performScrollTo().assertIsDisplayed()
    }

    @Test
    fun cyberpunkReferenceThemeCanBeSelected() {
        composeRule.activity.runOnUiThread {
            composeRule.activity.setReferenceTheme("cyberpunk")
        }
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Cyberpunk", substring = true).performScrollTo().assertIsDisplayed()
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
            composeRule.waitUntilAtLeastOneExists(
                matcher = hasContentDescription("Legacy channel"),
                timeoutMillis = 2_000,
            )
            composeRule
                .onNodeWithContentDescription("Legacy channel")
                .performScrollTo()
                .assertIsDisplayed()
                .assertIsNotEnabled()
            composeRule
                .onNodeWithContentDescription("Push")
                .performScrollTo()
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
