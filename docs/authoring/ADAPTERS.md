# Adapter Authoring

Adapters translate the compiled renderer-neutral intermediate representation into established host-platform systems. They are translation layers, not alternate specifications.

Read `ARCHITECTURE.md`, `PUBLIC_API.md` and `MIGRATION_POLICY.md` before adding a target.

## Hard boundary

Adapters consume compiled IR such as `build/spec-ir.json`. They must not parse DTCG token sources, palette source files or theme JSON directly. This ensures every renderer receives the same validated/resolved semantics.

## Host-platform responsibilities

Prefer mature host systems for layout, text, focus, input and accessibility. An adapter must preserve semantic roles, labels/descriptions, disabled/checked/selected/error state, keyboard operation where applicable, focus behavior, pointer/touch behavior, accessibility mappings and reduced-motion behavior.

The host application retains lifecycle/navigation/window/Activity/DOM ownership unless an integration kit explicitly defines a narrower reversible boundary. Adapters must not silently infer operating-system generation, manufacturer, GPU class or window capabilities. Capability availability is explicit and fallback selection is deterministic.

## Unit and rendering rules

- Neutral DTCG `px` maps to CSS `px` on Web and `dp` on Compose; it is not a physical device pixel.
- Context-dependent units such as `rem` must fail rather than silently approximate when target semantics are not equivalent.
- Ordinary controls must not require Rive, direct Skia, WASM/canvas or another heavyweight renderer.
- SVG is the portable vector default where appropriate.
- Expensive effects require cheaper deterministic fallbacks.

## Public API design

Expose one intentional package/module entry point and an explicit allowlist of consumer symbols. Keep generators, visual registries, token internals and build helpers private. Never make a deep import public merely because an example happens to use it.

For a new adapter family, add its intended artifact/API boundary to the distribution/public-API contracts before publication. Publication is still explicit-approval-only.

## Validation workflow

At minimum:

```text
npm run compile:spec
npm run test:neutral-boundaries
npm run test:accessibility
npm run test:reference-parity
```

Then add adapter-specific source/compile tests and a consuming reference. Web-style output should include generated contract typechecking; Compose-style output should include generated Kotlin compilation. Runtime tests should cover interactions the static/compile gates cannot prove.

A new adapter is not complete merely because it renders a screenshot. It must demonstrate semantic fidelity, deterministic capability fallback, accessibility, performance and a real consumer path.
