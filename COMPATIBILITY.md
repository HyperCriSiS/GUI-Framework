# Compatibility and package policy

This document defines GUI Framework's runtime/toolchain support matrix and package-role compatibility rules. `PUBLIC_API.md` defines the stable consumer boundary, `MIGRATION_POLICY.md` defines SemVer and migration obligations, and `DISTRIBUTION.md` plus `distribution/artifacts.json` define publication state. Those contracts take precedence over older compatibility assumptions.

## Support levels

Support is expressed in three levels:

- **CI-verified**: exercised automatically by permanent repository checks for the stated reference path/floor.
- **Reference target**: intentionally supported by the architecture and backed by a consuming implementation/reference, but not yet covered across the complete target matrix.
- **Planned**: architecturally permitted or anticipated, but not a supported runtime claim and not necessarily a currently scheduled roadmap item.

A platform is not considered stable merely because generated output can be produced for it.

## Current platform and toolchain matrix

| Area | Current support | Level | Notes |
| --- | --- | --- | --- |
| Specification/compiler toolchain | Node.js 24.x | CI-verified | The workspace declares `>=24 <25`; changing the floor is a compatibility change. |
| Web adapter | Standards-based HTML/CSS/ES modules | CI-verified reference path | Source/contract gates plus the Playwright Chromium reference validate the current implementation. Other browser engines are tracked separately below. |
| Chromium reference | Repository-pinned Playwright Chromium | CI-verified | Interaction and visual/runtime regression gates use the pinned browser. |
| Firefox desktop | Current supported Firefox line | Reference target | Browser-extension architecture is first-class, but a dedicated Firefox runtime matrix is not yet a stable-support claim. |
| Chromium/Chrome/Edge desktop lines | Current standards-based lines | Reference target | Pinned Chromium is CI-verified; broad vendor/version coverage is not implied. |
| WebKit/Safari | Current supported Safari/WebKit line | Planned | No compatibility guarantee until a consuming reference and automated coverage exist. |
| Browser-extension integration | Manifest V3 Chromium popup reference; popup/options/side-panel/devtools/content-script host surfaces | CI-verified reference path / Reference target | Real unpacked Chromium MV3 popup execution is CI-verified; the wider surface/browser matrix remains a reference target. |
| Compose adapter | Kotlin/JVM generated contracts, tokens, visuals and Foundation Compose adapter | CI-verified | Generated output compiles and is consumed by Desktop/Android references. |
| Android Compose application | Android API 23+ reference, target/compile SDK 37 | CI-verified | `minSdk = 23`; APK/instrumentation sources build and representative API 23/API 35 runtime gates are established. |
| Desktop Compose application | Compose Desktop consuming reference | Reference target | Source/compile integration is gated; no cross-OS runtime matrix is claimed yet. |
| Python integration bridge | Python >=3.11, toolkit-neutral compiled-IR integration | CI-verified | The bridge is intentionally not a PySide/Tkinter/etc. GUI adapter. |
| PySide6 / Qt adapter | Python + Qt | Planned | No public support claim until implemented and tested. |
| PyQt6 adapter | Python + Qt | Planned | Expected to share the Qt mapping model where licensing/API differences permit. |
| Tkinter / CustomTkinter adapters | Python | Planned | Any implementation must use deterministic fallbacks where advanced themes cannot map faithfully. |

### Version-floor rule

A runtime floor is committed only when the project has a real consuming path and automated evidence for that floor. Current explicit floors include Node.js 24.x, Android API 23, and Python 3.11 for the toolkit-neutral integration bridge.

Dropping a supported runtime or raising a documented minimum version is a public compatibility change and must be classified under `MIGRATION_POLICY.md`.

## Public package and module identities

Machine-facing logical artifact names follow `distribution/artifacts.json`. Registry coordinates remain unbound while publication is locked, so a logical name does not by itself assert that the package exists on npm, Maven Central or PyPI.

| Repository module | Logical artifact identity | Role |
| --- | --- | --- |
| `packages/core` | `@gui-framework/core` | Neutral runtime/application-facing contracts |
| `packages/compiler` | `@gui-framework/spec-compiler` | Side-effect-free compiler API plus CLI tooling |
| `packages/adapter-web` | `@gui-framework/web-adapter` | Web runtime adapter |
| `packages/integration-browser-extension` | `@gui-framework/browser-extension-integration` | Browser-extension host integration |
| `packages/integration-web-application` | `@gui-framework/web-application-integration` | Web-application host integration |
| `packages/integration-host-context/src` | `@gui-framework/host-context` | Shared JavaScript host-context presets |
| `packages/adapter-compose` | `gui-framework-compose-adapter` | Compose adapter and generated public contracts |
| `packages/integration-desktop` | `gui-framework-desktop-integration` | Desktop Compose host integration |
| `packages/integration-android` | `gui-framework-android-integration` | Android Compose host integration |
| `packages/integration-host-context/kotlin` | `gui-framework-host-context` | Shared Kotlin host-context presets |
| `packages/integration-python` | `gui-framework-integration` | Toolkit-neutral Python bridge |
| `packages/integration-host-context/python` | `gui-framework-host-context` | Shared Python host-context presets |

Rules:

1. `core` must not depend on renderer-specific public APIs.
2. Adapters are named for target platform/runtime, not for a theme.
3. Themes and palettes are specification/data, not adapter forks.
4. Optional Rive/Skia/shader integrations remain modular providers if introduced.
5. Generated language namespaces follow the host ecosystem while preserving the public/internal boundary in `PUBLIC_API.md`.
6. Repository-relative deep imports are not public unless explicitly re-exported by a listed public entry point.
7. Choosing actual registry coordinates later is a release/distribution decision and requires explicit approval.

## Semantic versioning and compatibility

Published artifact versions use the unified release train described in `DISTRIBUTION.md`. The neutral specification also carries its own `specVersion` in source/generated IR so adapters can validate schema/IR compatibility; that embedded specification version does not create a separate registry release train.

### Before and after 1.0

The stable surface listed in `api/public-api.json` follows `MIGRATION_POLICY.md` even during `0.x` development. A pre-1.0 minor release is **not** permission to silently break that stable surface.

- **PATCH**: no stable public API snapshot change; compatible fixes/performance/internal/documentation work.
- **MINOR**: compatible additive public surface. Additions with source-exhaustiveness impact (for example generated Kotlin enum values) require a migration note as defined by policy.
- **MAJOR**: removals/renames, package relocation, incompatible signatures/types, newly required inputs, incompatible runtime-floor changes, incompatible artifact coordinates or documented behavioral breaks.

Repository-internal/non-public implementation details may change without SemVer obligation so long as the stable public and documented behavioral contracts remain intact.

### Specification versus adapter compatibility

Compatibility rules include:

- an adapter must reject an unsupported specification major/version contract rather than silently approximate it;
- additive specification changes may be ignored only when explicitly optional/fallback-safe;
- required capabilities without a valid fallback are compatibility failures;
- generated IR must retain `specVersion`/provenance needed for compatibility diagnostics;
- renderer-specific implementation changes do not require a neutral-specification change unless the canonical contract changes.

### Deprecation and migration

A stable public symbol normally must be deprecated for at least one released minor version before removal and may be removed no earlier than the next major release. Deprecation must identify a replacement or concrete migration path.

Major changes, minor changes with source impact, and security compatibility waivers require the migration records defined in `MIGRATION_POLICY.md`. Security-sensitive exceptions follow its explicit waiver path.

## Compatibility gates for a stable support claim

A target moves from planned/reference status to a stable support claim only when applicable evidence exists for:

1. a runnable reference application or representative consuming integration;
2. automated functional tests;
3. accessibility/semantics checks appropriate to the platform;
4. deterministic visual-intent/rendering regression coverage where meaningful;
5. documented runtime/version floors;
6. performance measurements/budgets sufficient to catch material regressions;
7. deterministic fallback behavior for unsupported optional capabilities;
8. generated-output compile/typecheck validation where generated contracts are part of the path.

## Publication status

Completing compatibility, public-API and migration gates does not publish anything. Registry publication remains locked/unbound until an explicit release decision updates the distribution contract. Green CI is necessary evidence, never release authorization.
