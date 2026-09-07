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

The implementation and ecosystem-readiness roadmap through Phase 9 is complete. Phase 9 proved the planned release artifact boundaries without binding registry coordinates or enabling publish-capable automation.

Completed Phase-9 coverage includes:

- machine-readable packaging roots for all 13 planned logical artifacts,
- clean install/import testing for six staged npm tarballs,
- isolated local Maven build/install/consumer testing for four JVM artifacts,
- wheel + sdist build/install/import testing for both planned Python artifacts,
- deterministic specification-source archive validation,
- a cross-ecosystem staging manifest and SHA-256 checksums for 15 physical files,
- and a manual read-only Release Candidate Dry Run that reproduced all 15 staged files byte-identically across two clean passes.

Publication remains **locked** and requires explicit human approval plus deliberate registry namespace/coordinate binding. Successful CI, a dry run or a Git tag is not publication authorization.

## Project contracts and documentation

- Documentation index: `docs/README.md`
- Stable API contract: `PUBLIC_API.md`
- Versioning and migration contract: `MIGRATION_POLICY.md`
- Distribution/publication contract: `DISTRIBUTION.md`
- Security policy and release prerequisites: `SECURITY.md`
- Active execution plan: `ROADMAP.md`
