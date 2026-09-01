# Specification compiler

This package resolves the language-neutral specification into an inspectable intermediate representation (IR).

It does not define UI behavior and is not a renderer. The compiler currently:

- loads neutral primitive token sources;
- overlays one palette at a time;
- resolves DTCG-style aliases, including references nested inside composite token values;
- rejects missing, duplicate, circular or type-incompatible references;
- prevents component recipes from binding directly to raw palette tokens;
- resolves component token bindings;
- exports fully resolved primitive and semantic tokens for platform adapters while keeping raw palette values internal;
- emits provenance traces for resolved tokens and bindings;
- produces stable key ordering for inspectable output.

Theme recipe resolution is intentionally not implemented yet because the six themes have not been visually specified.
