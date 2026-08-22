# Roadmap

This document is the public implementation roadmap for the GUI Framework.

## Current status

The project is in the foundation phase. The framework defines a language-neutral design and component specification that is compiled or adapted to platform-native UI technologies rather than replacing platform UI stacks.

The complete initial reference-component set is now implemented for both Web and Compose: Button, Input, Switch, Panel/Card and Dialog. Their contracts, theme visuals and platform mappings originate from the same neutral specification. The Web reference adapter is complete for this initial set: native semantics/accessibility mappings, keyboard/focus behavior, functional interaction feedback, deterministic capability fallbacks, portable SVG assets, popup/sidebar/options host-context validation, Playwright interactions and read-only visual-regression baselines are covered. Compose covers the same initial set with native semantics/input/focus behavior, functional interaction state mappings, deterministic capability fallbacks and portable assets. Stateful native Desktop and Android reference applications exercise the components, and the Android application is assembled as a real APK in Core CI. A shared neutral reference scenario gates the common Basic/reference-dark component set and interaction flows across Web, Compose Desktop and Compose Android while allowing platform-specific integration extensions. Renderer-neutral JSON contracts are additionally protected by a CI boundary test against Web-, Android- and Compose-specific vocabulary; the second-adapter architecture audit exposed no specification assumption requiring rework. Runtime validation now also exercises the Android reference application on API 23 with reduced memory and 1.30 font scale plus API 35 at high density. Phase 4 is complete. Phase 5 has completed the Basic theme contract: the full reference-component set, declared sizes/states, shared functional interaction motion, reduced-motion behavior, minimum-capability low-cost guards, dense/compact validation and a deterministic performance budget are CI-gated. Modern implementation now builds on Basic with palette-neutral rounded geometry and neutral DTCG drop-shadow elevation for Panel/Card and Dialog. The shadow model is mapped consistently to Web CSS and Compose, including alpha-preserving generated tokens. The same reference-dark/reference-light palettes are CI-proven across Basic and Modern without theme forks. Web now exercises Modern through the same functional reference application and 320 px compact-layout path as Basic; Compose Desktop and Android expose equivalent Modern selection paths, with Android runtime instrumentation added for device validation. Modern also has a deterministic CI-enforced structural performance budget. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model.

## Phase 0 — Foundation and scope

- [x] Define the initial cross-platform objective.
- [x] Separate semantic components from platform rendering.
- [x] Keep platform UI systems responsible for layout, text, focus, input and accessibility where practical.
- [x] Define SVG and Rive as optional visual technologies rather than mandatory runtimes.
- [x] Defer direct Skia integration until a concrete renderer limitation justifies it.
- [x] Require deterministic fallbacks for optional visual capabilities.
- [x] Define functional micro-interactions as baseline behavior while keeping decorative motion optional.
- [x] Finalize the repository license as AGPL-3.0-or-later.
- [x] Fix the initial theme set to Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk.
- [x] Separate theme identity from color palette selection.
- [x] Define supported platform/version matrix.
- [x] Define public package/module naming conventions.
- [x] Define compatibility and semantic-versioning policy.

## Phase 1 — Language-neutral specification

### Design tokens

- [x] Adopt a DTCG-compatible token source format.
- [x] Define primitive tokens for raw reusable values.
- [x] Define semantic tokens for UI roles.
- [x] Define component-level tokens only where shared semantic tokens are insufficient.
- [x] Complete spacing, sizing, radius, typography, border, elevation, effect and motion token categories.
- [x] Define token aliases/references without platform-specific syntax.
- [x] Add automated validation for the DTCG subset used by the project.

### Palette model

- [x] Define a palette contract independent from theme geometry and effects.
- [x] Require palettes to provide semantic color roles needed by components.
- [x] Allow every theme to be combined with multiple palettes.
- [x] Allow themes to recommend a palette without making it mandatory.
- [x] Define palette variants without hard-coding a light/dark-only model.
- [x] Complete contrast/legibility validation requirements for theme/palette combinations.

### Component recipe specification

- [x] Define the neutral component recipe contract and schema.
- [x] Define component anatomy/parts and content slots.
- [x] Define neutral runtime properties and state mappings.
- [x] Define neutral events and payload contracts.
- [x] Define variants, sizes and shared state vocabulary.
- [x] Define functional transition/motion token references.
- [x] Define neutral visual recipes for surfaces, borders and optional effects.
- [x] Define asset references for SVG and future N-slice/Rive assets.
- [x] Define capability requirements and ordered quality fallback levels.
- [x] Define accessibility/semantic metadata renderers must preserve.
- [x] Define deterministic recipe inheritance/override resolution.
- [x] Define provenance for resolved token bindings.
- [x] Version the neutral specification independently from renderer packages.

## Phase 2 — Compiler and validation toolchain

- [x] Use Node.js ESM JavaScript for initial compiler/tooling while keeping the specification language-neutral.
- [x] Parse and validate DTCG token sources.
- [x] Parse and validate component recipes.
- [x] Resolve token aliases and palette mappings deterministically.
- [x] Resolve theme inheritance plus variant/size/state overrides deterministically.
- [x] Resolve capability fallback chains deterministically.
- [x] Generate inspectable IR with resolved values and provenance.
- [x] Diagnose missing roles, duplicate paths, circular references, type mismatches and unresolved references.
- [x] Validate cross-field runtime contracts.
- [x] Diagnose invalid theme/component/variant/size/state references and inheritance cycles.
- [x] Test deterministic output, provenance and specification-registry compatibility.

## Phase 3 — Web reference adapter

The Web adapter uses native browser mechanisms rather than a custom rendering runtime.

- [x] Generate Web-facing TypeScript contracts from the neutral specification.
- [x] Implement native HTML/CSS mapping.
- [x] Implement CSS custom-property/token output.
- [x] Implement SVG asset integration.
- [x] Preserve native HTML semantics where possible. <!-- verified across Button, Input, Switch, Panel/Card and Dialog -->
- [x] Implement keyboard/focus behavior with platform primitives for current interactive controls.
- [x] Complete accessibility mappings for the initial reference-component set. <!-- native labels/roles/state semantics are mapped and exercised by component/reference-app tests -->
- [x] Complete functional micro-interactions for the initial reference-component set. <!-- native control feedback plus controlled Dialog open/dismiss/focus restoration are implemented -->
- [x] Implement reduced-motion handling for generated interactive-control CSS.
- [x] Implement capability detection and deterministic visual fallbacks.
- [x] Implement initial reference components: Button, Input, Switch, Panel/Card and Dialog.
- [x] Build a real functional reference application using the Web adapter.
- [x] Add browser-driven interaction and visual-regression tests.
- [x] Validate popup/sidebar/options host contexts for browser-extension use. <!-- Playwright validates constrained extension-style widths, overflow, keyboard focus and dialog fit -->
- [x] Verify the initial adapter remains portable beyond browser-extension hosts. <!-- page reference stays the canonical baseline while host-context CSS is additive -->

## Phase 4 — Compose reference adapter

Compose is the second architecture-validation adapter and covers Android plus Desktop.

- [x] Generate Kotlin-facing contracts from the neutral specification.
- [x] Generate Kotlin token bindings from resolved neutral values.
- [x] Generate Compose-facing visual recipes from the same neutral theme data.
- [x] Generate portable SVG asset metadata and resource paths for Compose.
- [x] Implement native Compose mappings without introducing framework-specific layout primitives.
- [x] Implement initial reference components: Button, Input, Switch, Panel/Card and Dialog.
- [x] Preserve native semantics/input/focus behavior for the initial interactive controls.
- [x] Complete functional micro-interactions using platform-efficient mechanisms. <!-- hover/focus/press/checked/loading/error/dismiss behavior uses native Foundation/Dialog state without a decorative animation layer -->
- [x] Implement capability/fallback mapping for target devices. <!-- fallback recipes are generated from neutral IR and selected through a theme-scoped available-capability set for all five current components -->
- [x] Validate scaling and older/lower-end device behavior. <!-- dp/sp and minimum-capability contracts are CI-gated; runtime instrumentation passes on API 23 with 1536 MB RAM / 1.30 font scale / 240 dpi and API 35 with 2048 MB RAM / 480 dpi -->
- [x] Build Android reference application. <!-- native Activity reference uses the shared Compose adapter/generated artifacts and a real assembleDebug APK build is gated in Core CI -->
- [x] Build desktop reference application. <!-- stateful native Window reference exercises all five current components and is compiled/source-gated in Core CI -->
- [x] Complete Web/Compose behavior and visual-intent comparison. <!-- shared neutral reference scenario gates Basic/reference-dark, all five components and the common edit/toggle/dialog interaction flows across Web, Compose Desktop and Compose Android; platform-specific extensions remain independent -->
- [x] Rework the specification if the second adapter exposes platform-specific assumptions. <!-- architecture audit completed: no current rework is required; canonical JSON contracts are CI-gated against renderer-specific vocabulary to prevent regressions -->

## Phase 5 — Theme and palette implementation

Themes:

- [x] Basic <!-- all five reference components, declared sizes/states, shared functional interaction motion, reduced-motion handling, palette/contrast coverage, minimum-capability low-cost guards, dense/compact validation and deterministic performance budget are CI-gated -->
- [ ] Modern <!-- inherited rounded geometry and neutral drop-shadow elevation are mapped in Web/Compose; shared palettes, Web reference/compact validation and deterministic performance budget are CI-gated; Compose Modern selection and Android instrumentation are implemented; dedicated visual baseline, device-runtime confirmation and final contrast/quality closure remain -->
- [ ] Glass
- [ ] Frosted Glass
- [ ] Spacey
- [ ] Cyberpunk

For every theme:

- [ ] Define geometry and surface language.
- [ ] Define border/elevation/effect recipes.
- [ ] Define component-state styling.
- [ ] Define functional motion characteristics through shared tokens.
- [ ] Define capability fallbacks.
- [ ] Verify all reference components.
- [ ] Verify dense and compact layouts.
- [ ] Verify performance.
- [x] Verify multiple independent development palettes against the same component contract.
- [ ] Verify legibility/contrast for supported palette combinations.

Palette work:

- [x] Define non-final reference palettes for early implementation.
- [x] Prove palette swapping without modifying component recipes.
- [x] Prove the same palette can be reused across multiple themes where appropriate. <!-- reference-dark and reference-light compile against both Basic and Modern without palette-specific theme forks -->
- [x] Prove a theme can use multiple substantially different palettes without forking the theme.

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
