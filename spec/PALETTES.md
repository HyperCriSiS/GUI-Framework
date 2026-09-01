# Palette families, variants and contrast

Palettes provide semantic color roles independently from theme geometry, effects and component recipes.

## Identity model

Every concrete palette has three identifiers:

- `id` uniquely selects the concrete palette.
- `familyId` groups related palettes that share an intentional color-system lineage.
- `variantId` names one member of that family.

`variantId` is deliberately open-ended. The framework does not define a light/dark enum. A family may expose variants such as `light`, `dark`, `high-contrast`, `oled`, `sepia` or another stable identity when those variants are deliberately designed and validated.

The pair `familyId` + `variantId` must be unique, and every concrete palette `id` must also be unique. These identities are carried into compiled IR so adapters and applications can offer family-aware selection without inferring semantics from names.

## Semantic color contract

Themes and components consume semantic roles such as `semantic.color.background`, `semantic.color.textPrimary`, `semantic.color.accent` and `semantic.color.focus`. They must not bind directly to raw palette swatches.

This separation allows the same theme recipe to be compiled against multiple palettes without forking component contracts or visual geometry.

## Contrast policy

`accessibility/contrast-policy.json` declares renderer-neutral minimum contrast checks for semantic role pairs. It currently requires:

- 4.5:1 for ordinary text/content pairs;
- 3:1 for UI boundaries, focus indicators and semantic non-text indicators.

Every registered palette is checked against this policy. Component-specific accessibility tests remain in addition to the semantic policy because a component can compose otherwise-valid semantic colors in an invalid way.

Disabled text is intentionally not assigned the ordinary-text threshold in the semantic policy. Disabled-state treatment is validated through component behavior rather than forcing an accessibility requirement that does not apply identically to inactive UI.

Adding a palette variant therefore requires both semantic-role completeness and successful contrast validation before it can be treated as supported.
