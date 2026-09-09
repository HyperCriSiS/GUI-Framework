// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.desktop

import gui.framework.examples.showcase.verifyShowcaseComposeVisualParity

fun main() {
    val fingerprints = verifyShowcaseComposeVisualParity()
    check(fingerprints.size == 12) {
        "Compose Desktop visual parity expected 12 palette/theme fingerprints, found ${fingerprints.size}"
    }
    println(
        "Compose Desktop visual parity verified for " +
            "${fingerprints.keys.sorted().joinToString()}",
    )
}
