// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.showcase

import androidx.compose.runtime.Composable
import gui.framework.compose.GuiSelectOption
import gui.framework.generated.internal.GuiSelectSize

/**
 * Positional convenience overload used only by the Showcase configuration rows.
 * Parameter names intentionally differ from the public adapter so normal named
 * GuiSelect calls continue to resolve directly to the framework component.
 */
@Composable
internal fun GuiSelect(
    selectedValue: String,
    choices: List<GuiSelectOption>,
    requestValueChange: (String) -> Unit,
    isExpanded: Boolean,
    requestExpandedChange: (Boolean) -> Unit,
    accessibilityLabel: String,
    size: GuiSelectSize,
) {
    gui.framework.compose.GuiSelect(
        value = selectedValue,
        options = choices,
        onValueChange = requestValueChange,
        expanded = isExpanded,
        onExpandedChange = requestExpandedChange,
        accessibilityLabel = accessibilityLabel,
        size = size,
    )
}
