// SPDX-License-Identifier: AGPL-3.0-or-later
package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
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

            composeRule.onNodeWithText("Components").performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
            composeRule.onNodeWithContentDescription("Workspace name").performScrollTo().assertIsDisplayed()

            composeRule.onNodeWithText("Screens").performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Real-world Screen — Settings").performScrollTo().assertIsDisplayed()

            composeRule.onNodeWithText("Compare").performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Theme A/B Comparison").performScrollTo().assertIsDisplayed()

            composeRule.onNodeWithText("Stress Lab").performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule
                .onNodeWithText("Stress Lab — repeated interactive controls")
                .performScrollTo()
                .assertIsDisplayed()
        }
    }
}
