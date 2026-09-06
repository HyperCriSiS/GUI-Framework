# GUI Framework Roadmap

This roadmap is the active execution plan. Earlier exploratory phases have been consolidated into the completed foundation blocks below; established phase identifiers from Phase 6 onward are intentionally preserved for historical commit and discussion references.

## Phase 0 — Foundation

- [x] Repository architecture and licensing
- [x] Neutral specification format
- [x] Design-token structure
- [x] Component recipe format
- [x] Capability model and deterministic fallback rules
- [x] Asset manifests
- [x] Accessibility baseline
- [x] Performance budgets
- [x] Web renderer baseline
- [x] Foundation Compose renderer baseline
- [x] Reference application baseline

## Phase 1 — Architecture hardening

- [x] Canonical component contracts
- [x] Palette-family model
- [x] Theme inheritance model
- [x] Runtime capability-selection rules
- [x] Generated Web contracts
- [x] Generated Compose contracts
- [x] Schema and compiler validation coverage

## Phase 2 — Basic theme foundation

- [x] Basic token set
- [x] Basic palette set
- [x] Basic component visual rules
- [x] Basic accessibility contract
- [x] Basic performance contract
- [x] Basic Web reference coverage
- [x] Basic Compose reference coverage

## Phase 3 — Renderer completeness

- [x] Web adapter native component coverage
- [x] Foundation Compose native component coverage
- [x] Generated asset integration
- [x] Generated visual-recipe integration
- [x] Cross-renderer reference parity
- [x] Representative browser runtime validation
- [x] Representative Android runtime validation

## Phase 4 — Theme family foundations

- [x] Modern
- [x] Glass
- [x] Frosted Glass
- [x] Spacey
- [x] Cyberpunk
- [x] Palette independence across theme families
- [x] Capability-aware theme fallback behavior
- [x] Theme-specific performance budgets
- [x] Theme-specific accessibility validation

## Phase 6 — Component and robustness expansion

- [x] Button
- [x] Input
- [x] Switch
- [x] Checkbox
- [x] Radio
- [x] Select / ComboBox
- [x] Tabs
- [x] Panel
- [x] Dialog
- [x] Tooltip
- [x] Menu / Context Menu
- [x] Toast / Notification
- [x] Progress / Spinner
- [x] Slider
- [x] Navigation primitives
- [x] Table / Data Grid primitives
- [x] Tree / Hierarchy primitives
- [x] Form layout primitives
- [x] Scroll container primitives
- [x] Cross-component text/locale robustness
- [x] IME/composition robustness for editable controls across Web and Compose

## Phase 7 — Integration kits

- [x] Browser extension integration kit
- [x] Desktop application integration kit
- [x] Android application integration kit
- [x] Python application integration path
- [x] Web application integration kit
- [x] Shared host-context presets

## Phase 8 — Distribution and ecosystem readiness

- [x] Package publication strategy
- [x] Stable public API surface
- [x] Versioned migration policy
- [x] Theme authoring documentation
- [x] Adapter authoring documentation
- [x] Component authoring documentation
- [x] Accessibility documentation
- [x] Performance documentation
- [x] Contribution and governance documentation

## Phase 9 — Pre-release artifact hardening

- [x] Machine-readable artifact packaging contract <!-- all 13 distribution artifacts map 1:1 to explicit package roots and ecosystem staging strategies while registry coordinates remain unbound and publication remains locked -->
- [x] npm staged-package build / pack / install smoke <!-- Core emits consumable ESM + declarations, six private development tarballs include AGPL metadata/license, Web Application staging removes monorepo-deep imports, and a clean Node consumer imports all public package entry points -->
- [x] Maven local artifact build / consumer smoke <!-- four isolated local-only JAR coordinates, generated Compose release inputs, AGPL license embedded in every JAR, isolated Maven repository installation, and a clean Kotlin consumer compile across Compose/Desktop/Android/host-context artifacts -->
- [x] Python sdist / wheel build / install smoke <!-- two PEP-440 development artifacts build as wheel+sdist, embed AGPL license metadata, and install/import successfully from clean Python 3.11 virtual environments without binding PyPI registry coordinates -->
- [x] Specification-source release archive smoke <!-- deterministic AGPL-bearing spec tarball extracts outside the repository and recompiles to IR identical to the source tree -->
- [x] Cross-ecosystem staging manifest and checksums <!-- all 13 logical artifacts / 15 physical staged files are enumerated with size and SHA-256 while registry coordinates remain unbound -->
- [ ] Reproducible staging validation
- [ ] Manual release-candidate dry-run workflow with no publication credentials or registry writes

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
