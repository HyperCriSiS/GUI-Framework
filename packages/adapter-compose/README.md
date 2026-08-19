# Compose adapter

This package is the second platform adapter and an architecture-validation target.

The adapter consumes compiled IR only. It generates plain Kotlin contracts, typed token values and typed visual recipes from the language-neutral specification. This verifies that component identity, anatomy, content slots, runtime properties, events, variants, sizes, states, semantics, capabilities and design values can cross the language boundary without making Web or Compose the canonical model.

Palette-dependent resolved values remain separate from palette-independent component contracts. The same component contract must therefore remain valid for every compatible palette.

## Current scope

- generate Kotlin theme and component identifiers from the neutral registry;
- generate strongly typed variant, size and state enums;
- generate runtime property data classes with neutral defaults;
- generate content/event metadata and semantic/capability metadata;
- generate typed Kotlin representations of primitive and semantic design tokens;
- generate typed component visual recipes;
- map neutral sRGB colors to `androidx.compose.ui.graphics.Color`;
- map the framework reference-unit `px` dimensions to Compose `dp` according to the documented adapter rule;
- map neutral durations to Kotlin `Duration`;
- provide native Basic mappings for Button, Input, Switch and Panel/Card;
- compile generated Kotlin and Compose adapter code in CI.

The native component mappings intentionally use Compose/Foundation primitives and avoid making Material a requirement for the framework core. Platform-specific interaction and accessibility behavior belongs in this adapter, while the application-facing component semantics remain neutral.

Unsupported value types or rendering capabilities must fail explicitly or use a declared framework fallback; they must not be approximated silently.
