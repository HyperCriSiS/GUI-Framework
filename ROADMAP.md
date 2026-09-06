# GUI Framework Roadmap

This roadmap tracks the technical progression from specification work to a production-grade renderer-neutral GUI framework.

The framework is intended to remain renderer-neutral at the semantic and theme-specification layers while supporting practical adapters for modern Web, Compose Multiplatform / Android, and later additional host environments.

## Guiding principles

- [x] Renderer-neutral semantic component specification
- [x] Basic theme as the canonical semantic baseline
- [x] Theme inheritance for non-semantic visual differentiation
- [x] Restrictive copyleft licensing via AGPL-3.0-or-later
- [x] Necessary usability micro-interactions only; no decorative motion by default
- [x] Native or semantically native host behavior where practical
- [x] Foundation Compose rather than Material coupling
- [x] Performance budgets and capability fallback as first-class contracts
- [x] Reference applications used as integration/runtime gates rather than showcase-only demos

## Phase 1 — Specification foundation

- [x] Theme manifest and palette-family model
- [x] Neutral component recipe schema
- [x] Theme visual schema
- [x] Asset manifest model
- [x] Capability vocabulary and fallback rules
- [x] Accessibility requirements in component contracts
- [x] Neutral specification compiler
- [x] Renderer-neutral boundary guards
- [x] Typed visual recipe resolution
- [x] Theme inheritance and override resolution

## Phase 2 — Generated adapter foundations

- [x] Web token generation
- [x] Web asset generation
- [x] Web component CSS generation
- [x] Web TypeScript contract generation
- [x] Kotlin contract generation
- [x] Kotlin token generation
- [x] Kotlin visual recipe generation
- [x] Kotlin asset generation
- [x] Generated Web TypeScript typechecking
- [x] Generated Kotlin/Compose compilation

## Phase 3 — Core component baseline

- [x] Button
- [x] Input
- [x] Switch
- [x] Panel
- [x] Dialog
- [x] Native Web adapters for core controls
- [x] Foundation Compose adapters for core controls
- [x] Basic theme recipes for core controls
- [x] WCAG contrast/target validation for applicable core controls
- [x] Web reference application
- [x] Compose Desktop reference application
- [x] Compose Android reference application
- [x] Cross-platform reference parity checks
- [x] Chromium reference regression
- [x] Android reference APK build
- [x] Representative API 23 / API 35 runtime validation

## Phase 4 — Theme family foundations

- [x] Basic theme foundation
- [x] Basic performance budget
- [x] Modern theme foundation
- [x] Modern performance budget
- [x] Glass theme foundation
- [x] Glass performance budget
- [x] Frosted Glass capability contract
- [x] Frosted Glass performance budget
- [x] Spacey theme foundation
- [x] Spacey performance budget
- [x] Cyberpunk theme foundation
- [x] Cyberpunk performance budget
- [x] Theme-family capability/fallback validation

## Phase 6 — Extended component set

- [x] Checkbox <!-- neutral contract/Basic recipe, native Web/Compose controls, WCAG target/contrast gates, Chromium compact/keyboard integration, Web/Desktop/Android reference paths and representative API 23/API 35 device-runtime validation are complete -->
- [x] Radio <!-- neutral contract/tokens/Basic visuals, controlled Web adapter, Web/Compose group semantics, Web/Desktop/Android reference integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard integration and representative API 23/API 35 device-runtime validation are complete -->
- [x] Select / ComboBox <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, standalone Web reference and Basic Compose Desktop/Android integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Tabs <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, manual-activation keyboard/focus behavior, standalone Web and Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation are complete -->
- [x] Tooltip <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, WCAG popup contrast, Chromium hover/focus/Escape plus flip/clamp regression, Web/Desktop/Android references, cross-platform parity, Android APK build and representative API 23/API 35 focus/runtime validation are complete -->
- [x] Menu / Context Menu <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, native semantics, disabled-item skipping, roving keyboard focus, trigger/context placement, Web/Desktop/Android references, WCAG gates, Chromium context/viewport regression, cross-platform parity, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Toast / Notification <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, accessible polite/assertive live-region behavior, pause/resume and persistent timing semantics, standalone Web plus Desktop/Android reference paths, cross-platform parity, Chromium runtime regression, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation are complete -->
- [x] Progress / Spinner <!-- neutral contract/Basic visuals, native Web/Foundation Compose adapters, determinate/indeterminate linear+circular semantics, neutral timing, standalone Web plus Desktop/Android references, cross-platform parity, Chromium Reduced Motion/runtime regression, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Slider <!-- neutral contract/tokens/Basic visuals, controlled native Web/Foundation Compose adapters, horizontal+vertical orientation, keyboard/pointer and disabled semantics, standalone Web plus Desktop/Android references, cross-platform parity, WCAG gates, Chromium runtime regression, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Navigation primitives <!-- neutral contract/tokens/Basic visuals, controlled native Web/Foundation Compose adapters, horizontal+vertical orientation, disabled/selected semantics, standalone Web plus Desktop/Android references, cross-platform parity, compact 320px Chromium regression, Android APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Table / Data Grid primitives <!-- separate passive Table and interactive Data Grid neutral contracts, tokens/Basic visuals, native Web/Foundation Compose adapters, controlled row selection plus explicit row activation, Web/Desktop/Android references, cross-platform parity, compact Chromium regression, Android APK build and representative API 23 large-font/API 35 high-density runtime validation are complete -->
- [x] Tree / Hierarchy primitives <!-- neutral contract/tokens/Basic visuals, controlled native Web/Foundation Compose adapters, selection/expansion/activation and disabled semantics, keyboard hierarchy navigation, standalone Web plus Desktop/Android references, cross-platform parity, compact 320px Chromium regression, Android APK build and representative API 23 large-font/API 35 high-density runtime validation are complete -->
- [x] Form layout primitives <!-- neutral contract/Basic visuals, compound native Web/Foundation Compose adapters with host-owned control state, label/help/error association and responsive inline/stacked layout, standalone Web plus Desktop/Android references, cross-platform parity, compact 320px Chromium regression, Android APK build and representative API 23 large-font/API 35 high-density runtime validation are complete -->
- [x] Scroll container primitives <!-- neutral contract/Basic visuals, native Web/Foundation Compose adapters with browser-owned or caller-owned scroll state, vertical/horizontal/both axes, standalone Web plus Desktop/Android references, cross-platform parity, compact Chromium scroll-offset preservation regression, Android APK build and representative API 23 large-font/API 35 high-density runtime validation are complete -->
- [x] Cross-component text/locale robustness <!-- long natural-language and hostile unbroken text, Unicode/emoji/combining characters, mixed bidi content, logical CSS, RTL/LTR host-direction switching, Web/Compose source gates, compact Chromium regression, Android build and representative API 23 large-font/API 35 high-density runtime validation are complete -->
- [x] IME/composition robustness for editable controls across Web and Compose <!-- Web Input and editable ComboBox preserve composition/preedit state against controlled host echoes, Compose Input/Select retain TextFieldValue composition/selection metadata, candidate-navigation keys pass through during active IME sessions, CJK/emoji references are integrated across Web/Desktop/Android, and Chromium plus API 23/API 35 Android runtime gates are green -->

## Phase 7 — Integration kits

- [x] Browser extension integration kit <!-- packaged JS/CSS/assets, MV3 consuming reference, default-CSP-safe runtime, permanent source/build gates, and real Chromium extension regression validated on main -->
- [x] Desktop application integration kit <!-- thin GuiDesktopHost context, explicit capabilities, compiled consuming reference, permanent source/compile gates, and green main CI -->
- [x] Android application integration kit <!-- explicit GuiAndroidHost context, consuming Compose Activity, permanent source-contract validation, Android/instrumentation compile and APK build, plus green API 23/API 35 runtime validation -->
- [x] Python application integration path <!-- zero-dependency toolkit-neutral bridge over compiled spec IR, explicit host/capability resolution, real consuming reference, dedicated compiled-IR gate, and green main Core CI -->
- [x] Web application integration kit <!-- reversible DOM host boundary, explicit capabilities and IR-backed fallback resolution, consuming native Web reference, focused source gate, and green Chromium runtime regression on main -->
- [x] Shared host-context presets <!-- canonical capability presets with JS/Python/Kotlin parity bindings, safe portable baseline, explicit effect declarations, path-filtered parity CI, and green Kotlin/Core compilation on main -->

## Phase 8 — Distribution and ecosystem readiness

- [x] Package publication strategy <!-- unified release train, machine-readable npm/Maven/PyPI/GitHub artifact plan, explicit-approval-only publication, registry coordinates locked until API/migration gates, AGPL/supply-chain requirements, and dedicated contract CI -->
- [x] Stable public API surface <!-- canonical package entry points, exact cross-language API snapshot, side-effect-free compiler library/CLI split, public Compose contract namespace with compatibility aliases, and dedicated Public API Contract CI are complete -->
- [x] Versioned migration policy <!-- unified SemVer policy across source/binary/behavior compatibility, deprecation window, generated-contract rules, migration records, security waiver path, and dedicated migration-policy CI are complete -->
- [x] Theme authoring documentation <!-- schema-backed theme/palette/inheritance/capability workflow, real validation commands, fallback/performance/accessibility completion rules, and documentation-contract coverage -->
- [x] Adapter authoring documentation <!-- compiled-IR boundary, host-platform ownership, capability/unit/rendering rules, explicit public-entry-point guidance, and validation/runtime completion workflow -->
- [x] Component authoring documentation <!-- all schema-required recipe fields, semantics/state/token/capability rules, end-to-end Web/Compose workflow, public-API/migration discipline, and documentation-contract coverage -->
- [x] Accessibility documentation <!-- neutral semantics, keyboard/focus/target/contrast/text/reduced-motion requirements, native-platform guidance, concrete validation commands, and review checklist -->
- [x] Performance documentation <!-- machine-readable budget workflow, host-rendering/fallback/virtualization rules, representative runtime guidance, CI-cost discipline, and all six theme performance gates documented -->
- [x] Contribution and governance documentation <!-- contribution gates, public-contract/security discipline, decision hierarchy, maintainer/release responsibilities, explicit release approval separation, and documentation-contract coverage -->

## Phase 9 — Pre-release artifact hardening

- [x] Machine-readable artifact packaging contract <!-- all 13 distribution artifacts map 1:1 to explicit package roots and ecosystem staging strategies while registry coordinates remain unbound and publication remains locked -->
- [x] npm staged-package build / pack / install smoke <!-- Core emits consumable ESM + declarations, six private development tarballs include AGPL metadata/license, Web Application staging removes monorepo-deep imports, and a clean Node consumer imports all public package entry points -->
- [x] Maven local artifact build / consumer smoke <!-- four isolated local-only JAR coordinates, generated Compose release inputs, AGPL license embedded in every JAR, isolated Maven repository installation, and a clean Kotlin consumer compile across Compose/Desktop/Android/host-context artifacts -->
- [ ] Python sdist / wheel build / install smoke
- [ ] Specification-source release archive smoke
- [ ] Cross-ecosystem staging manifest and checksums
- [ ] Reproducible staging validation
- [ ] Manual release-candidate dry-run workflow with no publication credentials or registry writes

## Completion gates

A phase or component is only complete when every applicable gate is green:

- schema validation,
- compiler tests,
- adapter contract tests,
- accessibility checks,
- performance-budget checks,
- reference application coverage,
- representative runtime validation,
- generated-output typechecking/compilation,
- and cross-platform parity where applicable.
