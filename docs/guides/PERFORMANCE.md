# Performance Guide

Performance is a design constraint of the neutral recipes and adapters. The machine-readable budgets live in `spec/quality/performance-budgets.json`; theme-specific tests enforce the current limits.

## Architectural rules

- Prefer host-platform layout and text engines.
- Prefer lightweight native/Web rendering for ordinary controls.
- Do not require Rive, direct Skia, canvas/WASM or shader paths for basic UI.
- Advanced effects are optional capabilities and require deterministic cheaper fallbacks.
- Keep optional visual dependencies modular.
- Use platform-efficient virtualization for complex lists, tables and trees.
- Theme/palette switching must not rebuild or alter semantic application structure.
- Necessary micro-interactions are allowed; decorative/expensive motion is optional.

## Budget workflow

When a theme or component introduces an effect or materially changes visual complexity:

1. Identify the affected budget in `spec/quality/performance-budgets.json`.
2. Add or update a focused deterministic performance test rather than relying on subjective smoothness.
3. Validate the theme-specific budget, for example:

```text
npm run test:basic-performance
npm run test:modern-performance
npm run test:glass-performance
npm run test:frosted-performance
npm run test:spacey-performance
npm run test:cyberpunk-performance
```

4. Confirm the fallback path is cheaper and preserves semantics/layout.
5. Use representative browser/device runtime evidence when the performance characteristic cannot be established by the source/budget test alone.

## CI cost is also a resource

Do not convert every source change into an emulator/browser run. Use permanent fast gates for contracts and deterministic regressions, then trigger expensive runtime jobs only where they prove a behavior that cheaper gates cannot. This keeps feedback fast without weakening completion criteria.

## Regression review

A change should be rejected or redesigned when it makes an ordinary control depend on an advanced renderer, removes a deterministic fallback, exceeds a declared budget without an explicit policy change, or forces unnecessary semantic-tree churn during theme/palette switching.
