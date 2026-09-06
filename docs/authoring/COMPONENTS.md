# Component Authoring

A GUI Framework component begins as a renderer-neutral semantic contract. Web/Compose implementations consume compiled IR; they do not define the cross-platform meaning of the component.

The formal source contract is `spec/schemas/component-recipe.schema.json`. Existing recipes under `spec/components/*.recipe.json` are canonical examples; `spec/components/button.recipe.json` is a useful small starting point.

## Required component fields

Every component recipe must define all schema-required areas:

- `specVersion`
- `component`
- `anatomy`
- `content`
- `properties`
- `events`
- `variants`
- `sizes`
- `states`
- `semantics`
- `tokenBindings`
- `capabilities`

These are not documentation-only labels. They are the neutral contract adapters and generated APIs must preserve.

## Design rules

1. **Semantics first.** Define role, state, labeling/description relationships, keyboard expectations and activation behavior before renderer visuals.
2. **State ownership is explicit.** Controlled values, selection, expansion and activation events belong in the neutral contract; adapters should not create hidden application state.
3. **Anatomy is semantic.** Parts exist because adapters need stable roles for layout/visual mapping, not to mirror one renderer's DOM or Compose tree.
4. **Variants and sizes are bounded public contracts.** Changes flow into generated Web/Kotlin contracts and therefore fall under `PUBLIC_API.md` and `MIGRATION_POLICY.md` once public.
5. **Token bindings are required.** Do not hardcode renderer-specific visual constants in the neutral recipe.
6. **Capabilities are explicit.** Optional effects require deterministic fallbacks; component behavior must not depend on a capability being present.
7. **Text is hostile by default.** Account for long natural language, unbroken text, Unicode/emoji/combining sequences and bidi direction where the component renders text.
8. **Use mature host interaction systems.** Do not reimplement native input/focus/semantics when Web or Compose already provides a robust primitive.

## End-to-end workflow

1. Add `spec/components/<component>.recipe.json` and register it in `spec/manifest.json`.
2. Add semantic/component tokens only when an existing token cannot express the requirement.
3. Validate and compile:

```text
npm run validate:components
npm run validate:component-contracts
npm run compile:spec
npm run test:spec
npm run test:accessibility
```

4. Add Basic-theme visual coverage before advanced themes. Advanced themes should inherit/fallback from a working semantic baseline rather than becoming the only implementation.
5. Implement Web and Compose adapters against the compiled/generated contract and add focused source tests.
6. Add reference-app coverage and cross-platform parity when the component is interactive or stateful.
7. Run generated contract/build gates (`npm run build:web-contracts`, `npm run typecheck:web-contracts`, `npm run build:kotlin-contracts`, `npm run compile:kotlin-contracts`).
8. Trigger Chromium/Android runtime gates only when the completion criteria or changed behavior require them.

## Public API changes

If authoring a component adds or changes a stable symbol, entry point, enum value or documented behavior, classify it under `MIGRATION_POLICY.md`. New public surface must be deliberately added to `api/public-api.json`; deep repository paths are not public by accident.
