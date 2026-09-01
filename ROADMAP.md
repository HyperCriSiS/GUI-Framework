# GUI Framework Roadmap

## Current status

The project is in active foundation and adapter validation. Phases 0–4 are complete. The complete initial reference-component set is now implemented for both Web and Compose: Button, Input, Switch, Panel/Card and Dialog. Their contracts, theme visuals and platform mappings originate from the same neutral specification. The Web reference adapter is complete for this initial set: native semantics/accessibility mappings, keyboard/focus behavior, functional interaction feedback, deterministic capability fallbacks, portable SVG assets, popup/sidebar/options host-context validation, Playwright interactions and read-only visual-regression baselines are covered. Compose covers the same initial set with native semantics/input/focus behavior, functional interaction state mappings, deterministic capability fallbacks and portable assets. Stateful native Desktop and Android reference applications exercise the components, and the Android application is assembled as a real APK in Core CI. A shared neutral reference scenario gates the common Basic/reference-dark component set and interaction flows across Web, Compose Desktop and Compose Android while allowing platform-specific integration extensions. Renderer-neutral JSON contracts are additionally protected by a CI boundary test against Web-, Android- and Compose-specific vocabulary; the second-adapter architecture audit exposed no specification assumption requiring rework. Runtime validation now also exercises the Android reference application on API 23 with reduced memory and 1.30 font scale plus API 35 at high density. Phase 4 is complete. Phase 5 has completed the Basic theme contract: the full reference-component set, declared sizes/states, shared functional interaction motion, reduced-motion behavior, minimum-capability low-cost guards, dense/compact validation and a deterministic performance budget are CI-gated. Modern implementation builds on Basic with palette-neutral rounded geometry and neutral DTCG drop-shadow elevation for Panel/Card and Dialog. The shadow model is mapped consistently to Web CSS and Compose, including alpha-preserving generated tokens. The same reference-dark/reference-light palettes are CI-proven across Basic and Modern without theme forks. Web exercises Modern through the same functional reference application and 320 px compact-layout path as Basic, with an exact Chromium visual-delta baseline for Modern's intended geometry/elevation changes. Basic and Modern are both covered explicitly by the WCAG 2.2 AA integration contrast gate. Compose Desktop and Android expose equivalent Modern selection paths, with Android runtime instrumentation included in the representative device matrix. Modern also has a deterministic CI-enforced structural performance budget and is runtime-confirmed on the representative API 23 low-memory/large-font and API 35 high-density Android matrix. Glass now inherits Modern's geometry/elevation while adding palette-neutral translucent Panel/Card and Dialog surfaces without blur, backdrop blur or glow. Glass has dedicated foundation and deterministic performance gates, alpha-composited WCAG 2.2 AA surface checks, the shared Web reference/palette/320 px compact path with exact Chromium translucency/no-blur assertions, validated Compose Desktop/Android selection, and the same representative Android runtime confirmation. Frosted Glass now inherits Glass as its deterministic crisp fallback. Panel/Card and Dialog expose optional backdrop blur through the existing high → standard → minimal capability taxonomy. Web resolves that capability from the compiled neutral IR and applies native 24 px backdrop blur only to those declared surfaces, with Chromium proving an exact return to crisp Glass when the capability is unavailable. Compose Desktop and Android expose Frosted Glass selection without blur emulation and therefore exercise the deterministic Glass fallback. Dedicated Frosted performance and WCAG integration gates are green, and the representative API 23 low-memory/large-font plus API 35 high-density Android runtime matrix confirms the deterministic Compose fallback path. Spacey now extends Basic with a flat, palette-neutral aerospace/instrumentation geometry: pill-shaped controls, strong semantic instrument frames and compact Panel/Dialog radii without shadow, blur, backdrop blur or glow. Dedicated Spacey structure/performance and WCAG gates are green; the shared Web reference, 320 px compact path and Chromium visual delta are green, and Compose Desktop/Android expose the same selection path with a successful Android reference build. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Spacey selection path. Cyberpunk now extends Basic with sharp 6 px native signal-frame geometry, semantic accent/focus borders and bounded low/medium native elevation only on Panel/Card and Dialog. Dedicated structure/performance and WCAG integration gates, palette-neutral Web output, exact Chromium dark/light palette assertions, the 320 px compact path, Compose Desktop/Android selection, cross-platform reference parity and the Android reference build are green. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Cyberpunk selection path. Phase 5 is complete. Phase 6 is underway. Checkbox is complete across the neutral contract, Basic visual recipe, native Web and Compose adapters, Web/Desktop/Android reference paths, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Radio is complete across the neutral contract, dedicated tokens, Basic visual recipe, controlled Web adapter, native Web/Compose group semantics, Web/Desktop/Android reference paths, cross-platform reference parity, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Select / ComboBox is complete across the neutral contract, Basic visual recipe, controlled Web and Compose adapters, standalone Web and Basic Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Tabs is complete across the neutral contract, Basic visual recipe, controlled Web and Compose adapters, manual-activation keyboard/focus behavior, standalone Web plus Compose Desktop/Android references, cross-platform parity, WCAG target/contrast gates, Chromium compact interaction regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model.

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

---

## Phase 0 — Repository foundation

- [x] Repository skeleton
- [x] Restrictive copyleft licensing baseline
- [x] License policy documentation
- [x] Workspace/package layout
- [x] Core CI baseline
- [x] Line-ending policy

## Phase 1 — Renderer-neutral specification

- [x] DTCG-compatible primitive token source
- [x] Semantic palette token sources
- [x] Component token source
- [x] Visual-effect token source
- [x] Portable asset manifest/profile
- [x] Framework manifest schema
- [x] Theme schema
- [x] Component recipe schema
- [x] Contrast policy schema
- [x] Renderer-neutral specification validator
- [x] Theme inheritance
- [x] Capability taxonomy and deterministic fallback selection
- [x] Typed visual recipe resolution
- [x] Deterministic compiler IR
- [x] Reference palette family/variant model
- [x] Renderer-neutral vocabulary boundary test

## Phase 2 — Initial reference component set

- [x] Button
- [x] Input
- [x] Switch
- [x] Panel / Card
- [x] Dialog
- [x] Portable SVG asset path
- [x] Shared neutral reference scenarios

## Phase 3 — Web adapter

- [x] Generate CSS variables from neutral token IR
- [x] Generate component CSS from neutral visual recipes
- [x] Generate TypeScript contracts
- [x] Generate portable asset registry
- [x] Button adapter
- [x] Input adapter
- [x] Switch adapter
- [x] Panel adapter
- [x] Dialog adapter
- [x] Capability resolver
- [x] Reference Web application
- [x] Stateful reference interactions
- [x] Popup host-context validation
- [x] Sidebar host-context validation
- [x] Options-page host-context validation
- [x] Compact-width validation
- [x] Keyboard/focus validation
- [x] Reduced-motion validation
- [x] Playwright Chromium interaction suite
- [x] Read-only Chromium visual-regression baselines

## Phase 4 — Compose adapter and second-adapter audit

- [x] Generate Kotlin contracts
- [x] Generate Kotlin tokens
- [x] Generate Compose visual recipes
- [x] Generate portable asset registry
- [x] Button adapter
- [x] Input adapter
- [x] Switch adapter
- [x] Panel adapter
- [x] Dialog adapter
- [x] Capability resolver
- [x] Stateful Compose Desktop reference application
- [x] Stateful Compose Android reference application
- [x] Android APK build in CI
- [x] Compose semantics/input/focus validation
- [x] Scaling/minimum-capability validation
- [x] Shared Web/Desktop/Android parity gate
- [x] Renderer-neutral second-adapter architecture audit
- [x] API 23 low-memory / large-font runtime validation
- [x] API 35 high-density runtime validation

## Phase 5 — Theme system

- [x] Basic
- [x] Modern
- [x] Glass
- [x] Frosted Glass
- [x] Spacey
- [x] Cyberpunk
- [x] Basic deterministic performance budget
- [x] Modern deterministic performance budget
- [x] Glass deterministic performance budget
- [x] Frosted Glass deterministic performance budget
- [x] Spacey deterministic performance budget
- [x] Cyberpunk deterministic performance budget
- [x] WCAG 2.2 AA integration gate for Basic
- [x] WCAG 2.2 AA integration gate for Modern
- [x] WCAG 2.2 AA integration gate for Glass
- [x] WCAG 2.2 AA integration gate for Frosted Glass
- [x] WCAG 2.2 AA integration gate for Spacey
- [x] WCAG 2.2 AA integration gate for Cyberpunk
- [x] Web reference validation for all six themes
- [x] Compose Desktop selection for all six themes
- [x] Compose Android selection for all six themes
- [x] Representative Android runtime selection validation for all six themes

## Phase 6 — Extended component set

- [x] Checkbox <!-- neutral contract/Basic recipe, native Web/Compose controls, WCAG target/contrast gates, Chromium compact/keyboard integration, Web/Desktop/Android reference paths and representative API 23/API 35 device-runtime validation are complete -->
- [x] Radio <!-- neutral contract/tokens/Basic visuals, controlled Web adapter, Web/Compose group semantics, Web/Desktop/Android reference integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard integration and representative API 23/API 35 device-runtime validation are complete -->
- [x] Select / ComboBox <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, standalone Web reference and Basic Compose Desktop/Android integration, cross-platform parity, WCAG target/contrast gates, Chromium compact/keyboard/editable integration, Android instrumentation/APK build and representative API 23/API 35 runtime validation are complete -->
- [x] Tabs <!-- neutral contract/Basic visuals, controlled Web/Compose adapters, manual-activation keyboard/focus behavior, standalone Web and Compose Desktop/Android reference paths, cross-platform parity, WCAG target/contrast gates, Chromium compact regression, Android APK build and representative API 23 low-memory/large-font plus API 35 high-density runtime validation are complete -->
- [ ] Tooltip
- [ ] Menu / Context Menu
- [ ] Toast / Notification
- [ ] Progress / Spinner
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
- [ ] Example applications
- [ ] Release automation
- [ ] Security policy
- [ ] Contributor workflow
- [ ] Representative consumer fixtures that build from packaged/generated artifacts rather than repository-internal source paths
- [ ] Public API/neutral-contract compatibility diff gate with lifecycle-appropriate migration notes
- [ ] Minimum supported consumer toolchain/runtime verification

## Quality gates

Every completed component/theme should eventually satisfy the applicable subset of these gates:

- schema validation
- deterministic compilation
- renderer-neutral boundary checks
- adapter contract generation
- native semantics/accessibility
- keyboard/focus interaction
- compact/dense layout
- capability fallback behavior
- WCAG contrast/target requirements
- deterministic performance budget
- reference application integration
- browser regression where applicable
- Android build/runtime validation where applicable
- cross-platform parity where applicable
- text/locale/RTL/IME robustness where applicable
- clean consumer install/build smoke tests where applicable
- public API/contract compatibility diff where applicable

## Architecture rules

1. The neutral specification remains the source of truth for component contracts, tokens, visual recipes and capability requirements.
2. Platform adapters consume compiled neutral output; platform-specific behavior belongs in adapters, not in the specification.
3. Theme definitions must not fork palettes. Semantic palette values remain independent from theme geometry/effects.
4. Enhanced visual effects must declare capabilities and deterministic fallbacks.
5. Accessibility and functional interaction behavior outrank decorative fidelity.
6. Expensive effects are opt-in and must remain bounded by performance budgets.
7. Generated output must remain deterministic and testable.
8. New component/theme work is not considered complete until its applicable quality gates are green.

## Platform/toolchain support matrix

The initial support policy is intentionally conservative and designed around the adapters currently exercised in CI.

### Web

- Chromium is the first fully automated browser target.
- Generated CSS and TypeScript contracts remain standards-based and are not intentionally Chromium-specific.
- Firefox/WebKit automation can be added once the reference surface is stable enough that the additional matrix cost is justified.
- Browser-extension host contexts are explicitly part of the Web adapter target surface.

### Compose

- Compose Desktop is a first-class reference adapter target.
- Android is a first-class reference adapter target.
- Android CI currently builds against the Android 17 preview SDK while representative runtime validation spans API 23 and API 35.
- The framework does not require Material components; adapter primitives remain based on Compose Foundation/UI where practical.

### Node / Java / Gradle

- CI currently uses Node 24, Java 17 and Gradle 9.5.0.
- Toolchain upgrades should be validated centrally rather than per adapter/application.
- Generated outputs should not require application consumers to mirror the repository's development toolchain exactly unless a package explicitly documents that requirement.

## Package naming and compatibility policy

- Package IDs stay capability-/adapter-oriented rather than theme-oriented.
- Themes remain data/specification assets rather than separate platform packages unless distribution constraints later justify otherwise.
- Pre-1.0 releases may make breaking neutral-contract changes, but each such change must update generated adapters, reference applications and migration notes together.
- 1.0 establishes the first stable neutral specification/API baseline.
- After 1.0, breaking contract changes require a major version.
- Additive tokens, themes and components should remain backward compatible wherever practical.
- Adapter capability expansion must not silently change deterministic fallback behavior on platforms that do not gain the new capability.

## Engineering review notes

- 2026-09-01: the complete implementation was consolidated from the long-lived `feat/core-foundation` branch back into canonical `main`, restoring the repository invariant defined in `BRANCHING.md`. The merged feature branch should be deleted as repository hygiene.
- The reusable Software-Engineering-Framework now has a dedicated Library / Framework application module. GUI-specific methodology remains project-local rather than being generalized prematurely.
- This review deliberately did not add a GUI/design-system-specific reusable module: the existing generic architecture, accessibility, performance and compatibility assurance plus this project's concrete gates already cover those concerns without framework duplication.

## Deferred decisions

These remain intentionally open until the current component/theme foundation provides enough evidence:

- exact package-registry publication layout,
- whether WebKit/Firefox join the mandatory CI matrix before 1.0,
- whether an additional native adapter should be implemented before 1.0,
- whether advanced rendering engines are needed for any future theme layer,
- whether theme-specific optional asset packs become useful,
- exact long-term ABI compatibility promises for generated Kotlin contracts.
