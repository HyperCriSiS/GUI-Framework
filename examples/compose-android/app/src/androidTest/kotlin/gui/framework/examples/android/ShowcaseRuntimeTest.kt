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

        selectOverflowTab("Showcase section", "Screens")
        composeRule.onNodeWithText("Real-world Screen — Settings").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Showcase section", "Components")
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Workspace name").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Showcase section", "Compare")
        composeRule.onNodeWithText("Theme A/B Comparison").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Showcase section", "Stress Lab")
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
        selectOverflowTab("Showcase section", "Components")
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()
    }

    @Test
    fun galleryCoversComplexDataLayoutAndFeedbackSurfaces() {
        openQaLab()
        selectOverflowTab("Showcase section", "Components")
        composeRule.onNodeWithText("Component Gallery").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Component gallery category", "Data")
        composeRule.onNodeWithContentDescription("Component status table").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Worker data grid").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Framework hierarchy").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Component gallery category", "Layout")
        composeRule.onNodeWithContentDescription("Showcase form").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithContentDescription("Scrollable component sample").performScrollTo().assertIsDisplayed()

        selectOverflowTab("Component gallery category", "Feedback")
        composeRule.onNodeWithText("Dialog & Toast").performScrollTo().assertIsDisplayed()
        composeRule.onNodeWithText("Open dialog").performScrollTo().assertIsDisplayed().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("Confirm operation").assertIsDisplayed()
        composeRule.onNodeWithText("Cancel").assertIsDisplayed().performClick()
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

    private fun openQaLab() {
        composeRule.onNodeWithText("QA Lab").assertIsDisplayed().performClick()
        composeRule.waitForIdle()
    }
}
