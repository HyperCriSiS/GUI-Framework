# Architecture

## 1. Architectural principle

The framework separates **what a component is** from **how it is rendered**.

Applications consume semantic components such as `Button`, `Input`, `Switch`, `Panel` and `Dialog`. They do not select `CssButton`, `RiveButton`, `SkiaButton` or other renderer-specific controls.

Conceptually:

```text
Application
    |
Semantic component API
    |
Theme + design tokens
    |
Capability resolution
    |
Platform renderer
    |
Optional visual/effect providers
```

This allows the same component and theme definitions to target multiple environments without requiring a universal rendering runtime.

## 2. Core layer

The core defines platform-neutral contracts for:

- component semantics and state;
- design tokens;
- theme definitions;
- renderer capabilities;
- quality/fallback levels;
- asset references;
- accessibility metadata;
- motion tokens and functional interaction-transition contracts.

The core must not require Rive, Skia, Compose, a browser DOM, or another platform renderer.

## 3. Renderer layer

A renderer maps core semantics to a target platform.

Initial renderer targets:

### Web

Responsibilities include:

- HTML structure;
- CSS layout and styling;
- SVG integration;
- browser input and focus handling;
- accessibility/ARIA mapping;
- browser-extension compatibility.

### Compose

Responsibilities include:

- Android/Desktop layout and controls;
- input and focus behavior;
- accessibility semantics;
- platform scaling;
- token translation;
- vector asset integration.

Additional renderers can be added without changing application-facing component APIs.

## 4. Visual layers

### SVG

SVG is the primary portable vector-asset format for icons, geometry and decorative elements.

### Rive

Rive is optional. It may provide complex scalable visual components and, in a later phase, animation/state-machine assets. Core functionality must never depend on Rive being present.

### Skia

Skia is optional and intended for advanced rendering/effect paths where the target environment can benefit from them. It is not required for baseline rendering.

## 5. Capability model

Renderers expose capabilities instead of requiring themes to infer device classes or operating-system generations.

Representative capabilities include:

```text
backdropBlur
vectorFilters
advancedBlendModes
shaderEffects
rive
hardwareAcceleration
```

Themes request visual features through semantic effect definitions. The renderer resolves each request to the best supported implementation.

Example:

```text
Frosted surface
    |
    +-- advanced path: blur + noise + highlight + refraction
    |
    +-- standard path: blur + highlight
    |
    +-- fallback path: translucent fill + gradient + border + shadow
```

All paths must preserve component semantics, layout and usability.

## 6. Theme model

Themes are data and visual policy, not forks of component behavior.

Initial themes:

- Basic
- Modern
- Glass
- Frosted Glass
- Spacey
- Cyberpunk

A theme may define:

- semantic colors;
- typography;
- spacing;
- radii;
- control dimensions;
- border geometry;
- surface treatment;
- shadows;
- glow;
- blur;
- noise;
- decorative vector assets;
- component-state styling;
- capability-specific visual variants.

Theme implementations must not duplicate application logic or accessibility behavior.

## 7. Component states and motion

The core state model is independent from motion, but functional micro-interactions are part of baseline component behavior.

Components may expose relevant states such as:

```text
default
hover
focus
pressed
selected
checked
disabled
loading
error
```

Renderers should provide short, performant transitions for interaction feedback such as hover, press, focus, toggle, selection and open/close states. Motion parameters are supplied through shared motion tokens rather than hard-coded per component.

Reduced-motion preferences must be respected without removing the visual distinction between states. Decorative or expensive animation remains optional and must not be required for component semantics or usability.

## 8. Performance rules

- Prefer native/platform layout and text systems.
- Avoid mandatory canvas-only application rendering.
- Advanced effects must be independently disableable.
- Expensive effects require deterministic cheaper fallbacks.
- Renderer-specific dependencies should be optional modules.
- Large lists, tables and trees must support virtualization where required.
- Theme complexity must not alter semantic application structure.

## 9. Accessibility rules

Accessibility is part of component behavior, not theme decoration.

Every renderer is responsible for preserving:

- semantic roles;
- labels and descriptions;
- focus order;
- keyboard operation where applicable;
- high-contrast/legibility requirements;
- disabled and error states;
- reduced-motion behavior while preserving necessary state feedback.

## 10. API stability goal

Applications should be able to switch themes or renderer backends without replacing semantic components. Renderer-specific APIs are reserved for explicitly advanced escape hatches and must not become the normal usage model.
