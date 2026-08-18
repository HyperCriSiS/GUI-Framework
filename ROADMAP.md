# Roadmap

This document is the public implementation roadmap for the GUI Framework.

## Current status

The repository is in the foundation phase. The architectural direction is defined; implementation of the first platform-neutral contracts and reference renderer is next.

## Phase 0 — Foundation

- [x] Define cross-platform rendering strategy.
- [x] Define the initial theme set.
- [x] Separate semantic components from visual renderers.
- [x] Define SVG, Rive and Skia as optional visual/rendering layers rather than mandatory application runtimes.
- [x] Require capability-based fallbacks for advanced effects.
- [x] Keep animation outside the initial feature scope while preserving future extension points.
- [ ] Finalize the repository license and add the canonical `LICENSE` file.
- [ ] Define supported platform/version matrix.
- [ ] Define package/module naming conventions.
- [ ] Define compatibility and semantic-versioning policy.

## Phase 1 — Core model and web reference renderer

### Core

- [ ] Define platform-neutral design-token schema.
- [ ] Define semantic color, spacing, radius, typography, border and effect tokens.
- [ ] Define component-state model: default, hover, focus, pressed, selected, checked, disabled, loading and error where applicable.
- [ ] Define renderer capability model and quality tiers.
- [ ] Define theme inheritance and override rules.
- [ ] Define asset abstraction for SVG and future N-slice/Rive assets.
- [ ] Define accessibility metadata required by components.

### Initial components

- [ ] Button
- [ ] Input
- [ ] Switch
- [ ] Panel/Card
- [ ] Dialog

### Web renderer

- [ ] Implement HTML/CSS renderer.
- [ ] Implement SVG asset integration.
- [ ] Implement keyboard and focus behavior.
- [ ] Implement accessibility mappings.
- [ ] Implement capability detection and visual fallbacks.
- [ ] Add a real reference application using the framework components.

## Phase 2 — Initial theme system

Each theme must use the same semantic component API and may alter geometry, surface treatment, border language and supported visual effects without forking component behavior.

- [ ] Basic
- [ ] Modern
- [ ] Glass
- [ ] Frosted Glass
- [ ] Spacey
- [ ] Cyberpunk

For every theme:

- [ ] Define complete token set.
- [ ] Define state styling.
- [ ] Verify legibility and contrast.
- [ ] Verify dense-layout behavior.
- [ ] Verify fallback rendering.
- [ ] Verify all initial components.
- [ ] Measure rendering and interaction performance.

## Phase 3 — Android/Desktop renderer

- [ ] Implement Compose renderer adapter.
- [ ] Map the core component model to Compose semantics.
- [ ] Implement theme-token translation.
- [ ] Implement SVG/vector asset support.
- [ ] Implement capability model for target devices.
- [ ] Validate input, focus, accessibility and scaling behavior.
- [ ] Validate low-end device fallbacks.
- [ ] Build Android reference application.
- [ ] Build desktop reference application.

## Phase 4 — Extended component set

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

## Phase 5 — Advanced visual layers

- [ ] Define Rive adapter API.
- [ ] Add optional Rive asset renderer.
- [ ] Define N-slice/9-slice asset support where useful.
- [ ] Define Skia effect-provider API.
- [ ] Add optional Skia renderer/effect module.
- [ ] Add shader capability detection.
- [ ] Define deterministic fallbacks for every advanced effect.
- [ ] Ensure applications never need renderer-specific component APIs.

## Phase 6 — Complex application patterns

- [ ] Window/workspace layouts.
- [ ] Master-detail layouts.
- [ ] Settings interfaces.
- [ ] Inspector/property panels.
- [ ] Command surfaces.
- [ ] Large data views.
- [ ] Nested navigation.
- [ ] Responsive compact/dense modes.
- [ ] Browser-extension popup/sidebar/options patterns.

## Phase 7 — Animation extension

Animation remains optional and must not be required for correct operation.

- [ ] Define animation capability interface.
- [ ] Define reduced-motion behavior.
- [ ] Define transition tokens.
- [ ] Add optional Rive state-machine integration.
- [ ] Add renderer-native transition adapters where appropriate.
- [ ] Confirm that all components remain fully functional with animation disabled.

## Continuous requirements

- [ ] Preserve renderer independence of the public component API.
- [ ] Maintain accessibility across renderers.
- [ ] Maintain deterministic fallbacks.
- [ ] Benchmark startup, interaction latency, memory and rendering cost.
- [ ] Test common DPI/scaling configurations.
- [ ] Avoid visual regressions between themes and platforms.
- [ ] Keep framework dependencies modular and optional where possible.
