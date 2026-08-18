# Roadmap

This document is the public implementation roadmap for the GUI Framework.

## Current status

The project is in the foundation phase. After comparing the initial architecture with existing cross-platform UI toolkits, the project direction has been refined: the framework will not attempt to replace platform UI stacks. Instead, it will define a language-neutral design and component specification that can be compiled or adapted to existing platform-native UI technologies.

The existing TypeScript contracts on `feat/core-foundation` are treated as an early prototype and input to the specification work, not as the permanent cross-platform source of truth.

## Phase 0 — Foundation and scope

- [x] Define the initial cross-platform objective.
- [x] Separate semantic components from platform rendering.
- [x] Keep platform UI systems responsible for layout, text, focus, input and accessibility where practical.
- [x] Define SVG and Rive as optional visual technologies rather than mandatory application runtimes.
- [x] Defer direct Skia integration until a concrete renderer limitation justifies it.
- [x] Require deterministic fallbacks for optional visual capabilities.
- [x] Define functional micro-interactions as baseline behavior while keeping decorative motion optional.
- [x] Finalize the repository license as AGPL-3.0-or-later.
- [x] Fix the initial theme set to Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk.
- [x] Separate theme identity from color palette selection.
- [ ] Define supported platform/version matrix.
- [ ] Define public package/module naming conventions.
- [ ] Define compatibility and semantic-versioning policy.

## Phase 1 — Language-neutral specification

### Design tokens

- [ ] Adopt a DTCG-compatible token source format.
- [ ] Define primitive tokens for raw reusable values.
- [ ] Define semantic tokens for UI roles such as background, surface, text, accent, success, warning and danger.
- [ ] Define component-level tokens only where shared semantic tokens are insufficient.
- [ ] Define spacing, sizing, radius, typography, border, elevation, effect and motion tokens.
- [ ] Define token aliases/references without embedding platform-specific syntax.
- [ ] Add schema validation for token sources.

### Palette model

- [ ] Define a palette contract independent from theme geometry and effects.
- [ ] Require each palette to provide the semantic color roles needed by the component system.
- [ ] Allow every theme to be combined with multiple palettes.
- [ ] Allow themes to ship a recommended/default palette without making it mandatory.
- [ ] Define palette variants such as light/dark only where useful; do not hard-code a two-mode assumption into the core model.
- [ ] Define contrast/legibility validation requirements for theme/palette combinations.

### Component recipe specification

- [ ] Define a language-neutral component recipe format.
- [ ] Define component anatomy/parts.
- [ ] Define variants and sizes.
- [ ] Define states: default, hover, focus, pressed, selected, checked, disabled, loading, error and other component-specific states.
- [ ] Define functional transition/motion references between states.
- [ ] Define visual recipes for surfaces, borders, shadows, glow, blur, vectors and other effects.
- [ ] Define asset references for SVG and future N-slice/Rive assets.
- [ ] Define capability requirements and ordered fallback recipes.
- [ ] Define accessibility/semantic metadata that renderers must preserve.
- [ ] Define recipe inheritance/override resolution.
- [ ] Define a trace/debug model that can explain where a resolved token or recipe value came from.
- [ ] Version the specification independently from individual renderer packages.

## Phase 2 — Compiler and validation toolchain

- [ ] Select the implementation language for the specification compiler/tooling.
- [ ] Parse and validate design-token sources.
- [ ] Parse and validate component recipes.
- [ ] Resolve token aliases, theme overrides, palette mappings and state overrides deterministically.
- [ ] Resolve capability fallback chains deterministically.
- [ ] Generate inspectable intermediate representation for debugging and tests.
- [ ] Add diagnostics for missing semantic roles, invalid overrides and unresolved references.
- [ ] Add tests for deterministic output and specification compatibility.

## Phase 3 — Web reference adapter

The Web adapter should use native browser mechanisms rather than implementing a custom browser rendering runtime.

- [ ] Generate or consume Web-facing TypeScript contracts from the neutral specification.
- [ ] Implement HTML/CSS mapping.
- [ ] Implement CSS custom-property/token output.
- [ ] Implement SVG asset integration.
- [ ] Preserve native HTML semantics where possible.
- [ ] Implement keyboard/focus behavior using platform primitives.
- [ ] Implement accessibility mappings.
- [ ] Implement functional micro-interactions for hover, press, focus, toggle and open/close states.
- [ ] Implement reduced-motion handling.
- [ ] Implement capability detection and deterministic visual fallbacks.
- [ ] Verify browser-extension popup, sidebar and options-page use cases.

### Initial reference components

- [ ] Button
- [ ] Input
- [ ] Switch
- [ ] Panel/Card
- [ ] Dialog

- [ ] Build a real Web reference application using these components.
- [ ] Establish visual-regression and interaction baselines.

## Phase 4 — Compose adapter and architecture validation

The second adapter is an architecture test: it must prove that the specification is not Web-shaped.

- [ ] Generate or consume Kotlin-facing contracts from the neutral specification.
- [ ] Map recipes/tokens to Compose Android/Desktop primitives.
- [ ] Preserve Compose semantics, input, focus and accessibility behavior.
- [ ] Implement vector/SVG integration appropriate to the target.
- [ ] Implement functional micro-interactions using platform-efficient mechanisms.
- [ ] Implement capability/fallback mapping for target devices.
- [ ] Validate scaling and older/lower-end device behavior.
- [ ] Build Android reference application.
- [ ] Build desktop reference application.
- [ ] Compare Web and Compose behavior and visual intent.
- [ ] Rework the specification if the second adapter exposes Web-specific assumptions.

## Phase 5 — Theme and palette implementation

The initial theme names are fixed, but their detailed visual language remains intentionally unspecified until the neutral specification and two reference adapters are proven.

Themes:

- [ ] Basic
- [ ] Modern
- [ ] Glass
- [ ] Frosted Glass
- [ ] Spacey
- [ ] Cyberpunk

For every theme:

- [ ] Define geometry and surface language.
- [ ] Define border/elevation/effect recipes.
- [ ] Define component-state styling.
- [ ] Define functional motion characteristics through shared motion tokens.
- [ ] Define capability fallbacks.
- [ ] Verify all reference components.
- [ ] Verify dense and compact layouts.
- [ ] Verify performance.
- [ ] Verify multiple independent color palettes.
- [ ] Verify legibility/contrast for supported palette combinations.

Palette work:

- [ ] Define at least one reference palette for early implementation.
- [ ] Prove palette swapping without modifying component recipes.
- [ ] Prove the same palette can be reused across multiple themes where visually appropriate.
- [ ] Prove a theme can use multiple substantially different palettes without forking the theme.

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

These are real integration/reference applications, not separate mockup-only deliverables.

## Phase 8 — Optional advanced visual layers

- [ ] Define the minimal extension contract for advanced visual providers.
- [ ] Add optional Rive integration only where it provides concrete value.
- [ ] Add N-slice/9-slice support where useful.
- [ ] Evaluate direct Skia integration only against a demonstrated renderer limitation.
- [ ] Add shader/effect integration only when justified by a real theme requirement.
- [ ] Keep advanced dependencies removable and tree-shakeable/modular where practical.
- [ ] Ensure applications never need renderer-specific component APIs for normal usage.

## Phase 9 — Advanced optional motion

Baseline interaction feedback belongs to the core specification. This phase covers richer motion that is not necessary for basic usability.

- [ ] Extend motion recipes for richer patterns where justified.
- [ ] Evaluate optional Rive state-machine integration.
- [ ] Add renderer-native advanced transitions where appropriate.
- [ ] Keep decorative motion optional.
- [ ] Preserve full usability with reduced motion.

## Continuous requirements

- [ ] Keep the canonical specification language-neutral.
- [ ] Keep themes independent from color palettes.
- [ ] Preserve renderer independence of application-facing component semantics.
- [ ] Prefer host-platform layout, text, focus, input and accessibility systems.
- [ ] Maintain deterministic fallback behavior.
- [ ] Validate theme/palette combinations.
- [ ] Benchmark startup, interaction latency, memory and rendering cost.
- [ ] Test common DPI/scaling configurations.
- [ ] Avoid visual regressions between themes, palettes and platforms.
- [ ] Keep optional visual dependencies modular.
- [ ] Do not expand into a general-purpose replacement for Flutter, Qt, Uno, Avalonia, Compose or native Web UI stacks.
