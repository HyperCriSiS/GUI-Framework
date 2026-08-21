# Roadmap

This document is the public implementation roadmap for the GUI Framework.

## Current status

The project is in the foundation phase. The framework defines a language-neutral design and component specification that is compiled or adapted to platform-native UI technologies rather than replacing platform UI stacks.

The complete initial reference-component set is now implemented for both Web and Compose: Button, Input, Switch, Panel/Card and Dialog. Their contracts, theme visuals and platform mappings originate from the same neutral specification. The Web reference adapter is complete for this initial set: native semantics/accessibility mappings, keyboard/focus behavior, functional interaction feedback, deterministic capability fallbacks, portable SVG assets, popup/sidebar/options host-context validation, Playwright interactions and read-only visual-regression baselines are covered. Compose now also covers native semantics/input/focus behavior, functional interaction state mappings, deterministic capability fallbacks and portable assets for the same initial set, with a stateful native Desktop reference application exercising all five components. The initial platform/toolchain support matrix, package naming rules and pre-1.0/1.0 compatibility policy are defined. Palette families/variants and semantic contrast policy are explicit and CI-gated without hard-coding a light/dark-only model. The next foundation milestone is building the Android reference application, validating scaling/device behavior and completing cross-platform application-level comparison.

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
- [x] Verify browser-extension popup, sidebar and options-page use cases. <!-- representative viewport, keyboard, overflow and dialog-fit/focus behavior covered in Playwright -->

### Initial reference components

- [x] Button
- [x] Input
- [x] Switch
- [x] Panel/Card
- [x] Dialog

- [x] Build a real Web reference application using these components.
- [x] Establish visual-regression and interaction baselines.

## Phase 4 — Compose adapter and architecture validation

The second adapter is an architecture test: it must prove that the specification is not Web-shaped.

- [x] Generate and compile Kotlin-facing contracts from the neutral specification.
- [x] Generate typed Kotlin representations of neutral primitive and semantic tokens.
- [x] Map current recipes/tokens to Compose Android/Desktop primitives. <!-- includes sRGB Color, DTCG px -> dp, duration -> Kotlin Duration and Basic Button/Input/Switch/Panel/Dialog visuals -->
- [x] Complete Compose semantics, input, focus and accessibility behavior. <!-- neutral roles and state mappings are explicitly source-gated against native Compose primitives for all five initial reference components -->
- [x] Implement vector/SVG integration appropriate to the target.
- [x] Complete functional micro-interactions using platform-efficient mechanisms. <!-- hover/focus/press/checked/loading/error/dismiss behavior uses native Foundation/Dialog state without a decorative animation layer -->
- [x] Implement capability/fallback mapping for target devices. <!-- fallback recipes are generated from neutral IR and selected through a theme-scoped available-capability set for all five current components -->
- [ ] Validate scaling and older/lower-end device behavior. <!-- dp/sp and minimum-capability contracts are CI-gated; runtime density/font-scale and older/lower-end device/emulator validation remains -->
- [ ] Build Android reference application.
- [x] Build desktop reference application. <!-- stateful native Window reference exercises all five current components and is compiled/source-gated in Core CI -->
- [ ] Complete Web/Compose behavior and visual-intent comparison. <!-- initial component-level comparison exists for Button/Input/Switch/Panel/Dialog; application-level comparison remains -->
- [ ] Rework the specification if the second adapter exposes platform-specific assumptions.

## Phase 5 — Theme and palette implementation

Themes:

- [ ] Basic <!-- all five initial reference components are implemented for Web and Compose; full theme verification remains -->
- [ ] Modern
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
- [ ] Prove the same palette can be reused across multiple themes where appropriate.
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

- [ ] Extend motion recipes for richer justified patterns.
- [ ] Evaluate optional Rive state-machine integration.
- [ ] Add renderer-native advanced transitions where appropriate.
- [ ] Keep decorative motion optional.
- [ ] Preserve full usability with reduced motion.

## Continuous requirements

- [ ] Keep the canonical specification language-neutral.
- [ ] Keep themes independent from color palettes.
- [ ] Preserve renderer-independent application-facing semantics.
- [ ] Prefer host-platform layout, text, focus, input and accessibility systems.
- [ ] Maintain deterministic fallback behavior.
- [ ] Validate theme/palette combinations.
- [ ] Benchmark startup, interaction latency, memory and rendering cost.
- [ ] Test common DPI/scaling configurations.
- [ ] Avoid visual regressions between themes, palettes and platforms.
- [ ] Keep optional visual dependencies modular.
- [ ] Do not expand into a general-purpose replacement for existing platform UI stacks.
