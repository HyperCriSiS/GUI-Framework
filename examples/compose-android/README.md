# Compose Android reference application

This application validates that the neutral GUI Framework specification and the Compose adapter can be consumed by a real Android application without introducing a second Android-specific component implementation.

The app compiles the same generated Kotlin contracts/tokens/visuals/assets from `build/compose` and the same adapter sources from `packages/adapter-compose` that are used by the Desktop reference target.

## Toolchain

- Android Gradle Plugin 9.3.0
- Gradle 9.5.0
- JDK 17
- Kotlin / Compose compiler plugin 2.4.10
- Android `compileSdk` / `targetSdk` 37
- Android `minSdk` 23
- AndroidX Compose BOM 2026.06.01

The app intentionally uses Compose Foundation/UI rather than Material so framework visuals and semantics remain owned by the neutral specification and adapter.

## Build

Generate the shared Compose output from the repository root first:

```text
npm run compile:spec
npm run build:kotlin-contracts
npm run build:kotlin-tokens
npm run build:kotlin-visuals
npm run build:kotlin-assets
```

Then build the reference APK with Gradle 9.5.0:

```text
gradle -p examples/compose-android :app:assembleDebug
```

Core CI performs these steps with Android API 37 and Build Tools 36.0.0.
