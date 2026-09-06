# Browser extension integration kit

This internal kit adapts the Web GUI Framework output to browser-extension surfaces without introducing a dependency on `chrome.*`, `browser.*`, a frontend framework, inline styles, or a canvas/WASM renderer.

It intentionally stays above the Web adapter. Components still come from `packages/adapter-web`; this kit only handles extension-specific hosting and packaging concerns.

## Supported surfaces

The host controller recognizes `popup`, `options`, `side-panel`, `devtools`, and `content-script`. The surface is exposed as `data-gui-surface` so later host-context presets can specialize layout without changing component semantics.

```js
import {
  createBrowserExtensionGuiHost,
  installBrowserExtensionStyles,
} from "./packages/integration-browser-extension/src/index.mjs";

const host = createBrowserExtensionGuiHost(document.body, {
  surface: "popup",
  theme: "basic",
  palette: "reference-dark",
});

const styles = installBrowserExtensionStyles(document, {
  runtimeGetURL: chrome.runtime.getURL,
});
```

Pass `browser.runtime.getURL` instead on Firefox-style APIs. The integration layer does not inspect global browser APIs, which keeps it testable and usable with either extension API family.

Both controllers are reversible: `destroy()` removes only state or stylesheet nodes owned by the controller and restores pre-existing host attributes.

## CSP-safe stylesheet bundle

Generate the regular Web outputs first, then produce one packaged extension stylesheet plus its assets:

```sh
npm run compile:spec
npm run build:web-tokens
npm run build:web-components
npm run build:web-assets
node packages/integration-browser-extension/src/build-bundle.mjs
```

The default output is:

```text
build/integration/browser-extension/gui-framework/
  gui-framework.css
  bundle-manifest.json
  assets/
```

Copy that directory into the extension package under `gui-framework/`. Extension-owned pages can load it with a normal packaged `<link>` or `installBrowserExtensionStyles`; no `unsafe-inline` CSP exception is required.

For content scripts, prefer declaring the packaged CSS in `content_scripts.css` or injecting it through the browser extension scripting API. If a content script creates a `<link>` to an extension URL inside a page or shadow root, the browser may require the stylesheet and referenced assets to be declared as web-accessible resources. That policy belongs to the consuming extension manifest, not to this framework.

## Isolation boundary

Generated component styling is scoped through GUI Framework data attributes. The host controller additionally marks the integration boundary with `data-gui-host="browser-extension"`. The kit does not reset arbitrary page styles and does not mutate the extension document outside the explicitly supplied host root and stylesheet target.
