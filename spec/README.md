# Neutral Specification

This directory contains the language-neutral source of truth for the GUI Framework.

## Layers

- `tokens/` contains DTCG 2025.10-compatible non-color primitives such as spacing and motion.
- `palettes/` contains color sources and the semantic color roles required by components.
- `components/` contains language-neutral component contracts/recipes.
- `schemas/` contains JSON Schemas for GUI-Framework-specific documents.
- `manifest.json` declares the specification version and the currently registered sources.

The six initial theme identities are registered in the manifest but intentionally do not define their detailed visual language yet. Theme geometry/effects and palette color choices remain separate concerns.

## Theme versus palette

A theme describes visual language: geometry, surfaces, borders, effects, state treatment and related recipes.

A palette supplies semantic colors such as background, surface, text, accent, focus, success, warning and danger.

Components consume semantic roles rather than literal colors. This allows a theme to support multiple independent palettes without forking component recipes.

## DTCG scope

Token files follow the stable DTCG 2025.10 format. The DTCG specification currently does not publish an official JSON Schema, so `scripts/validate-dtcg.mjs` validates the subset of DTCG types and reference rules used by this project. GUI-specific documents use JSON Schema 2020-12.

The reference palette is development data used to prove palette indirection. It is not a final palette for any of the six themes.
