// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeLeft
import androidx.compose.ui.test.swipeRight
import org.junit.Rule
import org.junit.Test

class ShowcaseSixThemeRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ShowcaseActivity>()

    @Test
    fun allSixThemesExerciseGalleryScreensComparisonAndStress() {
        composeRule.onNodeWithText("QA Lab").assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        val themes = listOf(
            "Basic",
            "Modern",
            "Glass",
            "Frosted Glass",
            "Spacey",
            "Cyberpunk",
        )

        for (theme in themes) {
            composeRule
                .onNodeWithContentDescription("Theme")
                .performScrollTo()
                .assertIsDisplayed()
                .performClick()
            composeRule.waitForIdle()
            composeRule
                .onNodeWithContentDescription(theme)
                .performScrollTo()
                .assertIsDisplayed()
                .performClick()
            composeRule.waitForIdle()

            swipeTabsRight("Showcase section")
            composeRule.onNodeWithText("Screens").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Real-world Screen — Settings").performScrollTo().assertIsDisplayed()

            swipeTabsLeft("Showcase section")
            composeRule.onNodeWithText("Components").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
            composeRule.onNodeWithContentDescription("Workspace name").performScrollTo().assertIsDisplayed()

            composeRule.onNodeWithText("Compare").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Theme A/B Comparison").performScrollTo().assertIsDisplayed()

            composeRule.onNodeWithText("Stress Lab").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule
                .onNodeWithText("Stress Lab — repeated interactive controls")
                .performScrollTo()
                .assertIsDisplayed()
        }
    }

    private fun swipeTabsLeft(accessibilityLabel: String) {
        composeRule.onNodeWithContentDescription(accessibilityLabel).performScrollTo().assertIsDisplayed().performTouchInput { swipeLeft() }
        composeRule.waitForIdle()
    }

    private fun swipeTabsRight(accessibilityLabel: String) {
        composeRule.onNodeWithContentDescription(accessibilityLabel).performScrollTo().assertIsDisplayed().performTouchInput { swipeRight() }
        composeRule.waitForIdle()
    }
}
