# Web adapter

This package is the first platform adapter for the language-neutral specification.

The adapter consumes compiled IR only. It does not parse DTCG source files, palette source files or theme source files directly.

Current scope:

- emit platform-neutral primitive tokens as `:root` CSS custom properties;
- emit semantic color roles per explicitly selected palette using `data-gui-palette`;
- convert supported neutral token types to CSS syntax;
- generate TypeScript theme/component metadata and union types from the neutral component registry;
- generate component CSS from compiled theme visual recipes;
- render the first native reference component (`Button`) without replacing browser semantics;
- expose neutral content/property/event metadata to Web tooling without inventing DOM-specific public contracts;
- keep development palette IDs out of public component contract types;
- fail explicitly for token or visual-property mappings that are not implemented yet.

## Generated CSS

After compiling the neutral specification, generate both token and component CSS:

```sh
npm run compile:spec
npm run build:web-tokens
npm run build:web-components
```

The generated files are:

```text
build/web/tokens.css
build/web/components.css
```

Load both files in the consuming Web surface. Select theme and palette on a common ancestor of the component tree:

```html
<div data-gui-theme="basic" data-gui-palette="reference-dark">
  <!-- GUI Framework components -->
</div>
```

`reference-dark` and `reference-light` are development palettes. The component API does not depend on those IDs; they only select the resolved color set at the application root.

## Native Basic Button

`createGuiButton` creates a real HTML `<button>` and applies only the runtime data required by the neutral Button contract:

```js
import { createGuiButton } from "./packages/adapter-web/src/button.mjs";

const button = createGuiButton(document, {
  label: "Save",
  variant: "primary",
  size: "medium",
  onActivate: () => save(),
});

document.querySelector("[data-gui-theme]").append(button.element);
```

Supported variants are `primary`, `secondary`, `ghost` and `danger`. Supported sizes are `small`, `medium` and `large`.

Runtime updates do not replace the DOM node:

```js
button.update({ loading: true, label: "Saving" });
button.update({ loading: false, disabled: false, label: "Saved" });
```

The native element remains responsible for keyboard activation, focus handling and disabled semantics. `loading` additionally sets `aria-busy="true"` and disables activation while work is in progress. Generated CSS maps neutral hover, focus, pressed, disabled and loading states. It also disables transition duration and delay when `prefers-reduced-motion: reduce` is active.

Destroy listeners when the component is no longer used:

```js
button.destroy();
```

## Adapter boundary

The Web adapter does not own the canonical component design. Basic Button geometry, typography, color roles and state styling live in `spec/themes/basic.theme.json`, reference neutral tokens, and are compiled into palette-specific typed IR before this adapter sees them.

Advanced visual properties such as blur, backdrop blur, glow and shadow remain explicit unsupported mappings in the current reference component CSS generator until a concrete component or theme requires them. They are never silently discarded.
