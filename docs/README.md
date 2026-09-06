# GUI Framework Documentation

This directory documents the supported authoring and integration contracts of GUI Framework. The repository schemas, `PUBLIC_API.md`, `MIGRATION_POLICY.md`, `ARCHITECTURE.md`, and machine-readable policy files remain authoritative when prose and contracts disagree.

## Authoring

- `docs/authoring/THEMES.md` — create or extend a visual theme without coupling it to a palette or renderer.
- `docs/authoring/COMPONENTS.md` — add a semantic component recipe and carry it through adapters and validation.
- `docs/authoring/ADAPTERS.md` — implement a new target adapter from compiled neutral IR while preserving host-platform semantics.

## Quality

- `docs/guides/ACCESSIBILITY.md` — semantics, keyboard/focus, target size, contrast and reduced-motion obligations.
- `docs/guides/PERFORMANCE.md` — budgets, capability fallbacks and representative runtime evidence.

## Compatibility and project process

- `COMPATIBILITY.md` — current support matrix, runtime floors and artifact-role compatibility.
- `CONTRIBUTING.md` — contribution workflow and required gates.
- `GOVERNANCE.md` — decision hierarchy, compatibility ownership and release authority.

Documentation is gated by `.github/workflows/documentation-contract-ci.yml`. The contract verifies required references, schema coverage and that documented `npm run ...` commands actually exist.
