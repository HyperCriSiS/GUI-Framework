// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.semantics.SemanticsActions
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
        composeRule.activity.runOnUiThread { composeRule.activity.applyReferenceTheme(GuiThemeId.MODERN) }
        composeRule.waitForIdle()
        exerciseReferenceControls("Modern reference")
    }

    @Test
    fun glassReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread { composeRule.activity.applyReferenceTheme(GuiThemeId.GLASS) }
        composeRule.waitForIdle()
        exerciseReferenceControls("Glass reference")
    }

    @Test
    fun frostedGlassReferenceFallsBackAndRemainsUsableAtHostScale() {
        composeRule.activity.runOnUiThread { composeRule.activity.applyReferenceTheme(GuiThemeId.FROSTED_GLASS) }
        composeRule.waitForIdle()
        exerciseReferenceControls("Frosted Glass reference")
    }

    @Test
    fun spaceyReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread { composeRule.activity.applyReferenceTheme(GuiThemeId.SPACEY) }
        composeRule.waitForIdle()
        exerciseReferenceControls("Spacey reference")
    }

    @Test
    fun cyberpunkReferenceControlsRemainUsableAtHostScale() {
        composeRule.activity.runOnUiThread { composeRule.activity.applyReferenceTheme(GuiThemeId.CYBERPUNK) }
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
            composeRule.onNodeWithContentDescription("Legacy channel").performScrollTo().assertIsDisplayed().assertIsNotEnabled()
            composeRule.onNodeWithContentDescription("Push").performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Push").assertIsDisplayed()

            val overviewTab = composeRule.onNodeWithText("Overview")
            val metricsTab = composeRule.onNodeWithText("Metrics")
            val logsTab = composeRule.onNodeWithText("Logs")
            overviewTab.performScrollTo().assertIsDisplayed().assertIsSelected()
            metricsTab.assertIsDisplayed().assertIsNotEnabled()
            logsTab.assertIsDisplayed().assertIsNotSelected().performClick()
            composeRule.waitForIdle()
            overviewTab.assertIsNotSelected()
            logsTab.assertIsSelected()
            composeRule.onNodeWithText("Active section: Logs").assertIsDisplayed()

            val tooltipTrigger = composeRule.onNodeWithText("Reload workspace")
            tooltipTrigger.performScrollTo().assertIsDisplayed()
            composeRule.onNodeWithText("Reload the current workspace data.").assertDoesNotExist()
            tooltipTrigger.performSemanticsAction(SemanticsActions.RequestFocus)
            composeRule.waitForIdle()
            tooltipTrigger.assertIsFocused()
            composeRule.onNodeWithText("Reload the current workspace data.").assertIsDisplayed()
            composeRule.onNodeWithText("Open dialog").performScrollTo().assertIsDisplayed().performSemanticsAction(SemanticsActions.RequestFocus)
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Reload the current workspace data.").assertDoesNotExist()

            val menuTrigger = composeRule.onNodeWithText("Open workspace menu")
            menuTrigger.performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithContentDescription("Locked action").assertIsDisplayed().assertIsNotEnabled()
            composeRule.onNodeWithContentDescription("Refresh workspace").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithContentDescription("Refresh workspace").assertDoesNotExist()
            composeRule.onNodeWithText("Last menu action: refresh").assertIsDisplayed()

            val notificationTrigger = composeRule.onNodeWithText("Show notification")
            notificationTrigger.performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Workspace updated").assertIsDisplayed()
            composeRule.onNodeWithText("Your changes were saved.").assertIsDisplayed()
            composeRule.onNodeWithContentDescription("Undo").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Workspace updated").assertDoesNotExist()
            composeRule.onNodeWithText("Last notification action: undo").assertIsDisplayed()

            notificationTrigger.performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithContentDescription("Dismiss notification").assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Workspace updated").assertDoesNotExist()

            composeRule.onNodeWithContentDescription("Workspace sync progress").performScrollTo().assertIsDisplayed()
            composeRule.onNodeWithText("Sync progress: 68%").assertIsDisplayed()
            composeRule.onNodeWithContentDescription("Workspace sync activity").performScrollTo().assertIsDisplayed()
            composeRule.onNodeWithText("Syncing workspace").assertIsDisplayed()

            val workspaceZoom = composeRule.onNodeWithContentDescription("Workspace zoom")
            workspaceZoom.performScrollTo().assertIsDisplayed()
            workspaceZoom.performSemanticsAction(SemanticsActions.SetProgress) { setProgress ->
                setProgress(60f)
            }
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Workspace zoom: 60%").assertIsDisplayed()

            composeRule.onNodeWithContentDescription("Workspace navigation").performScrollTo().assertIsDisplayed()
            composeRule.onNodeWithContentDescription("Workspace navigation rail").performScrollTo().assertIsDisplayed()

            val archiveDestinations = composeRule.onAllNodesWithContentDescription("Archive destination")
            archiveDestinations.assertCountEquals(2)
            archiveDestinations[0].assertIsNotEnabled()
            archiveDestinations[1].assertIsNotEnabled()

            val searchDestinations = composeRule.onAllNodesWithContentDescription("Search destination")
            searchDestinations.assertCountEquals(2)
            searchDestinations[0].performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Active destination: search").assertIsDisplayed()

            val settingsDestinations = composeRule.onAllNodesWithContentDescription("Settings destination")
            settingsDestinations.assertCountEquals(2)
            settingsDestinations[1].performScrollTo().assertIsDisplayed().performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("Active destination: settings").assertIsDisplayed()
        }

        composeRule.onNodeWithText("Open dialog").performScrollTo().assertIsDisplayed().performClick()
        composeRule.onNodeWithText("Close").assertIsDisplayed().performClick()
        composeRule.onNodeWithText("Close").assertDoesNotExist()
    }
}
