// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import gui.framework.compose.internal.resolveGuiVisualRecipe
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeDp
import gui.framework.compose.internal.toComposeUnitlessFloat
import gui.framework.generated.internal.GuiDialogSize
import gui.framework.generated.internal.GuiDialogState
import gui.framework.generated.internal.GuiDialogVariant
import gui.framework.generated.internal.GuiVisualPartStyle
import gui.framework.generated.internal.GuiVisualRegistry

private fun GuiVisualPartStyle.dialogOpacity(): Float {
    val value = opacity?.toComposeUnitlessFloat() ?: 1f
    require(value in 0f..1f) { "GUI opacity must be in the range 0..1" }
    return value
}

/**
 * Native modal Compose dialog driven by the neutral GUI dialog recipe.
 * The caller owns the controlled open state; native dismissal routes are exposed
 * only through the neutral onDismissRequest callback.
 */
@Composable
fun GuiDialog(
    open: Boolean,
    accessibilityLabel: String,
    dismissible: Boolean = true,
    modifier: Modifier = Modifier,
    variant: GuiDialogVariant = GuiDialogVariant.STANDARD,
    size: GuiDialogSize = GuiDialogSize.MEDIUM,
    onDismissRequest: () -> Unit,
    content: @Composable BoxScope.() -> Unit,
) {
    require(accessibilityLabel.isNotBlank()) {
        "GUI dialog accessibilityLabel must be a non-empty string"
    }
    if (!open) return

    val selection = LocalGuiThemeSelection.current
    val recipe = GuiVisualRegistry.component(
        paletteId = selection.paletteId,
        themeId = selection.theme.wireValue,
        componentId = "dialog",
    ) ?: error(
        "No Compose visual recipe for dialog with theme ${selection.theme.wireValue} and palette ${selection.paletteId}",
    )

    val resolved = resolveGuiVisualRecipe(
        recipe = recipe,
        variant = variant.wireValue,
        size = size.wireValue,
        activeStates = emptySet<String>(),
        statePriority = GuiDialogState.entries.map { it.wireValue },
    )
    val root = resolved["root"] ?: error("Resolved GUI dialog visual is missing required root part")
    val radius = root.radius?.toComposeDp() ?: 0.dp
    val shape = RoundedCornerShape(radius)

    Dialog(
        onDismissRequest = {
            if (dismissible) onDismissRequest()
        },
        properties = DialogProperties(
            dismissOnBackPress = dismissible,
            dismissOnClickOutside = dismissible,
        ),
    ) {
        var dialogModifier = modifier
            .defaultMinSize(
                minWidth = root.minWidth?.toComposeDp() ?: 0.dp,
                minHeight = root.minHeight?.toComposeDp() ?: 0.dp,
            )
            .clip(shape)

        root.fill?.let { dialogModifier = dialogModifier.background(it.toComposeColor(), shape) }
        root.border?.let {
            dialogModifier = dialogModifier.border(it.width.toComposeDp(), it.color.toComposeColor(), shape)
        }

        dialogModifier = dialogModifier
            .alpha(root.dialogOpacity())
            .semantics { paneTitle = accessibilityLabel }
            .padding(
                horizontal = root.paddingHorizontal?.toComposeDp() ?: 0.dp,
                vertical = root.paddingVertical?.toComposeDp() ?: 0.dp,
            )

        Box(
            modifier = dialogModifier,
            content = content,
        )
    }
}
