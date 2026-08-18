# Compose adapter

This internal package is the second platform adapter and an architecture validation target.

The adapter consumes compiled IR only. The first stage intentionally generates plain Kotlin contracts and typed token values without importing Compose. This verifies that component identity, variants, states, content slots, runtime properties, events, semantic metadata and design values can cross the language boundary without making Web or Compose the canonical model.

Palette-dependent resolved token values are deliberately excluded when checking whether component contracts are identical across palettes. Anatomy, content, runtime properties, events, variants, sizes, states, semantics and capability requirements must remain palette-independent.

Current scope:

- generate Kotlin theme and component identifiers from the neutral registry;
- generate strongly typed variant, size and state enums;
- generate runtime property data classes with neutral defaults;
- generate content/event metadata;
- generate semantic and capability metadata;
- generate typed Kotlin representations of primitive and semantic design tokens;
- keep raw palette token names out of adapter output;
- compile the generated Kotlin source in CI.

Compose UI mappings are intentionally a later step.
