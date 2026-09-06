# Contributing to GUI Framework

GUI Framework is licensed under AGPL-3.0-or-later. By contributing, you agree that your contribution may be distributed under the repository license and that you have the right to submit it.

## Before changing code

1. Read `ROADMAP.md` and the relevant spec/adapter documentation.
2. Keep the renderer-neutral specification separate from renderer implementation details.
3. Check `PUBLIC_API.md` and `MIGRATION_POLICY.md` before changing a public contract.
4. Do not unlock or automate registry publication. Distribution remains explicit-approval-only.

## Change workflow

- Use a focused branch and pull request.
- Keep commits scoped and explain architectural trade-offs for nontrivial changes.
- Add or update the smallest permanent fast gate that detects the regression/class of change.
- Trigger expensive browser/emulator runtime gates only when the behavior under change needs them or when a completion gate requires them.
- Do not weaken validation, accessibility, performance, packaging, or compatibility contracts merely to make CI green.

## Required validation

`npm run check` is the aggregate source/runtime baseline. Apply additional completion gates from `ROADMAP.md` as relevant: schema validation, compiler tests, adapter contracts, accessibility, performance budgets, reference coverage, representative runtime validation, generated-output compilation/typechecking, and cross-platform parity.

Changes to public API or migration policy must also pass their dedicated path-filtered workflows. Interactive Web/Android changes may require Chromium and/or emulator gates. Changes to distribution/package boundaries must pass the artifact packaging contract and the relevant ecosystem-local pack/consumer smoke; these gates never authorize publication.

## Authoring references

- `docs/authoring/THEMES.md`
- `docs/authoring/COMPONENTS.md`
- `docs/authoring/ADAPTERS.md`
- `docs/guides/ACCESSIBILITY.md`
- `docs/guides/PERFORMANCE.md`

## Security-sensitive changes

Do not publish exploit-enabling detail before an appropriate fix/release path exists. Compatibility-breaking security fixes must follow the security-waiver path in `MIGRATION_POLICY.md`.
