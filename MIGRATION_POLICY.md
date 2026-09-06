# Versioned Migration Policy

GUI Framework uses one unified SemVer release train across its published artifact families. This policy applies to the stable boundary in `api/public-api.json` even before a 1.0 release; a `0.x` version is not permission to make undocumented consumer-breaking changes.

Publication remains locked. Completing this policy removes a roadmap prerequisite, but it does not authorize a registry upload. Registry publication still requires the explicit release approval defined by `DISTRIBUTION.md`.

## Compatibility dimensions

Every public change is evaluated for **source**, **binary**, and **behavioral** compatibility. The required version bump is the highest severity found across those dimensions. Repository-internal implementation changes do not create SemVer obligations unless they alter a documented public entry point or observable contract.

## Version classes

### Patch

Patch releases do not change the public API snapshot. They may fix bugs, improve performance, or change internals/documentation while preserving documented consumer behavior.

### Minor

Minor releases may add public symbols, entry points, standalone components/capabilities, or optional parameters/properties with compatible defaults. Additions that can affect source exhaustiveness or generated-code consumers require an explicit migration note even when they remain binary compatible.

For generated Kotlin contracts, adding an enum value is treated as **minor with source impact**: binaries remain additive, but exhaustive `when` expressions may require an `else` or a new branch. Removing, renaming, or semantically repurposing an enum value is major.

### Major

Major releases are required for public removals/renames, package relocation, incompatible signatures/types, newly required inputs, incompatible artifact coordinates, documented behavioral breaks, and other changes that invalidate existing consumer assumptions.

## Deprecation before removal

A public symbol must normally be deprecated for at least one released minor version before removal and may be removed no earlier than the next major release. The deprecation must identify its replacement or migration path.

A compatibility-breaking security fix may bypass the normal window only through a recorded security compatibility waiver. The release notes must explain the incompatibility without disclosing exploit-enabling detail prematurely.

## Generated contracts and compatibility aliases

`gui.framework.generated.api` is public. Generated visual/token/registry machinery under `gui.framework.generated.internal` is not.

Compatibility aliases in the old generated contract namespace are transitional and are not themselves public API. Nevertheless, if repository-supported examples/integrations still depend on an alias, removing it requires a recorded migration so first-party consumers cannot silently regress.

## Migration records

Changes classified as major, minor-with-source-impact, or security compatibility waivers require a migration record in `migrations/` named `v<from>-to-v<to>.md`. Each record must contain:

1. `## Summary`
2. `## Affected public surface`
3. `## Compatibility impact`
4. `## Migration steps`
5. `## Validation`

Records must provide concrete before/after consumer guidance where applicable and identify the tests or reference applications that validate the migration.

## Release review

Before an explicitly approved release, reviewers compare the proposed stable surface with `api/public-api.json`, classify changes using `api/migration-policy.json`, verify required migration records, and confirm that artifact/version changes remain synchronized with `distribution/artifacts.json`.

No CI workflow may automatically publish registry artifacts merely because these policy gates are green.
