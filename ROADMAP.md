# GUI Framework Roadmap

This roadmap tracks only the work that belongs to the GUI Framework itself.

## Operating principles

- Keep the neutral specification renderer-agnostic.
- Derive platform outputs from the neutral contract instead of hand-maintaining equivalent definitions.
- Preserve clear ownership boundaries between spec, compiler, theme, adapter, reference app and integration layers.
- Prefer capabilities and fallback rules over platform branches inside the neutral spec.
- Ship a component only when applicable schema, compiler, adapter, accessibility, performance and reference-application gates are green.
- Keep motion limited to necessary interaction feedback; no decorative animation belongs in the default framework behavior.
- Treat Basic as the canonical quality baseline; additional themes inherit semantics and only override presentation where necessary.

## Phase 1 — Repository and specification foundation

- [x] Restrictive project license and contribution boundary
- [x] Repository structure and ownership model
- [x] Renderer-neutral theme/component specification
- [x] Token taxonomy and aliases
- [x] Component recipe schema
- [x] Theme inheritance model
- [x] Capability/fallback model
- [x] Palette-family model
- [x] Spec validation and compiler tests

## Phase 2 — Compiler and generated contracts

- [x] Neutral specification compiler
- [x] Generated Web TypeScript contracts
- [x] Generated Kotlin contracts
- [x] Generated Web token output
- [x] Generated Kotlin token output
- [x] Generated visual-recipe output
- [x] Generated asset output
- [x] Renderer-neutral boundary guards
- [x] Generated-output typechecking/compilation gates

## Phase 3 — Basic theme and primitive adapters

- [x] Basic theme foundation
- [x] Basic palette-family model
- [x] Basic quality contract
- [x] Basic performance budget
- [x] Native Web adapter foundation
- [x] Foundation Compose adapter foundation
- [x] Shared semantics and interaction contracts
- [x] Capability-aware visual fallback resolution

## Phase 4 — Core components

- [x] Button
- [x] Input
- [x] Switch
- [x] Panel
- [x] Dialog
- [x] Shared control sizing and compact-mode behavior
- [x] Accessibility target-size/contrast checks
- [x] Web reference application
- [x] Compose Desktop reference application
- [x] Compose Android reference application
- [x] Cross-platform reference parity gate
- [x] Chromium reference regression
- [x] Android instrumentation/runtime path

## Phase 5 — Theme family expansion

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
- [ ] Cross-component text/locale robustness (long and unbroken text, Unicode/emoji, RTL/bidi and locale-sensitive layout)
- [ ] IME/composition robustness for editable controls across Web and Compose

## Phase 7 — Integration kits

- [ ] Browser extension integration kit
- [ ] Desktop application integration kit
- [ ] Android application integration kit
- [ ] Python application integration path
- [ ] Web application integration kit
- [ ] Shared host-context presets

## Phase 8 — Distribution and ecosystem readiness

- [ ] Package publication strategy
- [ ] Stable public API surface
- [ ] Versioned migration policy
- [ ] Theme authoring documentation
- [ ] Adapter authoring documentation
- [ ] Component authoring documentation
- [ ] Accessibility documentation
- [ ] Performance documentation
- [ ] Contribution and governance documentation

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

A checkbox is not a documentation claim. It is a summary of those gates.
