// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import gui.framework.compose.GuiButton
import gui.framework.generated.internal.GuiThemeId
import gui.framework.integration.android.GuiAndroidHost
import gui.framework.integration.android.GuiAndroidSurface
import gui.framework.integration.android.LocalGuiAndroidHostContext

class AndroidIntegrationReferenceActivity : ComponentActivity() {
    private var activations by mutableStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GuiAndroidHost(
                theme = GuiThemeId.BASIC,
                paletteId = "reference-dark",
                surface = GuiAndroidSurface.APPLICATION,
                availableCapabilities = emptySet(),
            ) {
                check(LocalGuiAndroidHostContext.current.surface == GuiAndroidSurface.APPLICATION)
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    BasicText("GUI Framework Android integration")
                    GuiButton(
                        label = "Integration action",
                        onActivate = { activations += 1 },
                    )
                    BasicText("Integration activations: $activations")
                }
            }
        }
    }
}
