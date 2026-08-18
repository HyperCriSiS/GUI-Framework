# Compose adapter

This internal package is the second platform adapter and an architecture validation target.

The adapter consumes compiled IR only. The first stage intentionally generates plain Kotlin contracts without importing Compose. This verifies that component identity, variants, states, content slots, runtime properties, events and semantic metadata can cross the language boundary without making Web or Compose the canonical model.

Current scope:

- generate Kotlin theme and component identifiers from the neutral registry;
- generate strongly typed variant, size and state enums;
- generate runtime property data classes with neutral defaults;
- generate content/event metadata;
- generate semantic and capability metadata;
- compile the generated Kotlin source in CI.

Compose UI mappings are intentionally a later step.
