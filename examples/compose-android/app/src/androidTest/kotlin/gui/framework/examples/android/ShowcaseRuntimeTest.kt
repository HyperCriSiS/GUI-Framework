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

        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
        composeRule
            .onNodeWithContentDescription("Workspace name")
            .performScrollTo()
            .assertIsDisplayed()
            .performTextReplacement("Runtime showcase")

        composeRule.onNodeWithText("Screens").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Real-world Screen — Settings").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Stress Lab").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule
            .onNodeWithText("Stress Lab — repeated interactive controls")
            .performScrollTo()
            .assertIsDisplayed()
        composeRule.onNodeWithText("Stress control 30").performScrollTo().assertIsDisplayed().performClick()
    }

    @Test
    fun themePaletteAndDensitySelectorsRemainUsable() {
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

        composeRule.onNodeWithText("GUI Framework — Showcase Explorer").assertIsDisplayed()
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Primary action").performScrollTo().assertIsDisplayed().performClick()
    }
}
