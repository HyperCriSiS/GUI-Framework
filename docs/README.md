# GUI Framework Documentation

This index points to the maintained authoring and operational guidance for the framework. The JSON schemas, manifests, policy files and generated contract tests remain normative where prose and machine-readable contracts differ.

## Authoring

- `authoring/THEMES.md` — theme-family authoring, inheritance, palettes, capabilities and quality gates.
- `authoring/COMPONENTS.md` — component recipes, semantics, states, token bindings, capabilities and cross-adapter requirements.
- `authoring/ADAPTERS.md` — adapter boundaries, public entrypoints, capability handling and guidance for adding another renderer.

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
