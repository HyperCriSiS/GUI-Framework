// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextReplacement
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ShowcaseRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ShowcaseActivity>()

    @Test
    fun explorerStartsAndPrimarySectionsRemainInteractive() {
        composeRule.onNodeWithText("GUI Framework — Showcase Explorer").assertIsDisplayed()
        composeRule.onNodeWithText("Android target").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Theme").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Palette").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Density").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Font scale").assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Viewport").assertIsDisplayed()

        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Workspace name").performScrollTo().assertIsDisplayed().performTextReplacement("Runtime showcase")

        composeRule.onNodeWithText("Screens").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Real-world Screen — Settings").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Compare").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Theme A/B Comparison").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Stress Lab").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Stress Lab — repeated interactive controls").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Stress control 30").performScrollTo().assertIsDisplayed().performClick()
    }

    @Test
    fun qaSelectorsRemainUsable() {
        composeRule.onNodeWithContentDescription("Theme").assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Cyberpunk").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithContentDescription("Palette").assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Light").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithContentDescription("Density").assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Compact").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithContentDescription("Font scale").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Font 150%").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithContentDescription("Viewport").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Phone · 420").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithText("GUI Framework — Showcase Explorer").assertIsDisplayed()
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun galleryCoversComplexDataLayoutAndFeedbackSurfaces() {
        composeRule.onNodeWithText("Data").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Table").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Data Grid").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Tree").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Layout").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Form Layout").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Scroll Container").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Feedback").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Dialog & Toast").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Open dialog").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Confirm operation").assertIsDisplayed()
        composeRule.onNodeWithText("Cancel").assertIsDisplayed().performClick()
    }
}
