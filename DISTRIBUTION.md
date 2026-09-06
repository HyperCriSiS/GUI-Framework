# Distribution Strategy

This repository uses a **unified release train** for the neutral specification, adapters and integration packages. Distribution is deliberately separated from implementation and from release approval.

## Publication state

Publication is currently **locked**.

The **Stable public API surface** and **Versioned migration policy** prerequisites are complete. The remaining lock is intentional: registry namespace ownership must be verified, concrete registry coordinates must be bound deliberately, and an explicit human release approval is required before any publish-capable automation can be enabled.

No merge to `main` publishes packages. Before explicit approval, CI **must never publish a registry artifact**; registry coordinates remain unbound. No workflow may infer publication approval from a tag, branch name or successful test run.

Authoritative artifact identities and lock state live in `distribution/artifacts.json`.

## Release train

- one SemVer version across all artifact families,
- version source: explicit Git tag `v<semver>`,
- no independent adapter/package version drift,
- no automatic publication merely because a tag exists,
- registry publication requires an explicit release-approval action after all release gates pass.

## Artifact families

The planned distribution surface is intentionally multi-ecosystem:

- GitHub release: neutral specification source archive,
- npm: Core, compiler, Web adapter and JavaScript integration packages,
- Maven Central: Compose adapter and Kotlin host-integration artifacts,
- PyPI: toolkit-neutral Python integration and shared host-context package.

The exact logical names and source roots are machine-readable in `distribution/artifacts.json`. Registry coordinates remain `null` until namespace ownership has been verified and an explicit release decision binds them.

## Local pre-release staging

Phase 9 validates the future distribution surface without registry access or publish credentials.

Current local staging gates:

- map all 13 planned artifacts to explicit package roots while the publication lock remains active,
- build the Core package to consumable ESM plus TypeScript declarations,
- create six private development npm tarballs and install/import them from a clean Node consumer,
- remove monorepo-only deep imports from the staged Web Application integration package,
- build four local-only Maven JARs under the temporary `gui.framework.local` group,
- embed the AGPL license in each staged JAR, install them into an isolated Maven repository, and compile a clean Kotlin consumer against that repository,
- build both planned Python artifacts as PEP-440 `0.0.0.dev0` wheel **and** sdist packages,
- embed AGPL license metadata/files in both Python package forms and install/import each form from fresh Python 3.11 virtual environments,
- build a deterministic specification-source archive containing `spec/` plus the repository license and prove the extracted tree compiles to the same neutral IR,
- emit `release-manifest.json` plus `SHA256SUMS` across all 13 logical artifacts / 15 physical staged files,
- prove byte-identical staging in two clean passes during the manually dispatched release-candidate dry run,
- never bind or contact npm, Maven Central, PyPI or a GitHub Release endpoint during these staging checks.

These checks prove artifact shape and consumer usability only. They do **not** authorize publication and do not weaken the explicit release-approval requirement.

Run the current local gates with:

```sh
npm run test:artifact-packaging
npm run check:npm-artifacts
npm run check:maven-artifacts
npm run check:python-artifacts
npm run check:spec-archive
npm run stage:release-manifest && npm run test:release-manifest
```

The full reproducibility proof is intentionally excluded from ordinary pull-request CI because it rebuilds the complete cross-ecosystem staging set twice. It is executed by `.github/workflows/release-candidate-dry-run.yml`, which is manual-only and has `contents: read` permission with no publication credentials or registry-write commands.

## Publication gate

Before any real package publication is enabled, all of the following remain mandatory:

1. Verify ownership/control of the intended npm scope, Maven group and PyPI project names.
2. Bind final registry coordinates in the machine-readable artifact plan through an explicit reviewed change.
3. Run the complete release-candidate dry-run and reproducibility gates.
4. Obtain explicit human release approval.
5. Only then may a separate publish-capable workflow be introduced or enabled.

Until those conditions are met, CI must remain read-only with respect to external registries.
