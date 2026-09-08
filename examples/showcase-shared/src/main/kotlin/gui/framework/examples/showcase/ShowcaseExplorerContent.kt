// SPDX-License-Identifier: AGPL-3.0-or-later

package gui.framework.examples.showcase

import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import gui.framework.compose.GuiButton
import gui.framework.compose.GuiCheckbox
import gui.framework.compose.GuiDataGrid
import gui.framework.compose.GuiDataGridColumn
import gui.framework.compose.GuiDataGridRow
import gui.framework.compose.GuiDialog
import gui.framework.compose.GuiFormActions
import gui.framework.compose.GuiFormField
import gui.framework.compose.GuiFormLayout
import gui.framework.compose.GuiFormLayoutSection
import gui.framework.compose.GuiInput
import gui.framework.compose.GuiMenu
import gui.framework.compose.GuiMenuItem
import gui.framework.compose.GuiNavigation
import gui.framework.compose.GuiNavigationItem
import gui.framework.compose.GuiPanel
import gui.framework.compose.GuiProgress
import gui.framework.compose.GuiRadio
import gui.framework.compose.GuiRadioGroup
import gui.framework.compose.GuiScrollContainer
import gui.framework.compose.GuiSelect
import gui.framework.compose.GuiSelectOption
import gui.framework.compose.GuiSlider
import gui.framework.compose.GuiSwitch
import gui.framework.compose.GuiTabItem
import gui.framework.compose.GuiTable
import gui.framework.compose.GuiTableColumn
import gui.framework.compose.GuiTableRow
import gui.framework.compose.GuiTabs
import gui.framework.compose.GuiTheme
import gui.framework.compose.GuiToast
import gui.framework.compose.GuiTooltip
import gui.framework.compose.GuiTree
import gui.framework.compose.GuiTreeItem
import gui.framework.compose.internal.toComposeColor
import gui.framework.compose.internal.toComposeSp
import gui.framework.generated.internal.GuiButtonSize
import gui.framework.generated.internal.GuiCheckboxSize
import gui.framework.generated.internal.GuiColorValue
import gui.framework.generated.internal.GuiDataGridSize
import gui.framework.generated.internal.GuiDimensionValue
import gui.framework.generated.internal.GuiFormLayoutSize
import gui.framework.generated.internal.GuiInputSize
import gui.framework.generated.internal.GuiNavigationSize
import gui.framework.generated.internal.GuiNumberValue
import gui.framework.generated.internal.GuiPaletteTokens
import gui.framework.generated.internal.GuiPanelSize
import gui.framework.generated.internal.GuiProgressSize
import gui.framework.generated.internal.GuiRadioSize
import gui.framework.generated.internal.GuiScrollContainerSize
import gui.framework.generated.internal.GuiSelectSize
import gui.framework.generated.internal.GuiSliderSize
import gui.framework.generated.internal.GuiSwitchSize
import gui.framework.generated.internal.GuiTableSize
import gui.framework.generated.internal.GuiTabsSize
import gui.framework.generated.internal.GuiThemeId
import gui.framework.generated.internal.GuiTreeSize
import kotlin.math.roundToInt

private enum class ShowcaseDensity { Standard, Compact }
private enum class ShowcaseTextRole { Title, Heading, Body, Muted }
private enum class ShowcaseViewport(val label: String, val maxWidthDp: Int?) {
    Auto("Auto", null),
    Phone("Phone · 420", 420),
    Tablet("Tablet · 760", 760),
    Desktop("Desktop · 1180", 1180),
}

private val themeOptions = listOf(
    GuiSelectOption(value = "basic", label = "Basic"),
    GuiSelectOption(value = "modern", label = "Modern"),
    GuiSelectOption(value = "glass", label = "Glass"),
    GuiSelectOption(value = "frosted-glass", label = "Frosted Glass"),
    GuiSelectOption(value = "spacey", label = "Spacey"),
    GuiSelectOption(value = "cyberpunk", label = "Cyberpunk"),
)

private fun GuiThemeId.showcaseValue(): String = when (this) {
    GuiThemeId.BASIC -> "basic"
    GuiThemeId.MODERN -> "modern"
    GuiThemeId.GLASS -> "glass"
    GuiThemeId.FROSTED_GLASS -> "frosted-glass"
    GuiThemeId.SPACEY -> "spacey"
    GuiThemeId.CYBERPUNK -> "cyberpunk"
}

private fun showcaseTheme(value: String): GuiThemeId = when (value) {
    "modern" -> GuiThemeId.MODERN
    "glass" -> GuiThemeId.GLASS
    "frosted-glass" -> GuiThemeId.FROSTED_GLASS
    "spacey" -> GuiThemeId.SPACEY
    "cyberpunk" -> GuiThemeId.CYBERPUNK
    else -> GuiThemeId.BASIC
}

private fun showcaseColor(paletteId: String, tokenPath: String): Color {
    val token = GuiPaletteTokens.semantic(paletteId)[tokenPath] as? GuiColorValue
        ?: error("Showcase palette $paletteId is missing color token $tokenPath")
    return token.toComposeColor()
}

private fun showcaseDimension(tokenPath: String): GuiDimensionValue =
    gui.framework.generated.internal.GuiPrimitiveTokens.all[tokenPath] as? GuiDimensionValue
        ?: error("Showcase is missing dimension token $tokenPath")

private fun showcaseNumber(tokenPath: String): GuiNumberValue =
    gui.framework.generated.internal.GuiPrimitiveTokens.all[tokenPath] as? GuiNumberValue
        ?: error("Showcase is missing number token $tokenPath")

@Composable
private fun ShowcaseText(
    text: String,
    paletteId: String,
    role: ShowcaseTextRole = ShowcaseTextRole.Body,
) {
    val sizeTokenPath = when (role) {
        ShowcaseTextRole.Title, ShowcaseTextRole.Heading -> "typography.size.large"
        ShowcaseTextRole.Body -> "typography.size.medium"
        ShowcaseTextRole.Muted -> "typography.size.small"
    }
    val sizeToken = showcaseDimension(sizeTokenPath)
    val lineHeightMultiplier = showcaseNumber("typography.lineHeight.control").value
    val fontWeight = if (role == ShowcaseTextRole.Title || role == ShowcaseTextRole.Heading) {
        FontWeight(showcaseNumber("typography.weight.medium").value.roundToInt())
    } else {
        null
    }
    val colorPath = if (role == ShowcaseTextRole.Muted) "semantic.color.textSecondary" else "semantic.color.textPrimary"
    BasicText(
        text = text,
        style = TextStyle(
            color = showcaseColor(paletteId, colorPath),
            fontSize = sizeToken.toComposeSp(),
            fontWeight = fontWeight,
            lineHeight = (sizeToken.value * lineHeightMultiplier).toFloat().sp,
        ),
    )
}

private data class ShowcaseSizes(
    val button: GuiButtonSize,
    val checkbox: GuiCheckboxSize,
    val dataGrid: GuiDataGridSize,
    val form: GuiFormLayoutSize,
    val input: GuiInputSize,
    val navigation: GuiNavigationSize,
    val panel: GuiPanelSize,
    val progress: GuiProgressSize,
    val radio: GuiRadioSize,
    val scroll: GuiScrollContainerSize,
    val select: GuiSelectSize,
    val slider: GuiSliderSize,
    val switch: GuiSwitchSize,
    val table: GuiTableSize,
    val tabs: GuiTabsSize,
    val tree: GuiTreeSize,
)

private fun showcaseSizes(compact: Boolean) = ShowcaseSizes(
    button = if (compact) GuiButtonSize.SMALL else GuiButtonSize.MEDIUM,
    checkbox = if (compact) GuiCheckboxSize.SMALL else GuiCheckboxSize.MEDIUM,
    dataGrid = if (compact) GuiDataGridSize.SMALL else GuiDataGridSize.MEDIUM,
    form = if (compact) GuiFormLayoutSize.SMALL else GuiFormLayoutSize.MEDIUM,
    input = if (compact) GuiInputSize.SMALL else GuiInputSize.MEDIUM,
    navigation = if (compact) GuiNavigationSize.SMALL else GuiNavigationSize.MEDIUM,
    panel = if (compact) GuiPanelSize.SMALL else GuiPanelSize.MEDIUM,
    progress = if (compact) GuiProgressSize.SMALL else GuiProgressSize.MEDIUM,
    radio = if (compact) GuiRadioSize.SMALL else GuiRadioSize.MEDIUM,
    scroll = if (compact) GuiScrollContainerSize.SMALL else GuiScrollContainerSize.MEDIUM,
    select = if (compact) GuiSelectSize.SMALL else GuiSelectSize.MEDIUM,
    slider = if (compact) GuiSliderSize.SMALL else GuiSliderSize.MEDIUM,
    switch = if (compact) GuiSwitchSize.SMALL else GuiSwitchSize.MEDIUM,
    table = if (compact) GuiTableSize.SMALL else GuiTableSize.MEDIUM,
    tabs = if (compact) GuiTabsSize.SMALL else GuiTabsSize.MEDIUM,
    tree = if (compact) GuiTreeSize.SMALL else GuiTreeSize.MEDIUM,
)

@Composable
fun ShowcaseExplorer(platformLabel: String, stressControlCount: Int = 40) {
    var theme by remember { mutableStateOf(GuiThemeId.BASIC) }
    var compareTheme by remember { mutableStateOf(GuiThemeId.CYBERPUNK) }
    var paletteId by remember { mutableStateOf("reference-dark") }
    var density by remember { mutableStateOf(ShowcaseDensity.Standard) }
    var fontScale by remember { mutableStateOf(1f) }
    var viewport by remember { mutableStateOf(ShowcaseViewport.Auto) }
    var section by remember { mutableStateOf("components") }
    var themeExpanded by remember { mutableStateOf(false) }
    var paletteExpanded by remember { mutableStateOf(false) }
    var densityExpanded by remember { mutableStateOf(false) }
    var fontScaleExpanded by remember { mutableStateOf(false) }
    var viewportExpanded by remember { mutableStateOf(false) }
    val baseDensity = LocalDensity.current
    val qaDensity = remember(baseDensity.density, fontScale) { Density(baseDensity.density, fontScale) }

    CompositionLocalProvider(LocalDensity provides qaDensity) {
        GuiTheme(theme = theme, paletteId = paletteId) {
            val sizes = showcaseSizes(density == ShowcaseDensity.Compact)
            Box(
                modifier = Modifier.fillMaxSize().background(showcaseColor(paletteId, "semantic.color.background")),
                contentAlignment = Alignment.TopCenter,
            ) {
                val viewportModifier = viewport.maxWidthDp?.let {
                    Modifier.fillMaxWidth().widthIn(max = it.dp)
                } ?: Modifier.fillMaxWidth()
                Column(
                    modifier = viewportModifier.verticalScroll(rememberScrollState()).padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    ShowcaseText("GUI Framework — Showcase Explorer", paletteId, ShowcaseTextRole.Title)
                    ShowcaseText(platformLabel, paletteId, ShowcaseTextRole.Muted)
                    ConfigurationPanel(
                        theme, { theme = it }, paletteId, { paletteId = it }, density, { density = it },
                        fontScale, { fontScale = it }, viewport, { viewport = it }, themeExpanded,
                        { themeExpanded = it }, paletteExpanded, { paletteExpanded = it }, densityExpanded,
                        { densityExpanded = it }, fontScaleExpanded, { fontScaleExpanded = it }, viewportExpanded,
                        { viewportExpanded = it }, sizes,
                    )
                    GuiTabs(
                        value = section,
                        tabs = listOf(
                            GuiTabItem(value = "components", label = "Components"),
                            GuiTabItem(value = "screens", label = "Screens"),
                            GuiTabItem(value = "compare", label = "Compare"),
                            GuiTabItem(value = "stress", label = "Stress Lab"),
                        ),
                        onValueChange = { section = it },
                        accessibilityLabel = "Showcase section",
                        size = sizes.tabs,
                    ) { selected -> ShowcaseText("Section: ${selected.label}", paletteId, ShowcaseTextRole.Muted) }
                    when (section) {
                        "screens" -> RealWorldScreens(paletteId, sizes)
                        "compare" -> ThemeComparison(theme, compareTheme, { compareTheme = it }, paletteId, sizes)
                        "stress" -> StressLab(paletteId, sizes, stressControlCount)
                        else -> ComponentGallery(paletteId, sizes)
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfigurationPanel(
    theme: GuiThemeId,
    onThemeChange: (GuiThemeId) -> Unit,
    paletteId: String,
    onPaletteChange: (String) -> Unit,
    density: ShowcaseDensity,
    onDensityChange: (ShowcaseDensity) -> Unit,
    fontScale: Float,
    onFontScaleChange: (Float) -> Unit,
    viewport: ShowcaseViewport,
    onViewportChange: (ShowcaseViewport) -> Unit,
    themeExpanded: Boolean,
    onThemeExpandedChange: (Boolean) -> Unit,
    paletteExpanded: Boolean,
    onPaletteExpandedChange: (Boolean) -> Unit,
    densityExpanded: Boolean,
    onDensityExpandedChange: (Boolean) -> Unit,
    fontScaleExpanded: Boolean,
    onFontScaleExpandedChange: (Boolean) -> Unit,
    viewportExpanded: Boolean,
    onViewportExpandedChange: (Boolean) -> Unit,
    sizes: ShowcaseSizes,
) {
    GuiPanel(accessibilityLabel = "Showcase configuration", size = sizes.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ShowcaseText("Theme & QA controls", paletteId, ShowcaseTextRole.Heading)
            GuiSelect(theme.showcaseValue(), themeOptions, { onThemeChange(showcaseTheme(it)) }, themeExpanded, onThemeExpandedChange, accessibilityLabel = "Theme", size = sizes.select)
            GuiSelect(
                value = paletteId,
                options = listOf(GuiSelectOption("reference-dark", "Dark"), GuiSelectOption("reference-light", "Light")),
                onValueChange = onPaletteChange,
                expanded = paletteExpanded,
                onExpandedChange = onPaletteExpandedChange,
                accessibilityLabel = "Palette",
                size = sizes.select,
            )
            GuiSelect(
                value = density.name.lowercase(),
                options = listOf(GuiSelectOption("standard", "Standard"), GuiSelectOption("compact", "Compact")),
                onValueChange = { onDensityChange(if (it == "compact") ShowcaseDensity.Compact else ShowcaseDensity.Standard) },
                expanded = densityExpanded,
                onExpandedChange = onDensityExpandedChange,
                accessibilityLabel = "Density",
                size = sizes.select,
            )
            GuiSelect(
                value = fontScale.toString(),
                options = listOf(GuiSelectOption("1.0", "Font 100%"), GuiSelectOption("1.25", "Font 125%"), GuiSelectOption("1.5", "Font 150%")),
                onValueChange = { onFontScaleChange(it.toFloat()) },
                expanded = fontScaleExpanded,
                onExpandedChange = onFontScaleExpandedChange,
                accessibilityLabel = "Font scale",
                size = sizes.select,
            )
            GuiSelect(
                value = viewport.name.lowercase(),
                options = ShowcaseViewport.entries.map { GuiSelectOption(it.name.lowercase(), it.label) },
                onValueChange = { value -> onViewportChange(ShowcaseViewport.entries.first { it.name.equals(value, true) }) },
                expanded = viewportExpanded,
                onExpandedChange = onViewportExpandedChange,
                accessibilityLabel = "Viewport",
                size = sizes.select,
            )
        }
    }
}

@Composable
private fun ComponentGallery(paletteId: String, sizes: ShowcaseSizes) {
    var page by remember { mutableStateOf("controls") }
    ShowcaseText("Component Gallery", paletteId, ShowcaseTextRole.Heading)
    GuiTabs(
        value = page,
        tabs = listOf(GuiTabItem("controls", "Controls"), GuiTabItem("data", "Data"), GuiTabItem("layout", "Layout"), GuiTabItem("feedback", "Feedback")),
        onValueChange = { page = it },
        accessibilityLabel = "Component gallery category",
        size = sizes.tabs,
    ) { selected -> ShowcaseText(selected.label, paletteId, ShowcaseTextRole.Muted) }
    when (page) {
        "data" -> DataComponents(paletteId, sizes)
        "layout" -> LayoutComponents(paletteId, sizes)
        "feedback" -> FeedbackComponents(paletteId, sizes)
        else -> ControlComponents(paletteId, sizes)
    }
}

@Composable
private fun ControlComponents(paletteId: String, sizes: ShowcaseSizes) {
    var text by remember { mutableStateOf("Atlas") }
    var checked by remember { mutableStateOf(true) }
    var radio by remember { mutableStateOf("alpha") }
    var enabled by remember { mutableStateOf(true) }
    var slider by remember { mutableStateOf(42.0) }
    var selected by remember { mutableStateOf("balanced") }
    var selectExpanded by remember { mutableStateOf(false) }

    GalleryPanel("Buttons", "Button states and interaction", paletteId, sizes.panel) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GuiButton("Primary", onActivate = {}, size = sizes.button)
            GuiButton("Loading", onActivate = {}, loading = true, size = sizes.button)
            GuiButton("Disabled", onActivate = {}, disabled = true, size = sizes.button)
        }
    }
    GalleryPanel("Input & Select", "Editable and controlled choice states", paletteId, sizes.panel) {
        GuiInput(value = text, onValueChange = { text = it }, placeholder = "Workspace name", accessibilityLabel = "Workspace name", size = sizes.input)
        GuiInput(value = "Read-only example", onValueChange = {}, placeholder = "Disabled input", accessibilityLabel = "Disabled input", disabled = true, size = sizes.input)
        GuiSelect(
            value = selected,
            options = listOf(GuiSelectOption("performance", "Performance"), GuiSelectOption("balanced", "Balanced"), GuiSelectOption("quality", "Quality")),
            onValueChange = { selected = it },
            expanded = selectExpanded,
            onExpandedChange = { selectExpanded = it },
            accessibilityLabel = "Mode selection",
            size = sizes.select,
        )
    }
    GalleryPanel("Selection controls", "Checkbox, tri-state, radio and switch", paletteId, sizes.panel) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GuiCheckbox(checked, { checked = it }, "Checkbox", size = sizes.checkbox)
            ShowcaseText(if (checked) "Checked" else "Unchecked", paletteId)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GuiCheckbox(false, {}, "Indeterminate checkbox", indeterminate = true, size = sizes.checkbox)
            ShowcaseText("Indeterminate", paletteId)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GuiCheckbox(false, {}, "Disabled checkbox", disabled = true, size = sizes.checkbox)
            ShowcaseText("Disabled", paletteId)
        }
        GuiRadioGroup(groupName = "showcase-radio") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("alpha" to "Alpha", "beta" to "Beta", "gamma" to "Gamma").forEach { (value, label) ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GuiRadio(radio == value, { if (it) radio = value }, label, "showcase-radio", size = sizes.radio)
                        ShowcaseText(label, paletteId)
                    }
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GuiSwitch(enabled, { enabled = it }, "Enable feature", size = sizes.switch)
            ShowcaseText(if (enabled) "Enabled" else "Disabled", paletteId)
        }
    }
    GalleryPanel("Slider", "Pointer/keyboard value control", paletteId, sizes.panel) {
        ShowcaseText("Value: ${slider.roundToInt()}", paletteId)
        GuiSlider(slider, { slider = it }, "Showcase slider", size = sizes.slider)
        GuiSlider(70.0, {}, "Disabled slider", disabled = true, size = sizes.slider)
    }
}

@Composable
private fun DataComponents(paletteId: String, sizes: ShowcaseSizes) {
    var gridValue by remember { mutableStateOf("node-2") }
    var treeValue by remember { mutableStateOf("core") }
    var expandedNodes by remember { mutableStateOf(setOf("framework", "examples")) }
    GalleryPanel("Table", "Passive structured data", paletteId, sizes.panel) {
        GuiTable(
            columns = listOf(GuiTableColumn("Component"), GuiTableColumn("State"), GuiTableColumn("Target")),
            rows = listOf(
                GuiTableRow(listOf("Button", "Ready", "Desktop + Android")),
                GuiTableRow(listOf("Tree", "Ready", "Desktop + Android")),
                GuiTableRow(listOf("Data Grid", "Ready", "Desktop + Android")),
                GuiTableRow(listOf("Dialog", "Ready", "Desktop + Android")),
            ),
            caption = "Framework component status",
            accessibilityLabel = "Component status table",
            size = sizes.table,
        )
    }
    GalleryPanel("Data Grid", "Controlled row selection and activation", paletteId, sizes.panel) {
        GuiDataGrid(
            value = gridValue,
            columns = listOf(GuiDataGridColumn("ID"), GuiDataGridColumn("Name"), GuiDataGridColumn("Status")),
            rows = (1..8).map { GuiDataGridRow("node-$it", listOf("#$it", "Worker $it", if (it % 3 == 0) "Busy" else "Ready")) },
            onValueChange = { gridValue = it },
            onRowActivate = { gridValue = it },
            accessibilityLabel = "Worker data grid",
            size = sizes.dataGrid,
        )
        ShowcaseText("Selected: $gridValue", paletteId, ShowcaseTextRole.Muted)
    }
    GalleryPanel("Tree", "Expandable hierarchy and selection", paletteId, sizes.panel) {
        GuiTree(
            value = treeValue,
            items = sampleTree(expandedNodes),
            onValueChange = { treeValue = it },
            onExpandedChange = { value -> expandedNodes = if (value in expandedNodes) expandedNodes - value else expandedNodes + value },
            onNodeActivate = { treeValue = it },
            accessibilityLabel = "Framework hierarchy",
            size = sizes.tree,
        )
        ShowcaseText("Selected: $treeValue", paletteId, ShowcaseTextRole.Muted)
    }
}

private fun sampleTree(expanded: Set<String>) = listOf(
    GuiTreeItem("framework", "GUI Framework", expanded = "framework" in expanded, children = listOf(GuiTreeItem("core", "Core"), GuiTreeItem("themes", "Themes"), GuiTreeItem("adapters", "Adapters"))),
    GuiTreeItem("examples", "Examples", expanded = "examples" in expanded, children = listOf(GuiTreeItem("desktop", "Desktop"), GuiTreeItem("android", "Android"), GuiTreeItem("browser", "Browser"))),
)

@Composable
private fun LayoutComponents(paletteId: String, sizes: ShowcaseSizes) {
    var navigationValue by remember { mutableStateOf("overview") }
    var formName by remember { mutableStateOf("Observatory") }
    var formEndpoint by remember { mutableStateOf("https://api.example.invalid") }
    GalleryPanel("Navigation & Tabs", "Controlled navigation primitives", paletteId, sizes.panel) {
        GuiNavigation(
            value = navigationValue,
            items = listOf(GuiNavigationItem("overview", "Overview"), GuiNavigationItem("activity", "Activity"), GuiNavigationItem("settings", "Settings"), GuiNavigationItem("locked", "Disabled", disabled = true)),
            onValueChange = { navigationValue = it },
            accessibilityLabel = "Gallery navigation",
            size = sizes.navigation,
        )
        ShowcaseText("Destination: $navigationValue", paletteId, ShowcaseTextRole.Muted)
    }
    GalleryPanel("Form Layout", "Responsive multi-column form with validation", paletteId, sizes.panel) {
        GuiFormLayout(columns = 2, accessibilityLabel = "Showcase form", size = sizes.form) {
            GuiFormField(label = "Name", description = "Human-readable workspace name") {
                GuiInput(value = formName, onValueChange = { formName = it }, placeholder = "Workspace name", accessibilityLabel = "Form name", size = sizes.input)
            }
            GuiFormField(label = "Endpoint", description = "HTTPS service endpoint", errorMessage = if (formEndpoint.startsWith("https://")) "" else "HTTPS is required") {
                GuiInput(value = formEndpoint, onValueChange = { formEndpoint = it }, placeholder = "https://", accessibilityLabel = "Form endpoint", size = sizes.input)
            }
            GuiFormLayoutSection { ShowcaseText("Sections automatically span all columns and collapse to one column at narrow widths.", paletteId, ShowcaseTextRole.Muted) }
            GuiFormActions {
                GuiButton("Save", onActivate = {}, size = sizes.button)
                GuiButton("Reset", onActivate = { formName = "Observatory" }, size = sizes.button)
            }
        }
    }
    GalleryPanel("Scroll Container", "Framework-owned focus/scroll viewport", paletteId, sizes.panel) {
        GuiScrollContainer(modifier = Modifier.fillMaxWidth().heightIn(max = 220.dp), accessibilityLabel = "Scrollable component sample", size = sizes.scroll) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(18) { index -> ShowcaseText("Scrollable row ${index + 1}", paletteId) }
            }
        }
    }
}

@Composable
private fun FeedbackComponents(paletteId: String, sizes: ShowcaseSizes) {
    var progress by remember { mutableStateOf(64.0) }
    var dialogOpen by remember { mutableStateOf(false) }
    var toastOpen by remember { mutableStateOf(false) }
    var tooltipOpen by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    var menuAction by remember { mutableStateOf("none") }
    GalleryPanel("Progress", "Determinate, indeterminate and disabled", paletteId, sizes.panel) {
        ShowcaseText("Build ${progress.roundToInt()}%", paletteId)
        GuiProgress(progress, accessibilityLabel = "Build progress", label = "Build", size = sizes.progress)
        GuiProgress(indeterminate = true, accessibilityLabel = "Indeterminate progress", label = "Scanning", size = sizes.progress)
        GuiProgress(35.0, disabled = true, accessibilityLabel = "Disabled progress", label = "Paused", size = sizes.progress)
        GuiSlider(progress, { progress = it }, "Progress control", size = sizes.slider)
    }
    GalleryPanel("Menu & Tooltip", "Anchored popup interaction", paletteId, sizes.panel) {
        GuiMenu(
            open = menuOpen,
            items = listOf(GuiMenuItem("open", "Open", "Ctrl+O"), GuiMenuItem("rename", "Rename", "F2"), GuiMenuItem("delete", "Delete", "Del"), GuiMenuItem("disabled", "Unavailable", disabled = true)),
            onOpenChange = { menuOpen = it },
            onActivate = { menuAction = it; menuOpen = false },
            accessibilityLabel = "Showcase menu",
            trigger = { source -> GuiButton("Open menu", onActivate = { menuOpen = !menuOpen }, interactionSource = source, size = sizes.button) },
        )
        ShowcaseText("Last action: $menuAction", paletteId, ShowcaseTextRole.Muted)
        GuiTooltip(
            open = tooltipOpen,
            content = "Framework tooltip — hover or focus the trigger",
            onOpenChange = { tooltipOpen = it },
            trigger = { source -> GuiButton("Tooltip target", onActivate = {}, interactionSource = source, size = sizes.button) },
        )
    }
    GalleryPanel("Dialog & Toast", "Controlled overlay and notification", paletteId, sizes.panel) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GuiButton("Open dialog", onActivate = { dialogOpen = true }, size = sizes.button)
            GuiButton("Show toast", onActivate = { toastOpen = true }, size = sizes.button)
        }
        GuiDialog(open = dialogOpen, accessibilityLabel = "Showcase dialog", onDismissRequest = { dialogOpen = false }) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ShowcaseText("Confirm operation", paletteId, ShowcaseTextRole.Heading)
                ShowcaseText("This is the real framework Dialog component.", paletteId)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GuiButton("Confirm", onActivate = { dialogOpen = false }, size = sizes.button)
                    GuiButton("Cancel", onActivate = { dialogOpen = false }, size = sizes.button)
                }
            }
        }
        GuiToast(
            open = toastOpen,
            title = "Showcase notification",
            message = "The Toast component is rendered by the active framework theme.",
            actionLabel = "Dismiss",
            actionValue = "dismiss",
            durationMs = 0,
            onOpenChange = { toastOpen = it },
            onActivate = { toastOpen = false },
        )
    }
}

@Composable
private fun GalleryPanel(title: String, subtitle: String, paletteId: String, panelSize: GuiPanelSize, content: @Composable () -> Unit) {
    GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = title, size = panelSize) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ShowcaseText(title, paletteId, ShowcaseTextRole.Heading)
            ShowcaseText(subtitle, paletteId, ShowcaseTextRole.Muted)
            content()
        }
    }
}

@Composable
private fun RealWorldScreens(paletteId: String, sizes: ShowcaseSizes) {
    var screen by remember { mutableStateOf("settings") }
    GuiTabs(
        value = screen,
        tabs = listOf(GuiTabItem("dashboard", "Dashboard"), GuiTabItem("explorer", "Data Explorer"), GuiTabItem("settings", "Settings")),
        onValueChange = { screen = it },
        accessibilityLabel = "Real-world screen selector",
        size = sizes.tabs,
    ) { selected -> ShowcaseText(selected.label, paletteId, ShowcaseTextRole.Muted) }
    when (screen) {
        "explorer" -> DataExplorerScreen(paletteId, sizes)
        "settings" -> SettingsScreen(paletteId, sizes)
        else -> DashboardScreen(paletteId, sizes)
    }
}

@Composable
private fun DashboardScreen(paletteId: String, sizes: ShowcaseSizes) {
    var nav by remember { mutableStateOf("overview") }
    var autoRefresh by remember { mutableStateOf(true) }
    GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Dashboard screen", size = sizes.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            ShowcaseText("Real-world Screen — Operations Dashboard", paletteId, ShowcaseTextRole.Heading)
            GuiNavigation(
                value = nav,
                items = listOf(GuiNavigationItem("overview", "Overview"), GuiNavigationItem("nodes", "Nodes"), GuiNavigationItem("events", "Events")),
                onValueChange = { nav = it },
                accessibilityLabel = "Dashboard navigation",
                size = sizes.navigation,
            )
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                if (maxWidth >= 760.dp) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricCard("Connected nodes", "24", paletteId, sizes.panel, Modifier.weight(1f))
                        MetricCard("Load", "37%", paletteId, sizes.panel, Modifier.weight(1f))
                        MetricCard("Warnings", "3", paletteId, sizes.panel, Modifier.weight(1f))
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        MetricCard("Connected nodes", "24", paletteId, sizes.panel)
                        MetricCard("Load", "37%", paletteId, sizes.panel)
                        MetricCard("Warnings", "3", paletteId, sizes.panel)
                    }
                }
            }
            GuiProgress(73.0, label = "Pipeline", accessibilityLabel = "Pipeline health", size = sizes.progress)
            GuiTable(
                columns = listOf(GuiTableColumn("Service"), GuiTableColumn("Health"), GuiTableColumn("Latency")),
                rows = listOf(
                    GuiTableRow(listOf("Gateway", "Healthy", "18 ms")),
                    GuiTableRow(listOf("Indexer", "Healthy", "41 ms")),
                    GuiTableRow(listOf("Telemetry", "Degraded", "126 ms")),
                    GuiTableRow(listOf("Storage", "Healthy", "23 ms")),
                ),
                caption = "Live service overview",
                accessibilityLabel = "Live service overview",
                size = sizes.table,
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GuiSwitch(autoRefresh, { autoRefresh = it }, "Auto refresh", size = sizes.switch)
                ShowcaseText("Auto refresh", paletteId)
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, paletteId: String, panelSize: GuiPanelSize, modifier: Modifier = Modifier) {
    GuiPanel(modifier = modifier.fillMaxWidth(), accessibilityLabel = label, size = panelSize) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ShowcaseText(value, paletteId, ShowcaseTextRole.Heading)
            ShowcaseText(label, paletteId, ShowcaseTextRole.Muted)
        }
    }
}

@Composable
private fun DataExplorerScreen(paletteId: String, sizes: ShowcaseSizes) {
    var selectedTree by remember { mutableStateOf("logs") }
    var selectedRow by remember { mutableStateOf("event-2") }
    var expanded by remember { mutableStateOf(setOf("sources", "system")) }
    GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Data explorer screen", size = sizes.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            ShowcaseText("Real-world Screen — Data Explorer", paletteId, ShowcaseTextRole.Heading)
            BoxWithConstraints(Modifier.fillMaxWidth()) {
                val tree: @Composable () -> Unit = {
                    GuiTree(
                        value = selectedTree,
                        items = listOf(
                            GuiTreeItem("sources", "Sources", expanded = "sources" in expanded, children = listOf(GuiTreeItem("logs", "Logs"), GuiTreeItem("metrics", "Metrics"))),
                            GuiTreeItem("system", "System", expanded = "system" in expanded, children = listOf(GuiTreeItem("security", "Security"), GuiTreeItem("network", "Network"))),
                        ),
                        onValueChange = { selectedTree = it },
                        onExpandedChange = { value -> expanded = if (value in expanded) expanded - value else expanded + value },
                        onNodeActivate = { selectedTree = it },
                        accessibilityLabel = "Data source tree",
                        size = sizes.tree,
                    )
                }
                val grid: @Composable () -> Unit = {
                    GuiDataGrid(
                        value = selectedRow,
                        columns = listOf(GuiDataGridColumn("Time"), GuiDataGridColumn("Type"), GuiDataGridColumn("Message")),
                        rows = (1..12).map { index -> GuiDataGridRow("event-$index", listOf("15:${10 + index}", if (index % 4 == 0) "WARN" else "INFO", "Event message $index")) },
                        onValueChange = { selectedRow = it },
                        onRowActivate = { selectedRow = it },
                        accessibilityLabel = "Event data grid",
                        size = sizes.dataGrid,
                    )
                }
                if (maxWidth >= 820.dp) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(Modifier.weight(0.32f)) { tree() }
                        Box(Modifier.weight(0.68f)) { grid() }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { tree(); grid() }
                }
            }
            ShowcaseText("Source: $selectedTree · Row: $selectedRow", paletteId, ShowcaseTextRole.Muted)
        }
    }
}

@Composable
private fun SettingsScreen(paletteId: String, sizes: ShowcaseSizes) {
    var endpoint by remember { mutableStateOf("https://example.invalid") }
    var cacheSize by remember { mutableStateOf("512") }
    var diagnostics by remember { mutableStateOf(false) }
    var channel by remember { mutableStateOf("stable") }
    var channelExpanded by remember { mutableStateOf(false) }
    GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Settings screen", size = sizes.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            ShowcaseText("Real-world Screen — Settings", paletteId, ShowcaseTextRole.Heading)
            GuiFormLayout(columns = 2, accessibilityLabel = "Application settings", size = sizes.form) {
                GuiFormField(label = "Service endpoint", description = "Base URL for remote services") {
                    GuiInput(value = endpoint, onValueChange = { endpoint = it }, placeholder = "https://", accessibilityLabel = "Service endpoint", size = sizes.input)
                }
                GuiFormField(label = "Cache size (MB)", description = "Local working-set limit", errorMessage = if (cacheSize.toIntOrNull() == null) "Enter a number" else "") {
                    GuiInput(value = cacheSize, onValueChange = { cacheSize = it }, placeholder = "512", accessibilityLabel = "Cache size", size = sizes.input)
                }
                GuiFormField(label = "Update channel") {
                    GuiSelect(
                        value = channel,
                        options = listOf(GuiSelectOption("stable", "Stable"), GuiSelectOption("preview", "Preview"), GuiSelectOption("nightly", "Nightly")),
                        onValueChange = { channel = it },
                        expanded = channelExpanded,
                        onExpandedChange = { channelExpanded = it },
                        accessibilityLabel = "Update channel",
                        size = sizes.select,
                    )
                }
                GuiFormField(label = "Diagnostics") {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GuiSwitch(diagnostics, { diagnostics = it }, "Diagnostics", size = sizes.switch)
                        ShowcaseText(if (diagnostics) "Enabled" else "Disabled", paletteId)
                    }
                }
                GuiFormLayoutSection { ShowcaseText("This screen intentionally combines validation, responsive columns and mixed control types.", paletteId, ShowcaseTextRole.Muted) }
                GuiFormActions {
                    GuiButton("Save settings", onActivate = {}, size = sizes.button)
                    GuiButton("Restore defaults", onActivate = { endpoint = "https://example.invalid"; cacheSize = "512"; diagnostics = false; channel = "stable" }, size = sizes.button)
                }
            }
        }
    }
}

@Composable
private fun ThemeComparison(primaryTheme: GuiThemeId, compareTheme: GuiThemeId, onCompareThemeChange: (GuiThemeId) -> Unit, paletteId: String, sizes: ShowcaseSizes) {
    var expanded by remember { mutableStateOf(false) }
    GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Theme comparison controls", size = sizes.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ShowcaseText("Theme A/B Comparison", paletteId, ShowcaseTextRole.Heading)
            ShowcaseText("The same semantic controls are rendered by two theme selections.", paletteId, ShowcaseTextRole.Muted)
            GuiSelect(compareTheme.showcaseValue(), themeOptions, { onCompareThemeChange(showcaseTheme(it)) }, expanded, { expanded = it }, accessibilityLabel = "Comparison theme", size = sizes.select)
        }
    }
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        if (maxWidth >= 780.dp) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ComparisonCard("A · ${primaryTheme.showcaseValue()}", primaryTheme, paletteId, sizes, Modifier.weight(1f))
                ComparisonCard("B · ${compareTheme.showcaseValue()}", compareTheme, paletteId, sizes, Modifier.weight(1f))
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ComparisonCard("A · ${primaryTheme.showcaseValue()}", primaryTheme, paletteId, sizes)
                ComparisonCard("B · ${compareTheme.showcaseValue()}", compareTheme, paletteId, sizes)
            }
        }
    }
}

@Composable
private fun ComparisonCard(label: String, theme: GuiThemeId, paletteId: String, sizes: ShowcaseSizes, modifier: Modifier = Modifier) {
    GuiTheme(theme = theme, paletteId = paletteId) {
        var checked by remember(theme) { mutableStateOf(true) }
        var input by remember(theme) { mutableStateOf("Semantic input") }
        GuiPanel(modifier = modifier.fillMaxWidth(), accessibilityLabel = "Theme comparison $label", size = sizes.panel) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ShowcaseText(label, paletteId, ShowcaseTextRole.Heading)
                GuiInput(value = input, onValueChange = { input = it }, placeholder = "Semantic input", accessibilityLabel = "Comparison input", size = sizes.input)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GuiCheckbox(checked, { checked = it }, "Comparison checkbox", size = sizes.checkbox)
                    ShowcaseText("Same semantic state", paletteId)
                }
                GuiProgress(68.0, label = "Progress", accessibilityLabel = "Comparison progress", size = sizes.progress)
                GuiButton("Primary action", onActivate = {}, size = sizes.button)
                GuiButton("Disabled", onActivate = {}, disabled = true, size = sizes.button)
            }
        }
    }
}

@Composable
private fun StressLab(paletteId: String, sizes: ShowcaseSizes, defaultControlCount: Int) {
    var mode by remember { mutableStateOf("controls") }
    var workload by remember { mutableStateOf(defaultControlCount.coerceAtLeast(40).toString()) }
    var workloadExpanded by remember { mutableStateOf(false) }
    var gridValue by remember { mutableStateOf("stress-row-1") }
    var treeValue by remember { mutableStateOf("stress-root-1") }
    var expanded by remember { mutableStateOf(setOf("stress-root-1")) }
    val controlCount = workload.toIntOrNull()?.coerceIn(40, 1000) ?: 100
    GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Stress Lab controls", size = sizes.panel) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ShowcaseText("Stress Lab", paletteId, ShowcaseTextRole.Heading)
            ShowcaseText("Explicitly heavy scenarios for layout, interaction and large-content QA.", paletteId, ShowcaseTextRole.Muted)
            GuiTabs(
                value = mode,
                tabs = listOf(GuiTabItem("controls", "Controls"), GuiTabItem("grid", "Large Grid"), GuiTabItem("tree", "Large Tree"), GuiTabItem("text", "Text")),
                onValueChange = { mode = it },
                accessibilityLabel = "Stress scenario",
                size = sizes.tabs,
            ) { selected -> ShowcaseText(selected.label, paletteId, ShowcaseTextRole.Muted) }
            GuiSelect(
                value = workload,
                options = listOf(GuiSelectOption("40", "40 · Smoke"), GuiSelectOption("100", "100 · Normal"), GuiSelectOption("250", "250 · Heavy"), GuiSelectOption("500", "500 · Very heavy"), GuiSelectOption("1000", "1000 · Extreme")),
                onValueChange = { workload = it },
                expanded = workloadExpanded,
                onExpandedChange = { workloadExpanded = it },
                accessibilityLabel = "Stress workload",
                size = sizes.select,
            )
            ShowcaseText("Workload: $controlCount", paletteId, ShowcaseTextRole.Muted)
        }
    }
    when (mode) {
        "grid" -> GuiDataGrid(
            value = gridValue,
            columns = listOf(GuiDataGridColumn("ID"), GuiDataGridColumn("Name"), GuiDataGridColumn("State"), GuiDataGridColumn("Value")),
            rows = (1..controlCount).map { index -> GuiDataGridRow("stress-row-$index", listOf(index.toString(), "Generated row $index", if (index % 7 == 0) "Warning" else "Ready", "${index * 17}")) },
            onValueChange = { gridValue = it },
            onRowActivate = { gridValue = it },
            accessibilityLabel = "Large stress data grid",
            size = sizes.dataGrid,
        )
        "tree" -> GuiTree(
            value = treeValue,
            items = stressTree(controlCount, expanded),
            onValueChange = { treeValue = it },
            onExpandedChange = { value -> expanded = if (value in expanded) expanded - value else expanded + value },
            onNodeActivate = { treeValue = it },
            accessibilityLabel = "Large stress tree",
            size = sizes.tree,
        )
        "text" -> GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Text stress", size = sizes.panel) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(controlCount.coerceAtMost(500)) { index -> ShowcaseText("Row ${index + 1}: A deliberately long localized-style sentence — ÄÖÜ ß 日本語 العربية — 0123456789 — layout robustness.", paletteId) }
            }
        }
        else -> GuiPanel(modifier = Modifier.fillMaxWidth(), accessibilityLabel = "Control stress", size = sizes.panel) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ShowcaseText("Stress Lab — repeated interactive controls", paletteId, ShowcaseTextRole.Heading)
                repeat(controlCount) { index -> GuiButton("Stress control ${index + 1}", onActivate = {}, modifier = Modifier.fillMaxWidth(), size = sizes.button) }
            }
        }
    }
}

private fun stressTree(controlCount: Int, expanded: Set<String>): List<GuiTreeItem> {
    val branches = (controlCount / 10).coerceAtLeast(4).coerceAtMost(100)
    return (1..branches).map { branch ->
        val root = "stress-root-$branch"
        GuiTreeItem(root, "Branch $branch", expanded = root in expanded, children = (1..10).map { child -> GuiTreeItem("stress-$branch-$child", "Node $branch.$child") })
    }
}
