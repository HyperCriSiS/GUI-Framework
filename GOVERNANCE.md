# Governance

GUI Framework is maintained through repository history, reviewable contracts, and explicit release decisions. The roadmap and machine-readable policy files are authoritative for completion/release gates; no individual document silently overrides them.

## Decision hierarchy

When guidance conflicts, use this order:

1. License and security requirements.
2. Stable public API and versioned migration policy.
3. Renderer-neutral specification schemas/contracts.
4. Roadmap completion gates and machine-readable quality/performance policies.
5. Adapter/integration contracts.
6. Documentation and examples.

A lower-level implementation convenience is not sufficient reason to violate a higher-level contract.

## Maintainer responsibilities

Maintainers are responsible for:

- preserving renderer neutrality and the public API boundary,
- requiring appropriate accessibility/performance/runtime evidence,
- classifying compatibility changes before release,
- keeping distribution explicit-approval-only,
- avoiding unnecessary permanent CI cost,
- recording architectural decisions in code/contracts/docs rather than relying on private institutional knowledge, and
- ensuring security-sensitive disclosure is handled responsibly.

## Changes and review

Normal changes land through pull requests with automated gates. A change that alters a public contract, distribution policy, migration rules, completion criteria, or licensing expectations requires explicit maintainer review and corresponding contract/document updates.

Breaking public changes require the version/deprecation/migration process in `MIGRATION_POLICY.md`. Release approval is separate from merge approval.

## Releases

The distribution plan in `DISTRIBUTION.md` uses one unified release train. Registry coordinates and publication remain locked until prerequisites are satisfied, and actual publication requires explicit approval. A green CI run alone never authorizes publishing.

## Roadmap completion

A roadmap item is marked complete only after every applicable completion gate is green. Documentation items are governed by the documentation contract CI as well as the normal repository baseline when their change affects code or machine-readable contracts.
