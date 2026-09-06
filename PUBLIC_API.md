# Public API Surface

This document defines the stable consumer boundary of GUI Framework. It does **not** unlock publication. Registry publication remains locked by `distribution/artifacts.json` until the versioned migration policy is complete and an explicit release approval is given.

## Boundary rule

Only the package/module entry points listed in `api/public-api.json` are public. Repository-relative deep imports are implementation details unless a listed entry point explicitly re-exports the symbol. This allows internal files and generators to evolve without creating accidental SemVer obligations.

## JavaScript / TypeScript

- `@gui-framework/core` exposes only the explicit re-exports in `packages/core/src/index.ts`.
- `@gui-framework/spec-compiler` exposes the side-effect-free in-memory/file compiler API. The CLI is a bin surface, not an import surface. Direct execution of the historical `src/index.mjs` path remains compatible during the transition.
- `@gui-framework/web-adapter` exposes runtime component factories and capability helpers through one explicit entry point. Build/generator modules are not public.
- Browser-extension, Web-application, and host-context integration packages expose only their root entry points.

## Kotlin / Compose

`gui.framework.compose` and `gui.framework.generated.api` form the Compose consumer API. Spec-derived contract enums/data/contracts are generated into `gui.framework.generated.api`. Rendering recipes, visual registries, token mappings and related generated machinery remain in `gui.framework.generated.internal` and are not API. The contract generator also emits compatibility-only `typealias` bridges in the former internal contract namespace so current source consumers are not broken by the namespace stabilization; those aliases are transitional compatibility shims, not a public entry point.

Desktop and Android host contracts are public under `gui.framework.integration.desktop` and `gui.framework.integration.android`. Shared host-context Kotlin presets are public under `gui.framework.integration.hostcontext`.

## Python

The Python integration public surface is exactly `gui_framework_integration.__all__`. Shared host-context Python helpers are limited to the symbols recorded in `api/public-api.json`. Toolkit-specific adapters are not implied by this contract.

## Change discipline

A compatible release may add public symbols without removing existing ones. Removal, rename, signature/semantic incompatibility, package relocation, enum-value removal, or generated-contract relocation is a breaking change and must follow the versioned migration policy before publication.
