# GUI Framework Roadmap

## Current status

The project is in active foundation and adapter validation. Phases 0–4 are complete. The complete initial reference-component set is now implemented for both Web and Compose: Button, Input, Switch, Panel/Card and Dialog. Their contracts, theme visuals and platform mappings originate from the same neutral specification. The Web reference adapter is complete for this initial set: native semantics/accessibility mappings, keyboard/focus behavior, functional interaction feedback, deterministic capability fallbacks, portable SVG assets, popup/sidebar/options host-context validation, Playwright interactions and read-only visual-regression baselines are covered. Compose covers the same initial set with native semantics/input/focus behavior, functional interaction state mappings, deterministic capability fallbacks and portable assets. Stateful native Desktop and Android reference applications exercise the components, and the Android application is assembled as a real APK in Core CI. A shared neutral reference scenario gates the common Basic/reference-dark component set and interaction flows across Web, Compose Desktop and Compose Android while allowing platform-specific integration extensions. Renderer-neutral JSON contracts are additionally protected by a CI boundary test against Web-, Android- and Compose-specific vocabulary; the second-adapter architecture audit exposed no specification assumption requiring rework. Runtime validation now also exercises the Android reference application on API 23 with reduced memory and 1.30 font scale plus API 35 at high density. Phase 4 is complete. Phase 5 has completed the Basic theme contract: the full reference-component set, declared sizes/states, shared functional interaction motion, reduced-motion behavior, minimum-capability low-cost guards, dense/compact validation and a deterministic performance budget are CI-gated. Modern implementation builds on Basic with palette-neutral rounded geometry and neutral DTCG drop-shadow elevation for Panel/Card and Dialog. The shadow model is mapped consistently to Web CSS and Compose, including alpha-preserving generated tokens. The same reference-dark/reference-light palettes are CI-proven across Basic and Modern without theme forks. Web exercises Modern through the same functional reference application and 320 px compact-layout path as Basic, with an exact Chromium visual-delta baseline for Modern's intended geometry/elevation changes. Basic and Modern are both covered explicitly by the WCAG 2.2 AA integration contrast gate. Compose Desktop and Android expose equivalent Modern selection paths, with Android runtime instrumentation included in the representative device matrix. Modern also has a deterministic CI-enforced structural performance budget and is runtime-confirmed on the representative API 23 low-memory/large-font and API 35 high-density Android matrix. Glass now inherits Modern's geometry/elevation while adding palette-neutral translucent Panel/Card and Dialog surfaces without blur, backdrop blur or glow. Glass has dedicated foundation and deterministic performance gates, alpha-composited WCAG 2.2 AA surface checks, the shared Web reference/palette/320 px compact path with exact Chromium translucency/no-blur assertions, validated Compose Desktop/Android selection, and the same representative Android runtime confirmation. Frosted Glass now inherits Glass as its deterministic crisp fallback. Panel/Card and Dialog expose optional backdrop blur through the existing high → standard → minimal capability taxonomy. Web resolves that capability from the compiled neutral IR and applies native 24 px backdrop blur only to those declared surfaces, with Chromium proving an exact return to crisp Glass when the capability is unavailable. Compose Desktop and Android expose Frosted Glass selection without blur emulation and therefore exercise the deterministic Glass fallback. Dedicated Frosted performance and WCAG integration gates are green, and the representative API 23 low-memory/large-font plus API 35 high-density Android runtime matrix confirms the deterministic Compose fallback path. Spacey now extends Basic with a flat, palette-neutral aerospace/instrumentation geometry: pill-shaped controls, strong semantic instrument frames and compact Panel/Dialog radii without shadow, blur, backdrop blur or glow. Dedicated Spacey structure/performance and WCAG gates are green; the shared Web reference, 320 px compact path and Chromium visual delta are green, and Compose Desktop/Android expose the same selection path with a successful Android reference build. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Spacey selection path. Cyberpunk now extends Basic with sharp 6 px native signal-frame geometry, semantic accent/focus borders and bounded low/medium native elevation only on Panel/Card and Dialog. Dedicated structure/performance and WCAG integration gates, palette-neutral Web output, exact Chromium dark/light palette assertions, the 320 px compact path, Compose Desktop/Android selection, cross-platform reference parity and the Android reference build are green. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Cyberpunk selection path. Phase 5 is complete. Phase 6 is underway. Checkbox is complete across the neutral contract, Basic visual recipe, native Web and Compose adapters, Web/Desktop/Android reference paths, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Radio is complete across the neutral contract, dedicated tokens, Basic visual recipe, controlled Web adapter, native Web/Compose group semantics, Web/Desktop/Android reference paths, cross-platform reference parity, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Select / ComboBox is complete across the neutral contract, Basic visual recipe, controlled Web and Compose adapters, standalone Web and Basic Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Tabs is complete across the neutral contract, Basic visual recipe, controlled Web and Compose adapters, manual-activation keyboard/focus behavior, standalone Web plus Compose Desktop/Android references, cross-platform parity, WCAG target/contrast gates, Chromium compact interaction regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Tooltip is complete across the neutral contract, Basic visual recipe, controlled Web and Foundation Compose adapters, WCAG popup contrast, Chromium hover/focus/Escape plus flip/clamp regression, Web/Desktop/Android references, cross-platform parity, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density focus/runtime validation. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model.

## Goal

Create a cross-platform, native-rendered GUI framework with a single renderer-neutral specification as source of truth for:

- semantic and component tokens,
- component behavior contracts,
- theme identity and inheritance,
- capability requirements and deterministic fallback recipes,
- accessibility requirements,
- portable assets.

Each platform adapter maps that specification onto native primitives. The framework must remain suitable for complex applications while staying clear, sharp, distinctive and performant.

## Phase 0 — Repository and specification foundation

- [x] Create a dedicated repository
- [x] Adopt AGPL-3.0-or-later
- [x] Keep the project roadmap repository-local
- [x] Define renderer-neutral specification boundaries
- [x] Define repository layout for spec, compiler and adapters
- [x] Define contribution/security policy baseline

## Phase 1 — Token system

- [x] Define token namespace and DTCG-style schema subset
- [x] Define primitive color tokens
- [x] Define semantic color tokens
- [x] Define typography tokens
- [x] Define spacing/radius/border/focus/opacity tokens
- [x] Define semantic motion tokens for functional interaction feedback
- [x] Define component-specific sizing tokens where primitives are insufficient
- [x] Add strict schema validation
- [x] Add token reference resolution
- [x] Add cycle and missing-reference detection
- [x] Add deterministic compiler output

## Phase 2 — Theme and palette model

- [x] Separate themes from palettes
- [x] Register six initial themes: Basic, Modern, Glass, Frosted Glass, Spacey, Cyberpunk
- [x] Define palette families and variants without hard-coding a light/dark-only data model
- [x] Keep reference palettes as development examples rather than theme identities
- [x] Define theme inheritance and override rules
- [x] Define capability requirements and fallback chains
- [x] Define capability taxonomy for baseline native rendering versus optional enhanced effects
- [x] Define deterministic fallback recipe selection
- [x] Define functional motion semantics independently of decorative animation

## Phase 3 — Compiler and generated contracts

- [x] Compile neutral specification into deterministic IR
- [x] Generate Web token output from IR
- [x] Generate Kotlin token output from IR
- [x] Generate Web component CSS from theme recipes
- [x] Generate Web TypeScript contracts
- [x] Generate Kotlin contracts
- [x] Generate capability-profile metadata for adapters
- [x] Generate typed visual recipes for Compose
- [x] Generate portable assets for Web and Compose
- [x] Enforce renderer-neutral vocabulary boundaries in CI

## Phase 4 — Initial reference component set

- [x] Button
- [x] Input
- [x] Switch
- [x] Panel / Card
- [x] Dialog
- [x] Native Web adapter mappings
- [x] Native Compose adapter mappings
- [x] Functional Web reference application
- [x] Functional Compose Desktop reference application
- [x] Functional Compose Android reference application
- [x] Android APK assembly in CI
- [x] Web popup/sidebar/options host-context validation
- [x] Web Playwright keyboard/focus/interaction validation
- [x] Web visual-regression baseline
- [x] Cross-platform reference scenario/parity validation
- [x] Android representative runtime matrix

## Phase 5 — Theme implementation and proof

- [x] Basic theme contract and quality gate
- [x] Modern theme implementation and validation
- [x] Glass theme implementation and validation
- [x] Frosted Glass implementation and validation
- [x] Spacey theme implementation and validation
- [x] Cyberpunk theme implementation and validation
- [x] Palette-neutral dark/light reference proof across all six themes
- [x] Deterministic per-theme performance budgets
- [x] WCAG 2.2 AA integration contrast gates across all six themes
- [x] Web compact-layout validation for all six themes
- [x] Web reference validation for all six themes
- [x] Compose Desktop selection for all six themes
- [x] Compose Android selection for all six themes
- [x] Representative Android runtime selection validation for all six themes

## Phase 6 — Extended component set

- [x] Checkbox <!-- neutral contract/Basic recipe, native Web/Compose controls, WCAG target/contrast gates, Chromium compact/keyboard integration, Web/Desktop/Android reference paths and representative API 23/API 35 device-runtime validation are complete -->
- [x] Radio <!-- neutral contract/tokens/Basic visuals, controlled Web adapter, Web/Compose group semantics, Web/Desktop/Android reference integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard integration and representative API 23/API 35 device-runtime validation are complete -->
- [x] Select / ComboBox <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, standalone Web reference and Basic Compose Desktop/Android integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Tabs <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, manual-activation keyboard/focus behavior, standalone Web and Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation are complete -->
- [x] Tooltip <!-- neutral contract/Basic visuals, controlled Web/Foundation Compose adapters, WCAG popup contrast, Chromium hover/focus/Escape plus flip/clamp regression, Web/Desktop/Android references, cross-platform parity, Android APK build and representative API 23/API 35 focus/runtime validation are complete -->
- [ ] Menu / Context Menu
- [ ] Toast / Notification
- [ ] Progress / Spinner
- [ ] Slider
- [ ] Navigation primitives
- [ ] Table / Data Grid primitives
- [ ] Tree / Hierarchy primitives
- [ ] Form layout primitives
- [ ] Scroll container primitives

## Phase 7 — Integration kits

- [ ] Browser extension integration kit
- [ ] Desktop integration kit
- [ ] Android integration kit
- [ ] Python integration kit
- [ ] Web integration kit

## Phase 8 — Hardening and release preparation

- [ ] Component API freeze candidate
- [ ] Full cross-theme screenshot matrix
- [ ] Full cross-platform interaction matrix
- [ ] Performance profiling and optimization
- [ ] Accessibility audit and documentation
- [ ] Security review
- [ ] Packaging and distribution proof
- [ ] 0.x release candidate

## Validation gates

- [x] Schema validation
- [x] Deterministic compilation
- [x] Renderer-neutral boundary enforcement
- [x] Generated adapter contracts
- [x] Native semantics/accessibility mapping for implemented reference components
- [x] Keyboard/focus validation for implemented interactive components
- [x] Compact/dense layout validation
- [x] Capability fallback validation
- [x] WCAG contrast/target-size integration validation
- [x] Deterministic performance budget validation
- [x] Cross-platform reference integration
- [x] Browser interaction regression validation
- [x] Android build/runtime validation
- [x] Cross-platform parity validation
