# GUI Framework Roadmap

## Current status

The project is in active foundation and adapter validation. Phases 0–4 are complete. The complete initial reference-component set is now implemented for both Web and Compose: Button, Input, Switch, Panel/Card and Dialog. Their contracts, theme visuals and platform mappings originate from the same neutral specification. The Web reference adapter is complete for this initial set: native semantics/accessibility mappings, keyboard/focus behavior, functional interaction feedback, deterministic capability fallbacks, portable SVG assets, popup/sidebar/options host-context validation, Playwright interactions and read-only visual-regression baselines are covered. Compose covers the same initial set with native semantics/input/focus behavior, functional interaction state mappings, deterministic capability fallbacks and portable assets. Stateful native Desktop and Android reference applications exercise the components, and the Android application is assembled as a real APK in Core CI. A shared neutral reference scenario gates the common Basic/reference-dark component set and interaction flows across Web, Compose Desktop and Compose Android while allowing platform-specific integration extensions. Renderer-neutral JSON contracts are additionally protected by a CI boundary test against Web-, Android- and Compose-specific vocabulary; the second-adapter architecture audit exposed no specification assumption requiring rework. Runtime validation now also exercises the Android reference application on API 23 with reduced memory and 1.30 font scale plus API 35 at high density. Phase 4 is complete. Phase 5 has completed the Basic theme contract: the full reference-component set, declared sizes/states, shared functional interaction motion, reduced-motion behavior, minimum-capability low-cost guards, dense/compact validation and a deterministic performance budget are CI-gated. Modern implementation builds on Basic with palette-neutral rounded geometry and neutral DTCG drop-shadow elevation for Panel/Card and Dialog. The shadow model is mapped consistently to Web CSS and Compose, including alpha-preserving generated tokens. The same reference-dark/reference-light palettes are CI-proven across Basic and Modern without theme forks. Web exercises Modern through the same functional reference application and 320 px compact-layout path as Basic, with an exact Chromium visual-delta baseline for Modern's intended geometry/elevation changes. Basic and Modern are both covered explicitly by the WCAG 2.2 AA integration contrast gate. Compose Desktop and Android expose equivalent Modern selection paths, with Android runtime instrumentation included in the representative device matrix. Modern also has a deterministic CI-enforced structural performance budget and is runtime-confirmed on the representative API 23 low-memory/large-font and API 35 high-density Android matrix. Glass now inherits Modern's geometry/elevation while adding palette-neutral translucent Panel/Card and Dialog surfaces without blur, backdrop blur or glow. Glass has dedicated foundation and deterministic performance gates, alpha-composited WCAG 2.2 AA surface checks, the shared Web reference/palette/320 px compact path with exact Chromium translucency/no-blur assertions, validated Compose Desktop/Android selection, and the same representative Android runtime confirmation. Frosted Glass now inherits Glass as its deterministic crisp fallback. Panel/Card and Dialog expose optional backdrop blur through the existing high → standard → minimal capability taxonomy. Web resolves that capability from the compiled neutral IR and applies native 24 px backdrop blur only to those declared surfaces, with Chromium proving an exact return to crisp Glass when the capability is unavailable. Compose Desktop and Android expose Frosted Glass selection without blur emulation and therefore exercise the deterministic Glass fallback. Dedicated Frosted performance and WCAG integration gates are green, and the representative API 23 low-memory/large-font plus API 35 high-density Android runtime matrix confirms the deterministic Compose fallback path. Spacey now extends Basic with a flat, palette-neutral aerospace/instrumentation geometry: pill-shaped controls, strong semantic instrument frames and compact Panel/Dialog radii without shadow, blur, backdrop blur or glow. Dedicated Spacey structure/performance and WCAG gates are green; the shared Web reference, 320 px compact path and Chromium visual delta are green, and Compose Desktop/Android expose the same selection path with a successful Android reference build. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Spacey selection path. Cyberpunk now extends Basic with sharp 6 px native signal-frame geometry, semantic accent/focus borders and bounded low/medium native elevation only on Panel/Card and Dialog. Dedicated structure/performance and WCAG integration gates, palette-neutral Web output, exact Chromium dark/light palette assertions, the 320 px compact path, Compose Desktop/Android selection, cross-platform reference parity and the Android reference build are green. Representative API 23 low-memory/large-font and API 35 high-density device-runtime validation now confirms the Cyberpunk selection path. Phase 5 is complete. Phase 6 is underway. Checkbox is complete across the neutral contract, Basic visual recipe, native Web and Compose adapters, Web/Desktop/Android reference paths, WCAG target/contrast gates, Chromium compact/keyboard integration, Android reference build and representative API 23 low-memory/large-font plus API 35 high-density device-runtime validation. Radio now has its neutral contract, dedicated tokens, Basic visual recipe, controlled Web adapter, native Compose selection semantics and dedicated Web/Compose adapter gates; group-level keyboard semantics, reference-app integration, WCAG integration and representative Android runtime validation remain before completion. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model.

## Product direction

Build a high-quality, renderer-neutral GUI framework whose visual system can be consumed by multiple native platform adapters without copying theme logic into each application.

The framework should remain:

- clear and sharp
- performant by default
- suitable for complex desktop, mobile and embedded UI structures
- recognisable without sacrificing usability
- renderer-neutral at the specification layer
- deterministic across platforms where exact visual parity is feasible
- capability-aware where exact parity is not technically sensible

## Non-goals for the current foundation

- binding the neutral specification directly to one rendering engine
- requiring proprietary tooling or hosted services
- decorative animation as a framework requirement
- forcing expensive visual effects onto low-capability targets
- promising pixel identity where renderer/platform differences make that impractical

## Phase 0 — Repository and policy foundation

- [x] Establish repository structure
- [x] Define restrictive copyleft licensing policy
- [x] Add AGPL-3.0-or-later licensing
- [x] Define package boundaries
- [x] Add CI validation baseline

## Phase 1 — Neutral specification foundation

- [x] Define renderer-neutral manifest
- [x] Define DTCG-compatible primitive/component token sources
- [x] Define theme schema
- [x] Define component recipe schema
- [x] Define asset portability profile
- [x] Define contrast/accessibility policy
- [x] Add deterministic compiler IR
- [x] Add theme inheritance
- [x] Add capability fallback resolution
- [x] Add typed visual recipe resolution
- [x] Add neutral-boundary CI guard

## Phase 2 — Initial component/reference surface

- [x] Button
- [x] Input
- [x] Switch
- [x] Panel/Card
- [x] Dialog
- [x] Shared reference scenarios
- [x] Reference-dark and reference-light palette variants

## Phase 3 — Web adapter

- [x] Generate Web token output from neutral IR
- [x] Generate Web component CSS from neutral visual recipes
- [x] Generate typed Web contracts
- [x] Map portable SVG assets
- [x] Native semantics and accessibility mappings
- [x] Keyboard/focus behavior
- [x] Functional interaction feedback
- [x] Capability fallback resolution
- [x] Stateful functional reference application
- [x] Browser-extension host-context validation
- [x] 320 px compact layout validation
- [x] Playwright interaction regression suite
- [x] Read-only Chromium visual baselines

## Phase 4 — Compose adapter and architecture audit

- [x] Generate Kotlin contracts from neutral IR
- [x] Generate Kotlin tokens from neutral IR
- [x] Generate Kotlin visual recipes from neutral IR
- [x] Map portable assets
- [x] Native Compose semantics/input/focus behavior
- [x] Functional interaction state mappings
- [x] Capability fallback resolution
- [x] Stateful Desktop reference application
- [x] Android reference application
- [x] Android APK assembly in CI
- [x] Shared Web/Desktop/Android reference parity gate
- [x] Renderer-neutral boundary audit after second adapter
- [x] Representative Android runtime matrix

## Phase 5 — Theme system completion

- [x] Basic
  - [x] complete reference-component visual contract
  - [x] size/state coverage
  - [x] functional interaction motion
  - [x] reduced-motion behavior
  - [x] minimum-capability/low-cost guards
  - [x] dense/compact validation
  - [x] deterministic performance budget
  - [x] WCAG 2.2 AA integration gate
  - [x] representative Android runtime validation
- [x] Modern
  - [x] palette-neutral geometry and elevation
  - [x] Web reference and compact-layout validation
  - [x] WCAG 2.2 AA integration gate
  - [x] Compose Desktop/Android selection paths
  - [x] deterministic performance budget
  - [x] representative Android runtime validation
- [x] Glass
  - [x] palette-neutral translucent surfaces
  - [x] no mandatory blur/backdrop-blur/glow
  - [x] alpha-composited WCAG surface checks
  - [x] Web/Compose reference validation
  - [x] deterministic performance budget
  - [x] representative Android runtime validation
- [x] Frosted Glass
  - [x] deterministic crisp Glass fallback
  - [x] optional native backdrop blur through capabilities
  - [x] Web high-capability blur path and crisp fallback validation
  - [x] Compose deterministic fallback path
  - [x] WCAG/performance gates
  - [x] representative Android runtime validation
- [x] Spacey
  - [x] flat aerospace/instrumentation geometry
  - [x] palette-neutral semantic instrumentation borders
  - [x] no expensive visual effects
  - [x] Web/Compose reference validation
  - [x] WCAG/performance gates
  - [x] representative Android runtime validation
- [x] Cyberpunk
  - [x] sharp signal-frame geometry
  - [x] semantic accent/focus borders
  - [x] bounded native elevation on surfaces
  - [x] no blur/backdrop-blur/glow dependency
  - [x] Web/Compose reference validation
  - [x] WCAG/performance gates
  - [x] representative Android runtime validation

## Phase 6 — Extended component set

- [x] Checkbox <!-- neutral contract/Basic recipe, native Web/Compose controls, WCAG target/contrast gates, Chromium compact/keyboard integration, Web/Desktop/Android reference paths and representative API 23/API 35 device-runtime validation are complete -->
- [ ] Radio <!-- neutral contract/tokens/Basic visuals, controlled Web adapter, native Compose selection semantics and dedicated adapter gates implemented; group keyboard semantics, reference integration, WCAG gates and representative Android runtime validation remain -->
- [ ] Select / ComboBox
- [ ] Tabs
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

## Architecture rules

1. The neutral specification remains the source of truth for component contracts, tokens, visual recipes and capability requirements.
2. Platform adapters consume compiled neutral output; platform-specific behavior belongs in adapters, not in the specification.
3. Theme definitions must not fork palettes. Semantic palette values remain independent from theme geometry/effects.
4. Enhanced visual effects must declare capabilities and deterministic fallbacks.
5. Accessibility and functional interaction behavior outrank decorative fidelity.
6. Expensive effects are opt-in and must remain bounded by performance budgets.
7. Generated output must remain deterministic and testable.
8. New component/theme work is not considered complete until its applicable quality gates are green.
