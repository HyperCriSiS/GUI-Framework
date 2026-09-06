// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidIntegrationRuntimeTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<AndroidIntegrationReferenceActivity>()

    @Test
    fun integrationHostProvidesContextAndKeepsControlsInteractive() {
        composeRule
            .onNodeWithText("Integration action")
            .assertIsDisplayed()
            .performClick()

        composeRule.waitForIdle()
        composeRule
            .onNodeWithText("Integration activations: 1")
            .assertIsDisplayed()
    }
}
