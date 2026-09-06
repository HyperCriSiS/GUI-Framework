# Web application integration kit

This internal kit gives ordinary Web applications a small host boundary around the native Web adapter without imposing a framework, router, bundler, state library, or custom element system.

`createWebApplicationGuiHost(root, options)` attaches the explicit GUI host context to an existing DOM root and returns a reversible controller. The application supplies its theme, palette, surface and optional capabilities explicitly. The host does not silently detect CSS/GPU/browser capabilities; applications that want automatic Web capability detection may opt into the lower-level Web adapter API themselves.

```js
const host = createWebApplicationGuiHost(document.querySelector("#app"), {
  theme: "basic",
  palette: "reference-dark",
  surface: "application",
  availableCapabilities: [],
});
```

The returned `configureComponentCapabilities(element, ir)` helper applies the current host theme/palette/capability context to a native Web-adapter component using the compiled neutral IR. This keeps fallback behavior deterministic while retaining native HTML focus, input and accessibility behavior.

The application remains responsible for loading the generated token/component CSS and assets using its normal build pipeline. The integration kit does not own routing, document lifecycle, network requests, hydration, persistence or application state.
