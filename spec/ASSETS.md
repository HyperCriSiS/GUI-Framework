# Portable assets

Portable assets are declared in `spec/manifest.json` and referenced by renderer-neutral component contracts. Platform adapters consume the same source asset; platform-specific asset objects never enter the neutral specification.

## Asset identity

Every asset has a stable lowercase ID, a kind and a repository-relative source. The initial kinds are `svg`, `n-slice` and `rive`. Only SVG is implemented today; the other kinds reserve the common reference model so future support does not require changing component semantics.

Asset source paths must stay inside `spec/`. Optional asset fallbacks use another stable asset ID and must remain deterministic.

## Portable SVG profile

The initial cross-platform SVG profile is intentionally small and deterministic:

- SVG is the canonical source format.
- A `viewBox` and intrinsic size are mandatory; the initial path profile requires a `0 0` viewBox origin.
- Intrinsic SVG logical units map to CSS px on Web and dp in Compose.
- The initial `path` profile permits only an `<svg>` root and `<path>` elements.
- Transforms, scripts, event handlers, external references and embedded remote/data resources are rejected.
- Supported path paints are `none`, `currentColor`, `#RRGGBB` and `#RRGGBBAA`.
- Supported path styling is limited to fill, stroke, stroke width, line cap and line join.

This profile maps directly to browser SVG and Compose `ImageVector` path data. Richer SVG features may be added only when both reference adapters can preserve their visual intent or a deterministic fallback is defined.

## Component graphic slots

A graphic content slot may define an `assetReference` contract with:

- accepted asset kinds;
- fit behavior (`contain`, `cover`, `stretch`, `none`);
- deterministic missing-asset behavior (`omit`, `reserve-space`, `error`).

The component contract describes what the slot accepts; the application supplies the concrete asset ID at runtime. This avoids hard-wiring a development icon into a component recipe.

## Adapter mapping

The Web adapter emits both a static SVG file and validated inline markup. Inline rendering preserves `currentColor`, so theme/palette color remains a renderer concern.

The Compose adapter converts the portable path profile at build time into native `ImageVector` data using Compose path nodes. No SVG parsing dependency is required at application runtime.
