# Specification compiler

This package resolves the language-neutral specification into an inspectable intermediate representation (IR).

It does not define UI behavior and is not a renderer. The compiler currently:

- loads neutral primitive token sources;
- overlays one palette at a time;
- resolves DTCG-style token aliases;
- rejects missing, duplicate, circular or type-incompatible references;
- resolves component token bindings;
- emits provenance traces for every resolved binding;
- produces stable key ordering for inspectable output.

Theme recipe resolution is intentionally not implemented yet because the six themes have not been visually specified.
