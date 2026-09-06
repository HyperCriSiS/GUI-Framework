# Distribution and publication strategy

This document defines how GUI Framework will become consumable outside the repository without turning ordinary development commits into releases.

## Release principle

The framework uses a **unified release train**. The neutral specification, compiler, generated adapter outputs, integration kits, and cross-language host-context bindings share one framework version. A release tag therefore represents one tested compatibility set rather than a collection of independently drifting package versions.

The stable public API and versioned migration policy are now defined. Publication nevertheless stays locked: existing development package manifests remain private/internal, registry coordinates remain unbound, registry namespace ownership must be verified, and an explicit human release approval is still required.

## Publication unlock gates

The two roadmap prerequisites are complete:

1. Stable public API surface.
2. Versioned migration policy.

They are necessary but not sufficient to publish. The lock remains in force until registry namespace ownership is verified, coordinates are deliberately committed, and an explicit human release approval authorizes a concrete release. CI success by itself cannot satisfy that approval.

## Artifact families

The canonical machine-readable list is `distribution/artifacts.json`. The local pre-release packaging map is `distribution/packaging.json`; it binds every promised artifact to an explicit source/package root and ecosystem staging strategy without assigning a public registry coordinate.

- **GitHub Release:** canonical specification sources/schemas and release metadata.
- **npm:** core contracts, specification compiler, Web adapter, Browser Extension integration, Web Application integration, and JavaScript host-context binding.
- **Maven Central:** Compose adapter, Desktop integration, Android integration, and Kotlin host-context binding.
- **PyPI:** toolkit-neutral Python integration and Python host-context binding.

The current `@gui-framework/*` names are logical monorepo identifiers, not proof that a public npm scope has been reserved. Public registry coordinates are intentionally `null` in the distribution manifest until ownership is verified.

## Pre-release artifact hardening

Before registry coordinates are bound, Phase 9 builds ecosystem-native **local development artifacts** under `build/release-staging/`. These artifacts use the unified development version, carry license metadata, and are consumed from local tarballs/JARs/wheels rather than from a registry.

This dry-run layer has two purposes: prove that package boundaries are genuinely self-contained, and catch release-only defects such as monorepo-deep imports, source-only entry points, missing generated output, incomplete package metadata, or cross-artifact dependency mistakes. Passing these gates does not authorize publication and does not change the publication lock.

For npm, the staging gate compiles `@gui-framework/core` to ESM plus declarations, stages all six npm artifact families as private development packages, packs them to local tarballs, installs those tarballs into a clean consumer, and imports every canonical package entry point. Maven, PyPI, specification archive, checksum, reproducibility, and release-candidate dry-run gates are tracked separately in `ROADMAP.md`.

## What gets published

Published packages must contain deterministic build products and the minimum source/license metadata needed to consume and audit them. Consumers must not be required to run the framework compiler during package installation.

Generated Web/Kotlin assets and contracts are produced before packaging, validated, and then packaged from the same tagged commit. No registry package may silently regenerate from a different specification revision.

## Release flow

A future release workflow must use this order:

1. Explicit human release approval.
2. Checkout an exact signed/reviewed tag candidate.
3. Run the full applicable framework completion gates.
4. Build every artifact from that exact commit.
5. Verify package contents, versions, licenses, checksums, and cross-artifact compatibility.
6. Create the GitHub Release and immutable provenance/checksum metadata.
7. Publish the approved registry artifacts from the already validated build outputs.
8. Verify registry availability and coordinates.

A merge to `main`, a pull request, or a normal CI run must never publish a registry artifact.

## Versioning

Repository versions remain development-only while publication is locked. The stable consumer boundary is defined by `PUBLIC_API.md`, and every externally consumable release must follow the Semantic Versioning and migration rules in `MIGRATION_POLICY.md`.

All public artifacts from one release carry the same framework version. If an ecosystem needs packaging-only metadata, it may append ecosystem-compatible build metadata but must not imply a different framework compatibility version.

## Licensing

Every public artifact must declare `AGPL-3.0-or-later` and include or link to the repository license in the form required by its ecosystem. Generated output does not receive a weaker license merely because it was emitted by the compiler.

## Supply-chain policy

Release automation must be least-privilege and release-only. Registry credentials or trusted publishing identities must not be available to ordinary CI jobs. Prefer short-lived trusted publishing/OIDC where the registry supports it. Release artifacts should carry checksums and platform-supported provenance/attestations.

## Deliberately deferred decisions

The following are not guessed in advance:

- the final public npm scope/name,
- the final Maven group ID,
- the final PyPI project names,
- exact signing/trusted-publishing setup.

The API/migration prerequisites are complete, but these decisions are still deferred until explicit release preparation verifies namespace ownership. This keeps the current architecture portable, prevents namespace availability from leaking into framework APIs, and avoids treating roadmap completion as release authorization.
