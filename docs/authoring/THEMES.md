# Theme Authoring

A theme defines visual language, not palette identity and not renderer behavior. Every theme must remain usable with multiple palettes, preserve component semantics, and express advanced effects through capabilities with deterministic fallbacks.

The formal source contract is `spec/schemas/theme.schema.json`. Existing themes under `spec/themes/*.theme.json` are the reference implementations.

## Required theme fields

Every theme source must contain the schema-required fields:

- `specVersion`
- `theme`
- `components`

Optional top-level fields are `extends` and `recommendedPalette`. `recommendedPalette` is a recommendation only; it must never make a theme dependent on one palette. `extends` is explicit inheritance, not an implicit relationship between the six built-in themes.

## Authoring rules

1. Start from semantic/component tokens. Do not embed platform-specific CSS, Compose APIs, operating-system checks or device-generation assumptions in neutral theme data.
2. Keep palette-specific color values in palette/token sources. A theme recipe should reference semantic or primitive tokens.
3. Use `extends` only when inheritance materially reduces duplication and the relationship is intentional. Parent objects merge recursively; arrays and scalar values are replaced by the child.
4. Request visual capabilities such as `backdropBlur`, `advancedBlend`, `shader`, `rive`, `reducedMotion` or `highQualityEffects` only when needed.
5. Supply deterministic fallbacks for optional/expensive capabilities. Fallbacks must preserve layout, semantics and usability.
6. Necessary interaction feedback may use shared motion tokens; decorative/expensive motion remains optional and reduced-motion preferences must be respected.
7. Keep the theme compatible with the component contract. A theme must not invent application semantics or lifecycle ownership.

## Workflow

1. Add or edit `spec/themes/<theme-id>.theme.json`.
2. If a new theme is introduced, register it in `spec/manifest.json` and ensure its referenced palettes/tokens exist.
3. Validate schemas and renderer-neutral boundaries:

```text
npm run validate:themes
npm run validate:theme-contracts
npm run test:neutral-boundaries
```

4. Compile the neutral IR and validate inheritance/capability resolution:

```text
npm run compile:spec
npm run test:theme-resolution
npm run test:capability-resolution
npm run test:visual-resolution
```

5. Add/update the theme-specific quality and performance contract. The built-in themes use gates such as `npm run test:basic-theme`, `npm run test:basic-performance`, `npm run test:frosted-theme` and `npm run test:frosted-performance`.
6. Regenerate Web and Compose outputs and validate representative references when the visual change reaches renderer output.

## Review checklist

A theme is ready only when schema validation, resolution/fallback tests, accessibility checks, performance budgets, generated-output compilation/typechecking and applicable reference/runtime gates are green. A visually attractive result is not sufficient if it weakens semantics, accessibility, portability or deterministic fallback behavior.
