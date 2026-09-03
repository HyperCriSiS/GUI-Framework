# GUI Framework Roadmap

Current status: repository foundation, renderer-neutral specification, Web and Compose adapter foundations, six-theme system, and the initial extended component set through Menu / Context Menu, Toast / Notification and Progress / Spinner is implemented and validated. Phase 4 is complete. Phase 5 has completed the Basic theme contract: the full reference-component set, declared sizes/states, shared functional interaction motion, reduced-motion behavior, minimum-capability low-cost guards, dense/compact validation and a deterministic performance budget are CI-gated. Modern implementation builds on Basic with palette-neutral rounded geometry and neutral DTCG drop-shadow elevation for Panel/Card and Dialog. The shadow model is mapped consistently to Web CSS and Compose, including alpha-preserving generated tokens. The same reference-dark/reference-light palettes are CI-proven across Basic and Modern without theme forks. Web exercises Modern through the same functional reference application and 320 px compact-layout path as Basic, with an exact Chromium visual-delta baseline for Modern's intended geometry/elevation changes. Basic and Modern are both covered explicitly by the WCAG 2.2 AA integration contrast gate. Compose Desktop and Android expose equivalent Modern selection paths, with Android runtime instrumentation included in the representative device matrix. Modern also has a deterministic CI-enforced structural performance budget and is runtime-confirmed on the representative API 23 low-memory/large-font and API 35 high-density Android matrix. Glass now inherits Modern's geometry/elevation while adding palette-neutral translucent Panel/Card and Dialog surfaces without blur, backdrop blur or glow. Glass has dedicated foundation and deterministic performance gates, alpha-composited WCAG 2.2 AA surface checks, the shared Web reference/palette/320 px compact path with exact Chromium translucency/no-blur assertions, validated Compose Desktop/Android selection, and the same representative Android runtime confirmation. Frosted Glass now inherits Glass as its deterministic crisp fallback. Panel/Card and Dialog expose optional backdrop blur through the existing high → standard → minimal capability taxonomy. Web resolves that capability from the compiled neutral IR and applies native 24 px backdrop blur only to those declared surfaces, with Chromium proving an exact return to crisp Glass when the capability is unavailable. Compose Desktop and Android expose Frosted Glass selection without blur emulation and therefore exercise the deterministic Glass fallback. Dedicated Frosted performance and WCAG integration gates are green, and the representative API 23 low-memory/large-font plus API 35 high-density Android runtime matrix confirms the deterministic Compose fallback path. Spacey now extends Basic with a flat, palette-neutral aerospace/instrumentation geometry: pill-shaped controls, strong semantic instrument frames and compact Panel/Dialog radii without shadow, blur, backdrop blur or glow. Dedicated Spacey structure/performance and WCAG gates are green; the shared Web reference, 320 px compact path and Chromium visual delta are green, and Compose Desktop/Android expose the same selection path with a successful Android reference build. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Spacey selection path. Cyberpunk now extends Basic with sharp 6 px native signal-frame geometry, semantic accent/focus borders and bounded low/medium native elevation only on Panel/Card and Dialog. Dedicated structure/performance and WCAG integration gates, palette-neutral Web output, exact Chromium dark/light palette assertions, the 320 px compact path, Compose Desktop/Android selection, cross-platform reference parity and the Android reference build are green. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Cyberpunk selection path. Phase 5 is complete. Phase 6 is underway. Checkbox is complete across the neutral contract, Basic visual recipe, native Web and Compose adapters, Web/Desktop/Android reference paths, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Radio is complete across the neutral contract, dedicated tokens, Basic visual recipe, controlled Web adapter, native Web/Compose group semantics, Web/Desktop/Android reference paths, cross-platform reference parity, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Select / ComboBox is complete across the neutral contract, Basic visual recipe, controlled Web and Compose adapters, standalone Web and Basic Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Tabs is complete across the neutral contract, Basic visual recipe, controlled Web and Compose adapters, manual-activation keyboard/focus behavior, standalone Web plus Compose Desktop/Android references, cross-platform parity, WCAG target/contrast gates, Chromium compact interaction regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Tooltip is complete across the neutral contract, Basic visual recipe, controlled Web and Foundation Compose adapters, WCAG popup contrast, Chromium hover/focus/Escape plus flip/clamp regression, Web/Desktop/Android references, cross-platform parity, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density focus/runtime validation. Menu / Context Menu is complete across the neutral contract, Basic visual recipe, controlled Web and Foundation Compose adapters, native menu semantics, disabled-item skipping and roving keyboard focus, trigger-anchored plus host-supplied context placement, Web/Desktop/Android reference paths, WCAG target/contrast gates, Chromium keyboard/context/viewport regression, cross-platform parity, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Toast / Notification is complete across the neutral contract, Basic visuals, controlled Web/Foundation Compose adapters, accessible polite/assertive live-region behavior, pause/resume and persistent timing semantics, standalone Web plus Desktop/Android reference paths, cross-platform parity, Chromium runtime regression, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation. Progress / Spinner is complete across the neutral contract, Basic visuals, native Web/Foundation Compose adapters, determinate/indeterminate linear and circular semantics, shared neutral timing, standalone Web plus Desktop/Android reference paths, cross-platform parity, Chromium Reduced Motion/runtime regression, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model.

## Goal

Create a cross-platform, native-rendered GUI framework with a single renderer-neutral specification as source of truth for:

- semantic and component tokens,
- component behavior contracts,
- theme identity and inheritance,
- capability requirements and deterministic fallback recipes,
- accessibility requirements,
- portable assets.

Each platform adapter maps that specification onto native primitives. The framework must remain suitable for complex applications while staying clear, sharp, distinctive and performant.

## Architectural invariants

- The specification must not depend on one renderer or toolkit.
- Themes define visual grammar, not application-specific palettes.
- Palettes are independent semantic token sets and can be switched without duplicating theme definitions.
- Enhanced visual effects must declare capability requirements and deterministic fallback behavior.
- Functional interaction feedback is part of component behavior; decorative animation is optional and separable.
- Platform adapters may use native behavior where appropriate, but deviations from the neutral contract must be explicit and testable.
- Expensive visual effects are not allowed to become mandatory for basic usability.
- Generated outputs must be deterministic.

## Phase 0 — Repository foundation

- [x] License and contribution policy
- [x] Branching and release policy
- [x] Repository structure
- [x] CI skeleton
- [x] Documentation skeleton
- [x] Local-only roadmap policy

## Phase 1 — Renderer-neutral specification

- [x] DTCG-compatible token format
- [x] Component recipe schema
- [x] Theme schema and inheritance
- [x] Capability taxonomy
- [x] Fallback recipe schema
- [x] Motion policy model
- [x] Accessibility metadata model
- [x] Portable asset model
- [x] Manifest and versioning model
- [x] Validation tooling

## Phase 2 — Compiler and intermediate representation

- [x] Parse and validate specification
- [x] Resolve token aliases
- [x] Resolve theme inheritance
- [x] Resolve capability fallbacks
- [x] Produce stable typed IR
- [x] Emit deterministic diagnostics
- [x] Add compiler tests and fixtures

## Phase 3 — Adapter foundations

### Web

- [x] Token generation
- [x] Component recipe generation
- [x] Capability/fallback mapping
- [x] Native behavior helpers
- [x] Reference application

### Compose Desktop / Android

- [x] Token generation
- [x] Component recipe generation
- [x] Capability/fallback mapping
- [x] Native behavior helpers
- [x] Reference application

### Shared

- [x] Cross-adapter contract tests
- [x] Asset generation
- [x] Accessibility metadata generation
- [x] Performance-budget model

## Phase 4 — Theme system

- [x] Basic
- [x] Modern
- [x] Glass
- [x] Frosted Glass
- [x] Spacey
- [x] Cyberpunk

## Phase 5 — Reference component set

- [x] Button
- [x] Input / TextField
- [x] Switch / Toggle
- [x] Panel / Card
- [x] Dialog

## Phase 6 — Extended component set

- [x] Checkbox <!-- neutral contract/Basic recipe, native Web/Compose controls, WCAG target/contrast gates, Chromium compact/keyboard integration, Web/Desktop/Android reference paths and representative API 23/API 35 device-runtime validation are complete -->
- [x] Radio <!-- neutral contract/tokens/Basic visuals, controlled Web adapter, Web/Compose group semantics, Web/Desktop/Android reference integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard integration and representative API 23/API 35 device-runtime validation are complete -->
- [x] Select / ComboBox <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, standalone Web reference and Basic Compose Desktop/Android integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Tabs <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, manual-activation keyboard/focus behavior, standalone Web and Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation are complete -->
- [x] Tooltip <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, WCAG popup contrast, Chromium hover/focus/Escape plus flip/clamp regression, Web/Desktop/Android references, cross-platform parity, Android APK build and representative API 23/API 35 focus/runtime validation are complete -->
- [x] Menu / Context Menu <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, native semantics, disabled-item skipping, roving keyboard focus, trigger/context placement, Web/Desktop/Android references, WCAG gates, Chromium context/viewport regression, cross-platform parity, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Toast / Notification <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, accessible polite/assertive live-region behavior, pause/resume and persistent timing semantics, standalone Web plus Desktop/Android reference paths, cross-platform parity, Chromium runtime regression, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation are complete -->
- [x] Progress / Spinner <!-- neutral contract/Basic visuals, native Web/Foundation Compose adapters, determinate/indeterminate linear+circular semantics, neutral timing, standalone Web plus Desktop/Android references, cross-platform parity, Chromium Reduced Motion/runtime regression, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [ ] Slider
- [ ] Navigation primitives
- [ ] Table / Data Grid primitives
- [ ] Tree / Hierarchy primitives
- [ ] Form layout primitives
- [ ] Scroll container primitives
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
- documentation/status update.
