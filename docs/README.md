# GUI Framework Documentation

This directory contains authoring and operational documentation for the framework. The repository contracts remain authoritative; these guides explain how to use and extend them without bypassing validation, accessibility, performance or release-policy boundaries.

## Authoring

- `THEME_AUTHORING.md` — theme families, palettes, inheritance, capabilities and validation.
- `COMPONENT_AUTHORING.md` — neutral component recipes, semantics, tokens, capabilities and renderer completion.
- `ADAPTER_AUTHORING.md` — renderer/host boundaries, compiled IR consumption and adapter completion gates.

## Quality

- `ACCESSIBILITY.md` — neutral accessibility rules, platform mappings and review checklist.
- `PERFORMANCE.md` — performance budgets, fallbacks, virtualization guidance and representative runtime checks.

## Project and release contracts

- `../PUBLIC_API.md` — stable public API boundary.
- `../MIGRATION_POLICY.md` — SemVer, compatibility and migration-record requirements.
- `../DISTRIBUTION.md` — locked publication strategy and local pre-release artifact staging, including npm, Maven and Python consumer smokes.
- `../COMPATIBILITY.md` — supported platform/runtime matrix.
- `../CONTRIBUTING.md` — contribution workflow and required gates.
- `../GOVERNANCE.md` — decision hierarchy, maintainership and release approval separation.

The documentation contract CI checks that these documents stay connected to the repository's schemas, scripts and policy files rather than drifting into standalone prose.

## Security

- [`SECURITY.md`](../SECURITY.md) — vulnerability reporting and pre-release security prerequisites.
