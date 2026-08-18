# Compose adapter

This internal package is the second platform adapter and an architecture validation target.

The adapter consumes compiled IR only. The first stage generates plain Kotlin contracts and typed token values without importing Compose. This verifies that component identity, variants, states, content slots, runtime properties, events, semantic metadata and design values can cross the language boundary without making Web or Compose the canonical model.

Palette-dependent resolved token values are deliberately excluded when checking whether component contracts are identical across palettes. Anatomy, content, runtime properties, events, variants, sizes, states, semantics and capability requirements must remain palette-independent.

The host mapping layer may then convert neutral values to Compose primitives. The first such mapping is deliberately narrow: resolved sRGB color values map to `androidx.compose.ui.graphics.Color`. Unsupported color spaces fail explicitly rather than being approximated silently.

Current scope:

- generate Kotlin theme and component identifiers from the neutral registry;
- generate strongly typed variant, size and state enums;
- generate runtime property data classes with neutral defaults;
- generate content/event metadata;
- generate semantic and capability metadata;
- generate typed Kotlin representations of primitive and semantic design tokens;
- keep raw palette token names out of adapter output;
- map neutral sRGB colors to Compose UI colors;
- compile the generated Kotlin source and the initial Compose mapping in CI.

Dimension mapping is intentionally deferred until the neutral relationship between CSS reference pixels and Compose density-independent units is specified. Compose UI mappings for components are also a later step.
