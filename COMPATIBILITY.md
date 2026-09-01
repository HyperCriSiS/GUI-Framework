# Compatibility and package policy

This document defines the initial support matrix, public package naming rules and compatibility policy for GUI Framework.

## Support levels

Support is expressed in three levels:

- **CI-verified**: exercised automatically by the repository's required checks.
- **Reference target**: intentionally supported by the architecture and expected to work, but not yet covered by the complete compatibility matrix.
- **Planned**: part of the roadmap, not a supported runtime yet.

A platform is not considered stable merely because generated output can be produced for it.

## Initial platform and toolchain matrix

| Area | Initial support | Level | Notes |
| --- | --- | --- | --- |
| Specification/compiler toolchain | Node.js 24.x | CI-verified | The workspace currently declares `>=24 <25`. Toolchain-version changes are deliberate compatibility changes. |
| Web adapter | Standards-based HTML/CSS/ES modules | Reference target | Ordinary components must not require Canvas, WebAssembly or a framework runtime. |
| Chromium | Playwright-pinned Chromium used by CI | CI-verified | Interaction and visual-regression baselines are recorded against the repository-pinned Playwright browser. |
| Firefox desktop | Current supported Firefox release line | Reference target | Browser-extension use is a first-class target; dedicated CI coverage is still required before stable support is claimed. |
| Chromium desktop | Current supported Chromium/Chrome/Edge release lines | Reference target | Dedicated multi-browser CI coverage remains open. |
| WebKit/Safari | Current supported Safari/WebKit release line | Planned | No compatibility guarantee until CI/reference coverage exists. |
| Browser-extension popup/sidebar/options surfaces | Firefox and Chromium extension UIs | Reference target | Must remain usable without heavyweight rendering runtimes. Explicit integration verification remains open. |
| Compose adapter | Kotlin/JVM generated contracts and Compose-oriented mappings | Reference target | Current CI verifies generated Kotlin contracts/tokens/visuals compile; full application/runtime support is not yet claimed. |
| Android Compose application | Android | Planned | Minimum API level will be selected when the Android reference app is introduced and measured. |
| Desktop Compose application | Windows, Linux, macOS | Planned | Concrete OS/JDK support floors will be fixed with the desktop reference app. |
| PySide6 / Qt adapter | Python + Qt | Planned | Intended as a high-priority future adapter, but no public support claim exists until implemented and tested. |
| PyQt6 adapter | Python + Qt | Planned | Expected to share the Qt adapter model where licensing/API differences permit. |
| CustomTkinter adapter | Python | Planned | Lower-priority compatibility adapter; visual capabilities may use deterministic fallbacks. |
| Tkinter adapter | Python standard library | Planned | Only a constrained subset is expected because advanced themes cannot be mapped faithfully. |

### Version-floor rule

Runtime version floors are only committed when the project has a runnable reference application and an automated compatibility test for that target. Until then, the roadmap names the target without inventing a minimum version that has not been validated.

For stable releases, dropping a previously supported runtime or raising a documented minimum runtime version is a compatibility change governed by the semantic-versioning policy below.

## Public package and module naming

The repository uses the neutral project identity **GUI Framework** in prose. Machine-facing package names use lowercase ASCII and explicit responsibility suffixes.

Canonical package roles are:

| Repository module | Public package role | Naming rule |
| --- | --- | --- |
| `packages/core` | Neutral runtime/application-facing contracts | `gui-framework-core` / platform-equivalent namespace |
| `packages/compiler` | Specification compiler and validation tooling | `gui-framework-compiler` |
| `packages/adapter-web` | Web adapter | `gui-framework-adapter-web` |
| `packages/adapter-compose` | Compose adapter | `gui-framework-adapter-compose` |
| future adapters | Platform adapter | `gui-framework-adapter-<target>` |
| optional visual providers | Optional provider | `gui-framework-provider-<technology>` |

Rules:

1. `core` must not depend on a renderer-specific public API.
2. Adapters are named for the target platform/runtime, not for a theme.
3. Themes and palettes are data/specification packages or assets, not forks of adapters.
4. Optional Rive, Skia, shader or asset integrations use `provider-*` naming and remain removable.
5. Generated language namespaces follow the host ecosystem's normal conventions while retaining the same role boundaries.
6. Repository-internal package names may remain unpublished until the public API is ready; publishing a package freezes its role/name under the compatibility policy.

The exact registry scope (for example an npm organization scope or Maven group ID) is intentionally deferred until publication. Choosing a registry scope does not change these role names.

## Semantic versioning and compatibility

The project uses Semantic Versioning for public releases, with the neutral specification versioned independently from renderer/adapter packages.

### Before 1.0

During `0.x` development:

- public APIs are experimental unless explicitly marked stable;
- a minor release may contain breaking API/specification changes;
- patch releases must not intentionally introduce breaking changes;
- every breaking change must be documented in release notes/migration notes;
- generated artifacts must record the specification version they were produced from.

### From 1.0 onward

- **PATCH**: backward-compatible fixes and implementation improvements.
- **MINOR**: backward-compatible features, new optional tokens/components/capabilities, and additive adapter support.
- **MAJOR**: breaking public API changes, incompatible neutral-specification changes, removal/renaming of public tokens or components, or dropping a documented supported runtime/version floor.

### Specification versus adapter versions

The neutral specification has its own version. Adapter packages declare which specification-version range they consume.

Compatibility rules:

- an adapter must reject an unsupported specification major version rather than silently approximating it;
- additive specification changes may be ignored only when explicitly marked optional and fallback-safe;
- required capabilities without a valid fallback are compatibility failures;
- generated IR must retain its specification version;
- renderer-specific package releases do not force a neutral-specification version bump unless the canonical contract changes.

### Deprecation policy

After 1.0, a public API/token/component scheduled for removal must first be deprecated in at least one minor release unless an urgent security/correctness issue makes that impractical.

Deprecations must identify the replacement or migration path.

## Compatibility gates before 1.0

A target can move from reference/planned status to stable support only when it has:

1. a runnable reference application or representative integration;
2. automated functional tests;
3. accessibility/semantics checks appropriate to the platform;
4. visual-intent or rendering-regression coverage where deterministic;
5. documented runtime/version floors;
6. performance measurements sufficient to detect obvious regressions;
7. deterministic fallback behavior for unsupported optional visual capabilities.
