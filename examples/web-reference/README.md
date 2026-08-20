# Web reference application

This application is an integration surface for the initial Basic-theme Web component set. It is not a mockup and does not duplicate component styling: Button, Input, Switch, Panel/Card and Dialog are created by the actual Web adapter modules, while the local stylesheet only defines application layout.

Generate the compiled framework CSS first:

```sh
npm run compile:spec
npm run build:web-tokens
npm run build:web-components
```

Then serve the repository root with any static HTTP server and open:

```text
/examples/web-reference/
```

The surface exercises controlled Input and Switch state, palette switching, native Button behavior, composed Panel/Card layout and controlled native Dialog dismissal/focus restoration.

Browser-extension layout contexts use the same application and framework components rather than a separate extension-only component layer:

```text
/examples/web-reference/?context=extension-popup
/examples/web-reference/?context=extension-sidebar
/examples/web-reference/?context=extension-options
```

Playwright verifies representative popup, sidebar and options-page viewport sizes for keyboard traversal, horizontal overflow and modal-dialog fit/focus behavior. These contexts intentionally validate host-layout constraints without putting browser-extension assumptions into the neutral component specification.
