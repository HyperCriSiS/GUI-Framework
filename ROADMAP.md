# GUI Framework Roadmap

## Current status

The project is in active foundation and adapter validation. Phases 0–4 are complete. The complete initial reference-component set is now implemented for both Web and Compose: Button, Input, Switch, Panel/Card and Dialog. Their contracts, theme visuals and platform mappings originate from the same neutral specification. The Web reference adapter is complete for this initial set: native semantics/accessibility mappings, keyboard/focus behavior, functional interaction feedback, deterministic capability fallbacks, portable SVG assets, popup/sidebar/options host-context validation, Playwright interactions and read-only visual-regression baselines are covered. Compose covers the same initial set with native semantics/input/focus behavior, functional interaction state mappings, deterministic capability fallbacks and portable assets. Stateful native Desktop and Android reference applications exercise the components, and the Android application is assembled as a real APK in Core CI. A shared neutral reference scenario gates the common Basic/reference-dark component set and interaction flows across Web, Compose Desktop and Compose Android while allowing platform-specific integration extensions. Renderer-neutral JSON contracts are additionally protected by a CI boundary test against Web-, Android- and Compose-specific vocabulary; the second-adapter architecture audit exposed no specification assumption requiring rework. Runtime validation now also exercises the Android reference application on API 23 with reduced memory and 1.30 font scale plus API 35 at high density. Phase 4 is complete. Phase 5 has completed the Basic theme contract: the full reference-component set, declared sizes/states, shared functional interaction motion, reduced-motion behavior, minimum-capability low-cost guards, dense/compact validation and a deterministic performance budget are CI-gated. Modern implementation builds on Basic with palette-neutral rounded geometry and neutral DTCG drop-shadow elevation for Panel/Card and Dialog. The shadow model is mapped consistently to Web CSS and Compose, including alpha-preserving generated tokens. The same reference-dark/reference-light palettes are CI-proven across Basic and Modern without theme forks. Web exercises Modern through the same functional reference application and 320 px compact-layout path as Basic, with an exact Chromium visual-delta baseline for Modern's intended geometry/elevation changes. Basic and Modern are both covered explicitly by the WCAG 2.2 AA integration contrast gate. Compose Desktop and Android expose equivalent Modern selection paths, with Android runtime instrumentation included in the representative device matrix. Modern also has a deterministic CI-enforced structural performance budget and is runtime-confirmed on the representative API 23 low-memory/large-font and API 35 high-density Android matrix. Glass now inherits Modern's geometry/elevation while adding palette-neutral translucent Panel/Card and Dialog surfaces without blur, backdrop blur or glow. Glass has dedicated foundation and deterministic performance gates, alpha-composited WCAG 2.2 AA surface checks, the shared Web reference/palette/320 px compact path with exact Chromium translucency/no-blur assertions, validated Compose Desktop/Android selection, and the same representative Android runtime confirmation. Frosted Glass now inherits Glass as its crisp fallback foundation; Panel/Card and Dialog declare optional backdrop-blur capability through the existing high → standard → minimal fallback taxonomy, while native blur rendering remains the next open slice. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model.

## Phase 0 — Foundation and scope

- [x] Define project scope and non-goals.
- [x] Establish repository structure and contribution baseline.
- [x] Select AGPL-3.0-or-later licensing.
- [x] Define the initial theme set: Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk.
- [x] Establish native-host rendering as the default architecture.
- [x] Defer direct Skia integration until a concrete renderer limitation justifies it.
- [x] Define baseline accessibility requirements.
- [x] Define baseline interaction-feedback requirements.
- [x] Separate functional interaction feedback from optional decorative motion.
- [x] Fix the initial theme set to Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk.
- [x] Decouple themes from palettes.

## Phase 1 — Language-neutral specification

- [x] Define a renderer-neutral component contract format.
- [x] Define design-token schema using DTCG-compatible token files.
- [x] Define semantic color roles.
- [x] Define spacing, sizing, typography and radius scales.
- [x] Define visual-effect tokens and capability requirements.
- [x] Define theme inheritance.
- [x] Define palette independence.
- [x] Define component states and variants.
- [x] Define accessibility metadata and requirements.
- [x] Define interaction-feedback contracts.
- [x] Define capability/fallback semantics.
- [x] Define portable asset metadata.
- [x] Define schema/version metadata.
- [x] Provide reference tokens, themes and palettes.
- [x] Validate all neutral specification files.

## Phase 2 — Compiler and validation toolchain

- [x] Compile neutral specification into a deterministic intermediate representation.
- [x] Validate component/token/theme/palette references.
- [x] Resolve theme inheritance deterministically.
- [x] Resolve capability fallbacks deterministically.
- [x] Resolve typed visual recipes.
- [x] Validate accessibility contracts.
- [x] Generate Web token output.
- [x] Generate Web component output.
- [x] Generate portable Web assets.
- [x] Generate TypeScript contracts.
- [x] Generate Kotlin contracts.
- [x] Generate Kotlin tokens.
- [x] Generate Kotlin visual recipes.
- [x] Generate portable Kotlin assets.
- [x] Add deterministic compiler and generator tests.
- [x] Add renderer-neutral boundary protection.

## Phase 3 — Web reference adapter

The Web adapter uses native browser mechanisms rather than a custom rendering runtime.

- [x] Implement native Web Button.
- [x] Implement native Web Input.
- [x] Implement native Web Switch.
- [x] Implement native Web Panel/Card.
- [x] Implement native Web Dialog.
- [x] Implement SVG asset integration.
- [x] Map semantic accessibility properties to native HTML/ARIA.
- [x] Map keyboard/focus behavior to native browser behavior.
- [x] Map functional interaction feedback.
- [x] Implement reduced-motion handling.
- [x] Implement deterministic capability fallbacks.
- [x] Add minimum-capability low-cost guards.
- [x] Build a real functional reference application using the Web adapter.
- [x] Add Playwright interaction coverage.
- [x] Add read-only visual-regression baselines.
- [x] Validate popup/sidebar/options host contexts for browser-extension use. <!-- Playwright validates constrained extension-style widths, overflow, keyboard focus and dialog fit -->
- [x] Verify the initial adapter remains portable beyond browser-extension hosts. <!-- page reference stays the canonical baseline while host-context CSS is additive -->

## Phase 4 — Compose reference adapter

Compose is the second architecture-validation adapter and covers Android plus Desktop.

- [x] Implement native Compose Button.
- [x] Implement native Compose Input.
- [x] Implement native Compose Switch.
- [x] Implement native Compose Panel/Card.
- [x] Implement native Compose Dialog.
- [x] Map accessibility requirements to Compose semantics.
- [x] Map native input/focus behavior.
- [x] Map functional interaction state.
- [x] Implement deterministic capability fallbacks.
- [x] Implement portable asset integration.
- [x] Add scaling and minimum-capability validation.
- [x] Build Desktop reference application.
- [x] Build Android reference application. <!-- native Activity reference uses the shared Compose adapter/generated artifacts and a real assembleDebug APK build is gated in Core CI -->
- [x] Add Android device-runtime validation on representative low/high configurations. <!-- API 23 low-memory/large-font and API 35 high-density matrix -->
- [x] Gate a shared cross-platform reference scenario.
- [x] Rework the specification if the second adapter exposes platform-specific assumptions. <!-- architecture audit completed: no current rework is required; canonical JSON contracts are CI-gated against renderer-specific vocabulary to prevent regressions -->

## Phase 5 — Theme and palette implementation

### Themes

- [x] Basic <!-- full initial component set, declared sizes/states, functional interaction motion, reduced-motion, low-cost guards, compact/dense validation and deterministic performance budget are CI-gated -->
- [x] Modern <!-- inherited rounded geometry and neutral drop-shadow elevation are mapped in Web/Compose; shared palettes, explicit WCAG 2.2 AA integration checks, Chromium visual-delta baseline, compact validation and deterministic performance budget are CI-gated; Compose selection/instrumentation and representative API 23/API 35 device-runtime validation are complete -->
- [x] Glass <!-- inherits Modern; crisp palette-neutral translucent Panel/Card and Dialog surfaces deliberately exclude blur/backdrop blur/glow; foundation/performance and alpha-composited WCAG gates plus Web visual-delta/compact validation, Compose selection/instrumentation and representative API 23/API 35 device-runtime validation are complete -->
- [ ] Frosted Glass <!-- inherits Glass as the deterministic crisp fallback; Panel/Card and Dialog expose optional backdropBlur through high → standard → minimal capability tiers; inherited foundation is CI-gated across compiler, Web, Compose and cross-platform parity; native blur rendering/fallback validation remains -->
- [ ] Spacey
- [ ] Cyberpunk

### Palette system

- [x] Keep palettes independent of themes.
- [x] Define semantic palette roles rather than direct component colors.
- [x] Define palette families/variants without hard-coding a light/dark-only model.
- [x] Enforce semantic contrast requirements in CI.
- [x] Validate palette/theme switching deterministically.
- [x] Prove the same palette can be reused across multiple themes where appropriate. <!-- reference-dark and reference-light compile against both Basic and Modern without palette-specific theme forks -->

## Phase 6 — Extended component set

- [ ] Checkbox
- [ ] Radio
- [ ] Select/ComboBox
- [ ] Tabs
- [ ] Slider
- [ ] Progress indicators
- [ ] Toolbar
- [ ] Navigation components
- [ ] Menu
- [ ] Context menu
- [ ] Tooltip
- [ ] List
- [ ] Tree
- [ ] Table/Data grid
- [ ] Scroll area
- [ ] Split panes
- [ ] Resizable panels
- [ ] Form validation primitives

## Phase 7 — Complex application patterns

- [ ] Settings interfaces.
- [ ] Dashboards.
- [ ] Workspace layouts.
- [ ] Master-detail layouts.
- [ ] Inspector/property panels.
- [ ] Large data views.
- [ ] Nested navigation.
- [ ] Responsive compact/dense modes.
- [ ] Browser-extension popup/sidebar/options patterns.
- [ ] Define a host-integration contract for incremental adoption in existing applications.
- [ ] Validate mixed migration: existing host/native widgets can coexist with framework components without an all-or-nothing rewrite.

These are integration/reference applications, not mockup-only deliverables.

## Phase 8 — Optional advanced visual layers

- [ ] Define the minimal extension contract for advanced visual providers.
- [ ] Add optional Rive integration only where it provides concrete value.
- [ ] Add N-slice/9-slice support where useful.
- [ ] Evaluate direct Skia integration only against a demonstrated renderer limitation.
- [ ] Add shader/effect integration only when justified by a real theme requirement.
- [ ] Keep advanced dependencies removable and modular.
- [ ] Ensure normal application code never needs renderer-specific component APIs.

## Phase 9 — Advanced optional motion

Baseline interaction feedback belongs to the core specification. This phase covers richer non-essential motion.

- [ ] Define optional spring/physics motion tokens.
- [ ] Define optional entrance/exit transitions.
- [ ] Define optional shared-element or continuity effects where platforms support them.
- [ ] Define capability/fallback rules for advanced motion.
- [ ] Keep reduced-motion support mandatory for all optional motion.

## Continuous engineering requirements

- [ ] Keep public APIs platform-neutral unless a renderer package explicitly owns the API.
- [ ] Keep platform adapters thin and replaceable.
- [ ] Keep incremental adoption a first-class path: styling/integration of existing hosts must not require immediate component replacement.
- [ ] Keep component behavior native where platform primitives are sufficient.
- [ ] Keep theme and palette data editable without changing renderer code.
- [ ] Keep palette/theme switching deterministic and testable.
- [ ] Keep all non-trivial effects behind capability checks or renderer support.
- [ ] Keep functional interaction feedback efficient and mandatory.
- [ ] Keep decorative motion optional.
- [ ] Maintain automated tests for compiler determinism and renderer parity.
- [ ] Maintain screenshots/reference captures for visual review.
- [ ] Benchmark startup, interaction latency, memory and rendering cost on representative targets.
- [ ] Maintain the compatibility/support matrix as dependencies evolve.
- [ ] Maintain license headers and dependency-license review.
