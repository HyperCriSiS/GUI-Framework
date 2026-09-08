// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import gui.framework.examples.showcase.ShowcaseExplorer

class ShowcaseActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShowcaseExplorer(
                platformLabel = "Android target",
                stressControlCount = 30,
            )
        }
    }
}
