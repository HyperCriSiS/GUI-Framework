# Showcase Explorer

The Showcase Explorer is a runnable visual reference for the framework on Compose Desktop (Windows target) and Android.

Current explorer surfaces:

- live switching across all six framework themes,
- dark/light reference palette switching,
- standard/compact density switching,
- a component-gallery surface,
- a representative settings-screen surface,
- a repeated-controls stress surface.

The explorer intentionally uses framework components instead of mock styling so visual and interaction defects are exercised against the actual adapters.

## Desktop / Windows

`examples/compose-desktop/src/main/kotlin/ShowcaseExplorer.kt` provides the dedicated desktop entry point:

`gui.framework.examples.showcase.desktop.ShowcaseExplorerKt`

The source directory is already part of the Compose Maven compile gate, so the explorer is compiled with the existing desktop reference sources.

## Android

`ShowcaseActivity` is compiled inside the existing Android reference application. The Android manifest exposes it as a second launcher activity labeled `GUI Framework Showcase`, leaving the established reference activity unchanged for runtime tests.
