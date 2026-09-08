# Showcase Explorer

The Showcase Explorer is the runnable visual and interaction laboratory for the framework on Compose Desktop (Windows target) and Android. Both targets use the same shared Compose implementation so platform wrappers cannot silently diverge in showcased behavior.

The Explorer renders real framework components and generated theme/token output; it does not use mock component styling.

## Explorer surfaces

### Theme and QA controls

- live switching across Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk,
- dark/light reference palette switching,
- standard/compact component density,
- simulated 100%, 125% and 150% font scaling,
- Auto, Phone, Tablet and Desktop viewport constraints.

### Component Gallery

The gallery covers the current Compose adapter surface: Button, Input, Select, Checkbox including indeterminate/disabled states, Radio Group / Radio, Switch, Slider, Table, Data Grid, Tree, Navigation, Tabs, responsive Form Layout, Scroll Container, Progress, Menu, Tooltip, Dialog, Toast / Notification and Panel.

Hover, focus and pressed states remain genuine interaction states supplied by the framework adapters rather than artificial preview flags.

### Real-world Screens

- Operations Dashboard with navigation, responsive metric panels, health progress and service table,
- Data Explorer with responsive Tree + Data Grid composition,
- Settings screen with responsive two-column Form Layout, validation, Select, Switch and actions.

### Theme comparison

The Compare surface renders the same semantic component sample under two independent `GuiTheme` selections. Wide viewports render side by side; narrow viewports stack them.

### Stress Lab

Stress scenarios cover repeated interactive controls, a large Data Grid, a large Tree and long multilingual-style text. Selectable workloads are 40, 100, 250, 500 and 1000 items. Heavy modes are intentionally not virtualized away because their purpose is to expose layout, rendering and interaction pressure.

## Desktop / Windows

`examples/compose-desktop/src/main/kotlin/ShowcaseExplorer.kt` is the thin desktop entry point:

`gui.framework.examples.showcase.desktop.ShowcaseExplorerKt`

The shared Compose surface lives under `examples/showcase-shared/` and is included in the existing Compose Maven compile gate.

From the repository root, prepare generated sources and launch the Explorer with the pinned Maven Exec path used by the Desktop reference application:

```sh
npm run compile:spec && npm run build:kotlin-contracts && npm run build:kotlin-tokens && npm run build:kotlin-visuals && npm run build:kotlin-assets && npm run compile:kotlin-contracts && mvn -q -f packages/adapter-compose/pom.xml org.codehaus.mojo:exec-maven-plugin:3.5.0:java -Dexec.mainClass=gui.framework.examples.showcase.desktop.ShowcaseExplorerKt
```

## Android

`ShowcaseActivity` is compiled into the existing Android reference application and delegates to the same shared Explorer implementation. The manifest exposes it as a dedicated launcher activity labeled `GUI Framework Showcase` while the established reference activity remains unchanged.

Android instrumentation coverage launches the Showcase, changes QA selectors, navigates primary Explorer sections and exercises representative component/overlay behavior. Full Android CI can be requested with the repository's existing `[android-ci]` commit marker.
