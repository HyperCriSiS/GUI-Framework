// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.isDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import org.junit.Rule
import org.junit.Test

class ShowcaseSixThemeRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ShowcaseActivity>()

    @Test
    fun allSixThemesExerciseGalleryScreensComparisonAndStress() {
        composeRule.onNodeWithText("QA Lab").assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        exerciseTheme("Basic")
        exerciseTheme("Modern")
        exerciseTheme("Glass")
        exerciseTheme("Frosted Glass")
        exerciseTheme("Spacey")
        exerciseTheme("Cyberpunk")
    }

    private fun exerciseTheme(theme: String) {
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

        selectOverflowTab("Showcase section", "Screens")
        composeRule.onNodeWithText("Real-world Screen — Settings").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Showcase section", "Components")
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Workspace name").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Showcase section", "Compare")
        composeRule.onNodeWithText("Theme A/B Comparison").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Showcase section", "Stress Lab")
        composeRule
            .onNodeWithText("Stress Lab — repeated interactive controls")
            .performScrollTo()
            .assertIsDisplayed()
    }

    private fun selectOverflowTab(accessibilityLabel: String, tabText: String) {
        val tabList = composeRule.onNodeWithContentDescription(accessibilityLabel)
        tabList.performScrollTo().assertIsDisplayed()
        tabList.performSemanticsAction(SemanticsActions.ScrollBy) { scrollBy ->
            scrollBy(-Float.MAX_VALUE, 0f)
        }
        composeRule.waitForIdle()

        val tab = composeRule.onNodeWithText(tabText)
        for (attempt in 0 until 24) {
            if (tab.isDisplayed()) {
                tab.performClick()
                composeRule.waitForIdle()
                return
            }
            tabList.performSemanticsAction(SemanticsActions.ScrollBy) { scrollBy ->
                scrollBy(120f, 0f)
            }
            composeRule.waitForIdle()
        }

        tab.assertIsDisplayed().performClick()
        composeRule.waitForIdle()
    }
}
