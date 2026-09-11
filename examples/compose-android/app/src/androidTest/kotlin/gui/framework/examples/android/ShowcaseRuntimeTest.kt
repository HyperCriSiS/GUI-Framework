// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ShowcaseRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<ShowcaseActivity>()

    @Test
    fun designGalleryIsPrimaryAndQaLabRemainsReachable() {
        composeRule.onNodeWithText("Designs").assertIsDisplayed()
        composeRule.onNodeWithText("QA Lab").assertIsDisplayed()

        composeRule.onNodeWithContentDescription("Basic design preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Modern design preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Glass design preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Frosted Glass design preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Spacey design preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Cyberpunk design preview").performScrollTo().assertIsDisplayed()

        openQaLab()
        composeRule.onNodeWithText("GUI Framework — Showcase Explorer").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Designs").assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Basic design preview").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun qaExplorerPrimarySectionsRemainInteractive() {
        openQaLab()
        composeRule.onNodeWithText("GUI Framework — Showcase Explorer").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Android target · QA Lab").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Theme Gallery").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Basic theme preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Cyberpunk theme preview").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Theme").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Palette").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Density").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Font scale").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Viewport").performScrollTo().assertIsDisplayed()

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
        composeRule.onNodeWithText("Stress Lab — repeated interactive controls").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Stress control 30").performScrollTo().assertIsDisplayed().performClick()
    }

    @Test
    fun qaSelectorsRemainUsable() {
        openQaLab()
        composeRule.onNodeWithContentDescription("Theme").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Cyberpunk").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithContentDescription("Palette").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Light").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()

        composeRule.onNodeWithContentDescription("Density").performScrollTo().assertIsDisplayed().performClick()
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

        composeRule.onNodeWithText("GUI Framework — Showcase Explorer").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Components").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun galleryCoversComplexDataLayoutAndFeedbackSurfaces() {
        openQaLab()
        composeRule.onNodeWithText("Components").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Data").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Component status table").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Worker data grid").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Framework hierarchy").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Layout").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithContentDescription("Showcase form").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Scrollable component sample").performScrollTo().assertIsDisplayed()

        composeRule.onNodeWithText("Feedback").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Dialog & Toast").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Open dialog").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Confirm operation").assertIsDisplayed()
        composeRule.onNodeWithText("Cancel").assertIsDisplayed().performClick()
    }

    private fun openQaLab() {
        composeRule.onNodeWithText("QA Lab").assertIsDisplayed().performClick()
        composeRule.waitForIdle()
    }
}
