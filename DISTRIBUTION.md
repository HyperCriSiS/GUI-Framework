# Distribution Strategy

This repository uses a **unified release train** for the neutral specification, adapters and integration packages. Distribution is deliberately separated from implementation and from release approval.

## Publication state

Publication is currently **locked**.

The **Stable public API surface** and **Versioned migration policy** prerequisites are complete. The remaining lock is intentional: the pre-release **security readiness review** defined in `SECURITY.md` must pass, including protection of the default branch; registry namespace ownership must be verified, concrete registry coordinates must be bound deliberately, and an explicit human release approval is required before any publish-capable automation can be enabled.

No merge to `main` publishes packages. Before explicit approval, CI **must never publish a registry artifact**; registry coordinates remain unbound. No workflow may infer publication approval from a tag, branch name or successful test run.

Authoritative artifact identities and lock state live in `distribution/artifacts.json`.

## Release train

- one SemVer version across all artifact families,
- version source: explicit Git tag `v<semver>`,
- no independent adapter/package version drift,
- no automatic publication merely because a tag exists,
- registry publication requires an explicit release-approval action after all release gates pass.

## Release approval identity

An explicit human approval must identify one immutable release candidate rather than merely approving a version name or the repository in general. The approved candidate identity consists of:

- the intended SemVer version,
- the exact source commit SHA,
- the SHA-256 of the generated `release-manifest.json`, and
- the SHA-256 of the generated `SHA256SUMS` file.

Approval is **single-candidate**. Any source change, artifact rebuild that changes either recorded hash, version change, or other candidate mutation invalidates the approval and requires the complete release-candidate/security gates plus a fresh human approval. At publication time the release tag `v<semver>` must resolve to the approved source commit; moving or reusing a release tag must never substitute for approval.

Published version identities are immutable. A registry artifact must never be overwritten or republished under an already released version number. If a release must be withdrawn, use the registry's supported withdrawal/yank/deprecation mechanism where appropriate and publish a new SemVer version for corrected bits. Security incidents additionally follow `SECURITY.md`.

The machine-readable form of this rule lives in `distribution/artifacts.json` under `releaseApprovalPolicy`. Defining this policy does not create an approval record, bind a registry coordinate, create a tag, or authorize publication.

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

A second manual pre-release check is available through **Distribution Strategy CI**. Its `repository-readiness` job is read-only and validates the live GitHub repository state against `distribution/artifacts.json`: the active default-branch rule profile, Private Vulnerability Reporting, the maintained Advanced CodeQL workflow and its result for the candidate commit, plus open Code Scanning and Dependabot alerts. A passing readiness audit is evidence only; it does not bind registry coordinates, create a tag or release, grant credentials, or satisfy the separate explicit human release approval.

## Publication gate

Before any real package publication is enabled, all of the following remain mandatory:

1. Verify ownership/control of the intended npm scope, Maven group and PyPI project names.
2. Bind final registry coordinates in the machine-readable artifact plan through an explicit reviewed change.
3. Complete the security readiness review defined in `SECURITY.md`, including protection of the default branch, repository security controls, or an explicitly approved waiver where permitted.
4. Run the complete release-candidate dry-run and reproducibility gates.
5. Obtain explicit human release approval bound to the exact candidate identity defined above; verify the release tag resolves to that approved source commit.
6. Only then may a separate publish-capable workflow be introduced or enabled.

Until those conditions are met, CI must remain read-only with respect to external registries.
