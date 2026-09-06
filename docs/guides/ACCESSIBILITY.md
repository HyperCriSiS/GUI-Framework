# Accessibility Guide

Accessibility is part of the neutral component contract and every adapter's completion criteria, not a renderer-specific afterthought.

The repository-wide contrast policy is `spec/accessibility/contrast-policy.json`, validated against `spec/schemas/contrast-policy.schema.json`.

## Required behavior

Adapters and components must preserve, where applicable:

- semantic role and accessible name/description;
- disabled, checked, selected, expanded, error and progress state;
- keyboard operation and logical focus order;
- visible focus feedback;
- pointer/touch target usability;
- label/help/error associations for form controls;
- live-region behavior for notifications/status;
- text scaling, long text, bidi and Unicode robustness;
- reduced-motion preferences while preserving state distinction.

Prefer native semantics. On Web use semantic HTML first and ARIA only where native semantics are insufficient. On Compose use Compose semantics and platform input/focus systems.

## Contrast and targets

Themes and components must satisfy the repository contrast/target policy in all applicable states, not only the default state. Capability fallbacks must also satisfy the same accessibility obligations.

## Validation

Run the neutral accessibility suite and the component-/adapter-specific semantic gates:

```text
npm run test:accessibility
npm run validate:contrast-policy
npm run test:kotlin-semantics
npm run test:text-locale-robustness
```

Interactive Web changes should additionally exercise keyboard/focus behavior in Chromium when static tests cannot prove it. Android/Compose changes that depend on platform semantics or input should use representative instrumentation/runtime coverage when required by the roadmap completion gates.

## Review questions

- Can the component be understood and operated without its decorative visual treatment?
- Are all semantic states exposed in the host platform's accessibility model?
- Is keyboard/focus behavior deterministic and consistent with the native control pattern?
- Do large text and compact layouts preserve content and targets?
- Does reduced motion remove unnecessary animation without removing state feedback?
- Does every capability fallback remain usable and legible?
