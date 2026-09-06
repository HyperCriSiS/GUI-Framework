# Distribution and publication strategy

This document defines how GUI Framework will become consumable outside the repository without turning ordinary development commits into releases.

## Release principle

The framework uses a **unified release train**. The neutral specification, compiler, generated adapter outputs, integration kits, and cross-language host-context bindings share one framework version. A release tag therefore represents one tested compatibility set rather than a collection of independently drifting package versions.

Until the public API and migration policy are explicitly stabilized, publication stays locked. Existing development package manifests remain private/internal and registry coordinates remain unbound.

## Publication unlock gates

Registry publication must not be enabled until both roadmap gates are complete:

1. Stable public API surface.
2. Versioned migration policy.

Completing only one of these is insufficient. The first registry-enabled release also requires registry namespace ownership to be verified before coordinates are committed.

## Artifact families

The canonical machine-readable list is `distribution/artifacts.json`.

- **GitHub Release:** canonical specification sources/schemas and release metadata.
- **npm:** core contracts, specification compiler, Web adapter, Browser Extension integration, Web Application integration, and JavaScript host-context binding.
- **Maven Central:** Compose adapter, Desktop integration, Android integration, and Kotlin host-context binding.
- **PyPI:** toolkit-neutral Python integration and Python host-context binding.

The current `@gui-framework/*` names are logical monorepo identifiers, not proof that a public npm scope has been reserved. Public registry coordinates are intentionally `null` in the distribution manifest until ownership is verified.

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

Before the public API/migration policy is complete, repository versions stay development-only. The first externally consumable release follows Semantic Versioning and the migration policy defined by the later Phase 8 gate.

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

Those decisions require verified namespace ownership and are made when the public API and migration gates are complete. This keeps the current architecture portable and prevents namespace availability from leaking into framework APIs.
