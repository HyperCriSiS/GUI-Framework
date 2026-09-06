# GUI Framework

A renderer-neutral GUI framework specification with generated Web and Foundation Compose adapters, six theme families, integration kits and cross-platform validation.

The framework currently includes:

- a canonical neutral specification and compiler,
- Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk theme families,
- native Web and Foundation Compose component adapters,
- browser-extension, Web-application, Desktop, Android and Python integration paths,
- shared cross-language host-context capability presets,
- stable public API and migration contracts,
- schema-backed authoring/accessibility/performance/governance documentation,
- and pre-release artifact hardening that exercises staged npm, Maven and Python packages without publishing them.

## Current status

The implementation and ecosystem-readiness roadmap through Phase 8 is complete. Phase 9 is validating the actual release artifact boundaries before any registry coordinates or publish-capable workflow are enabled.

Current Phase-9 coverage includes:

- machine-readable mapping for all 13 planned artifacts,
- clean install/import testing for six staged npm tarballs,
- isolated local Maven build/install/consumer testing for four JVM artifacts,
- wheel + sdist build/install/import testing for both planned Python artifacts.

Publication remains **locked** and requires explicit human approval plus deliberate registry namespace/coordinate binding. Successful CI or a Git tag is not publication authorization.

See `ROADMAP.md` for the active execution plan and `DISTRIBUTION.md` for the release/publication contract.
