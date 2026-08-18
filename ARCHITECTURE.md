# Architecture

## 1. Product boundary

The project is a portable GUI design and component specification, not a replacement platform UI toolkit.

Applications should continue to use established host-platform systems for layout, text, focus, input and accessibility wherever practical. The framework provides a shared semantic component language, theme/palette system, visual recipes and deterministic translation to platform adapters.

Conceptually:

```text
Application
    |
Semantic component API
    |
Language-neutral GUI specification
    |-- design tokens
    |-- palettes
    |-- component recipes
    |-- state/motion rules
    |-- capability fallbacks
    |
Platform adapter
    |
Native/established platform UI primitives
    |
Optional visual providers
```

## 2. Canonical source of truth

The canonical source must be language-neutral.

The existing TypeScript contracts are an early prototype and may become part of the Web adapter or generated API surface, but TypeScript itself must not be the permanent cross-platform source of truth.

The neutral source consists of two major layers:

1. DTCG-compatible design tokens for reusable values.
2. A GUI-specific component recipe specification describing how those values and assets apply to semantic components, states and capability fallbacks.

Generated TypeScript/Kotlin code or platform configuration is output, not the canonical design definition.

## 3. What a design token is

A design token is a named design value or semantic design role.

Instead of hard-coding a value such as:

```text
#4C8DFF
```

components refer to a role such as:

```text
color.accent
```

The currently selected palette supplies the concrete value.

Tokens may represent more than colors, for example:

```text
spacing.md
radius.lg
typography.body.size
border.standard.width
elevation.panel
motion.fast.duration
```

The specification should distinguish:

- primitive tokens: raw reusable values;
- semantic tokens: values named by purpose/role;
- component tokens: narrowly scoped values only when necessary.

Semantic/component tokens should generally reference lower-level tokens rather than duplicate raw values.

## 4. Themes and palettes are separate concepts

A theme defines the visual language of the interface.

Examples include:

- geometry;
- radii;
- border treatment;
- surface construction;
- depth/elevation language;
- transparency;
- blur/noise/glow policy;
- component-state styling;
- motion character;
- capability fallback recipes;
- optional decorative assets.

A palette defines color values and semantic color roles.

Representative semantic roles include:

```text
background
surface
surfaceElevated
textPrimary
textSecondary
accent
success
warning
danger
border
focus
```

The initial themes are:

- Basic
- Modern
- Glass
- Frosted Glass
- Spacey
- Cyberpunk

Their detailed visual definitions are intentionally deferred.

Every theme must support multiple palettes. A theme may recommend or ship with a default palette, but the palette is not the theme itself.

Conceptually:

```text
Frosted Glass + Blue palette
Frosted Glass + Violet palette
Frosted Glass + Monochrome palette

Cyberpunk + Blue palette
Cyberpunk + Amber palette
Cyberpunk + High-contrast palette
```

Changing the palette must not require copying or forking component recipes.

A palette may be reused by multiple themes when the combination passes legibility and visual-conformance checks.

## 5. Component recipes

A recipe describes visual intent for a semantic component without embedding target-platform implementation syntax.

A recipe may describe:

- anatomy/parts;
- variants;
- sizes;
- states;
- token references;
- visual layers;
- assets;
- functional motion;
- capability requirements;
- ordered fallback recipes;
- accessibility/semantic requirements that adapters must preserve.

Example concept:

```text
Button
    |
    +-- parts: surface, label, leadingIcon, trailingIcon
    +-- variants: primary, secondary, danger
    +-- states: default, hover, focus, pressed, disabled
    +-- style recipe
    +-- motion recipe
    +-- capability/fallback recipe
```

The recipe does not define DOM nodes, Compose modifiers, Android Context objects or other platform implementation details.

## 6. Resolution model

Resolution must be deterministic and inspectable.

A final component style can be influenced by:

```text
base specification
    -> theme
    -> palette
    -> component
    -> variant/size
    -> state
    -> capability fallback
```

The exact precedence rules must be formally defined before theme implementation expands.

Tooling should eventually be able to explain the origin of a resolved value so that theme/debugging problems can be traced without guesswork.

## 7. Platform adapters

Adapters translate the neutral specification to the target environment.

### Web

Prefer:

- semantic HTML;
- CSS;
- CSS custom properties;
- SVG;
- native focus and form behavior;
- ARIA only where native semantics are insufficient.

Browser extensions must remain a first-class target. The framework must not require a heavyweight canvas/WASM runtime for ordinary extension interfaces.

### Compose

Prefer:

- Compose layout/control primitives;
- Compose semantics;
- platform focus/input systems;
- efficient native/Compose drawing APIs;
- platform-appropriate vector assets.

The Compose adapter is also an architectural validation target: if the neutral specification only maps cleanly to Web, the specification is insufficiently neutral.

## 8. Visual technologies

### SVG

SVG is the primary portable vector-asset format for icons, geometry and decorative elements when appropriate.

### Rive

Rive is optional and reserved for cases where its scalable interactive visual/state-machine capabilities provide concrete value. Core component behavior must never require Rive.

### Skia

Direct Skia integration is deferred. Many target frameworks already provide efficient drawing layers or use Skia internally. A direct Skia module should only be introduced when a concrete effect or renderer limitation justifies the additional maintenance and dependency cost.

## 9. Capability and fallback model

Recipes request capabilities rather than inferring operating-system or device generations.

Initial capability concepts should remain intentionally small, for example:

```text
backdropBlur
advancedBlend
shader
rive
reducedMotion
highQualityEffects
```

Example:

```text
Frosted surface
    |
    +-- preferred: backdrop blur + translucent surface + highlight
    |
    +-- fallback: translucent/gradient surface + border + shadow
```

Fallbacks must preserve layout, semantics and usability.

## 10. States and motion

States and motion are separate.

Relevant component states may include:

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

Functional micro-interactions such as hover, press, focus, toggle and open/close feedback belong to baseline component behavior.

Motion references use shared tokens rather than arbitrary component-specific timing values.

Reduced-motion preferences must be respected without removing the visual distinction between states.

Decorative or expensive motion remains optional.

## 11. Accessibility and interaction

The framework specifies semantic requirements but should not reimplement mature host-platform interaction systems unnecessarily.

Adapters are responsible for preserving:

- semantic roles;
- labels/descriptions;
- disabled/checked/selected/error state;
- keyboard operation where applicable;
- focus behavior;
- touch/pointer behavior;
- accessibility mappings;
- reduced-motion behavior.

## 12. Performance rules

- Prefer host-platform layout and text engines.
- Prefer lightweight native/Web rendering paths for ordinary controls.
- Do not require Rive, Skia or another advanced visual runtime for basic UI.
- Expensive effects require cheaper deterministic fallbacks.
- Optional visual dependencies should remain modular.
- Complex lists/tables/trees should rely on platform-efficient virtualization mechanisms.
- Theme and palette switching must not alter semantic application structure.

## 13. API stability goal

Applications should consume semantic components and select a theme/palette without needing to know which renderer or advanced visual provider implements them.

Renderer-specific escape hatches may exist later, but they must not become the normal component API.
