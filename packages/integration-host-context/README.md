# Shared host-context presets

This package defines small, renderer-neutral capability presets that can be passed into the existing Browser Extension, Web Application, Desktop, Android, and Python integration hosts.

The presets deliberately do **not** choose a theme, palette, surface, lifecycle policy, DOM root, Activity, or Window. Those remain application/host decisions.

## Presets

- `portable`: claims no optional rendering capability. This is the safest default.
- `blend-effects`: the host has verified `advancedBlendModes`.
- `backdrop-effects`: the host has verified `backdropBlur`.
- `rich-effects`: the host has verified both `advancedBlendModes` and `backdropBlur`.

A preset is a declaration, not capability detection. Applications must only select an effect preset after the host has actually verified the advertised capabilities. Web applications may use the Web adapter's explicit detection helper before selecting a preset; other environments should use their own platform checks.

Each runtime binding also allows additional explicitly verified capabilities so future optional capabilities can be adopted without changing the preset contract.
