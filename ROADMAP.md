# GUI Framework Roadmap

## Objective

Build a reusable GUI framework that provides:

- one renderer-neutral semantic component contract,
- one structured theme system,
- a canonical six-theme baseline,
- one capability / fallback policy,
- one acceptance framework for accessibility, performance, and cross-platform parity,
- and native adapters for target UI stacks.

The framework is not intended to become a second rendering engine. Native renderers remain native. The shared layer defines intent, visual recipes, capability requirements, fallback behavior, and quality gates.

## Current baseline

The repository already contains:

- a neutral JSON specification,
- schema validation,
- specification compilation,
- palette-family modeling,
- theme inheritance,
- capability resolution,
- typed visual recipe resolution,
- accessibility requirements,
- performance-budget contracts,
- generated Web output,
- generated Kotlin output,
- generated Web assets,
- generated Kotlin assets,
- a browser-extension integration kit and reference,
- a Compose Desktop integration kit and reference,
- a Compose Android reference application,
- cross-platform reference parity checks,
- browser regressions,
- Android runtime instrumentation,
- Compose Desktop visual parity checks,
- and six-theme production sign-off.

## Canonical theme baseline

The six canonical themes are:

1. Basic
2. Modern
3. Glass
4. Frosted Glass
5. Spacey
6. Cyberpunk

Theme identities remain stable while palette families may vary independently.

## Delivery phases

### Phase 1 — Neutral foundation

- [x] Renderer-neutral component specification
- [x] Schema validation and compilation
- [x] Stable state / variant / accessibility vocabulary
- [x] Renderer-neutral boundary guardrails

### Phase 2 — Theme model

- [x] Palette-family model
- [x] Theme inheritance and override resolution
- [x] Capability-aware theme fallback
- [x] Typed visual recipe resolution

### Phase 3 — Accessibility and performance

- [x] Accessibility requirement model
- [x] Basic quality contract
- [x] Theme-specific performance budgets
- [x] Minimum-capability behavior

### Phase 4 — Six-theme visual language

- [x] Basic
- [x] Modern
- [x] Glass
- [x] Frosted Glass
- [x] Spacey
- [x] Cyberpunk
- [x] Final six-theme production sign-off

### Phase 5 — Web adapter

- [x] Token and asset generation
- [x] Native Basic controls
- [x] Capability fallback generation
- [x] Functional Web reference application
- [x] Standalone component references
- [x] TypeScript contracts
- [x] Chromium regression coverage

### Phase 6 — Compose adapter

- [x] Kotlin contracts, tokens, recipes, and assets
- [x] Native Basic controls
- [x] Semantics and interaction checks
- [x] Scaling and minimum-capability checks
- [x] Compose Desktop integration kit
- [x] Compose Desktop reference application
- [x] Compose Android reference application
- [x] Generated Kotlin / Compose compilation
- [x] Compose Desktop visual parity probe
- [x] Android runtime instrumentation

### Phase 7 — Integration kits

- [x] Browser-extension integration bundle
- [x] Browser-extension reference
- [x] Compose Desktop integration bundle
- [x] Android reference packaging
- [x] Cross-platform reference application parity

### Phase 8 — Component expansion

- [x] Select / ComboBox
- [x] Tabs
- [x] Navigation
- [x] Tree / hierarchy
- [x] Form layout
- [x] Scroll container
- [x] Table / Data Grid
- [x] Tooltip
- [x] Toast / notification
- [x] Progress / spinner
- [x] Slider
- [x] Menu / context menu
- [x] Panel
- [x] Dialog

### Phase 9 — Showcase and developer experience

- [x] Shared Compose Showcase content consumed by Desktop and Android
- [x] Six-theme runtime exercise
- [x] Component gallery covering the expanded component surface
- [x] Real-world screen examples
- [x] Theme comparison view
- [x] Stress Lab
- [x] Theme / palette / density / font-scale / viewport controls
- [x] Repository contract for Showcase structure and integration

### Phase 10 — Repository hardening

- [x] Immutable GitHub Actions references
- [x] Locked Node dependencies
- [x] Secret-scanning guardrails
- [x] Artifact packaging checks
- [x] Main-branch protection with required Core CI validation

Phase 10 is considered complete for the current repository architecture. Additional hardening remains continuous maintenance rather than a blocking phase.

### Phase 11 — Showcase product-quality hardening

- [x] Android safe-area handling so Showcase content is not clipped by status/navigation bars
- [x] Observable behavior for every visibly enabled Showcase action instead of silent no-op handlers
- [x] Locale-stress copy separated from the design-review experience; visible Showcase text stays intentional and coherent
- [x] Repository contract tests preventing regression of safe-area handling, active no-op actions, and unrelated locale fixture leakage
- [x] Design-first Showcase information architecture: theme landing/gallery optimized for quickly judging the six visual languages before component-level QA
- [x] Curated per-theme hero screens that make the visual differences immediately obvious without navigating the component catalog
- [x] Desktop and Android usability pass on representative small/large viewports after the design-first restructuring; validated by full Core CI #847 across Compose Desktop visual parity, Chromium, Android API 23 at 130% font scale, API 35, and Android reference/APK builds

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

## Architectural guardrails

The following remain hard constraints:

- shared semantic intent must remain renderer-neutral,
- native renderers own native widget behavior,
- themes must resolve through structured recipes rather than arbitrary runtime branching,
- fallback behavior must remain explicit and capability-driven,
- generated output must be reproducible,
- integration kits must stay small enough to adopt in real projects,
- and visual sophistication must not bypass accessibility or performance budgets.

## Adoption targets

The framework should remain applicable to:

- Android / Compose applications,
- Compose Desktop applications,
- Python desktop tooling through a dedicated adapter path,
- browser extensions through generated Web assets and contracts,
- and future native stacks without changing the neutral specification.

## Next-step policy

After the current roadmap phases are complete, expansion should be driven by real consuming projects rather than speculative framework surface. New primitives should be admitted only when at least one concrete project needs them and the behavior cannot be represented cleanly by existing components.