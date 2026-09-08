# Showcase Explorer

The Showcase Explorer is a runnable visual reference for the framework on Compose Desktop (Windows target) and Android.

Current explorer surfaces:

- live switching across all six framework themes,
- dark/light reference palette switching,
- standard/compact density switching,
- a component-gallery surface,
- a representative settings-screen surface,
- a repeated-controls stress surface.

The explorer intentionally uses framework components instead of mock styling so visual and interaction defects are exercised against the actual adapters. Its outer surface and free explanatory text are also resolved from the framework's generated semantic palette and typography tokens rather than host-default colors.

## Desktop / Windows

`examples/compose-desktop/src/main/kotlin/ShowcaseExplorer.kt` provides the thin desktop entry point:

`gui.framework.examples.showcase.desktop.ShowcaseExplorerKt`

The shared Compose surface lives under `examples/showcase-shared/` and is included in the existing Compose Maven compile gate. Windows and Android therefore exercise the same explorer implementation.

From the repository root, prepare the generated sources and launch the Showcase Explorer with the same pinned Maven Exec path used by the established Desktop reference application:

```sh
npm run compile:spec && npm run build:kotlin-contracts && npm run build:kotlin-tokens && npm run build:kotlin-visuals && npm run build:kotlin-assets && npm run compile:kotlin-contracts && mvn -q -f packages/adapter-compose/pom.xml org.codehaus.mojo:exec-maven-plugin:3.5.0:java -Dexec.mainClass=gui.framework.examples.showcase.desktop.ShowcaseExplorerKt
```

No additional runtime or build-system dependency is introduced for the Showcase Explorer.

## Android

`ShowcaseActivity` is compiled inside the existing Android reference application and delegates to the same shared Compose explorer. The Android manifest exposes it as a second launcher activity labeled `GUI Framework Showcase`, leaving the established reference activity unchanged for runtime tests.
