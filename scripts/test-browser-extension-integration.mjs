// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BROWSER_EXTENSION_SURFACES,
  createBrowserExtensionGuiHost,
  installBrowserExtensionStyles,
  resolveBrowserExtensionAssetUrl,
} from "../packages/integration-browser-extension/src/index.mjs";
import { buildBrowserExtensionBundle } from "../packages/integration-browser-extension/src/build-bundle.mjs";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.attributes = new Map();
    this.children = [];
    this.parent = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(element) { element.parent = this; this.children.push(element); }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  querySelectorAll(selector) {
    assert.equal(selector, "[data-gui-browser-extension-stylesheet]");
    return this.children.filter((child) => child.hasAttribute("data-gui-browser-extension-stylesheet"));
  }
}

class FakeDocument {
  constructor() { this.head = new FakeElement("head"); }
  createElement(tagName) { return new FakeElement(tagName); }
}

assert.deepEqual(BROWSER_EXTENSION_SURFACES, ["popup", "options", "side-panel", "devtools", "content-script"]);

const root = new FakeElement();
root.setAttribute("data-gui-theme", "modern");
root.setAttribute("data-existing", "kept");
const host = createBrowserExtensionGuiHost(root, {
  surface: "popup",
  theme: "basic",
  palette: "reference-dark",
});
assert.equal(root.getAttribute("data-gui-host"), "browser-extension");
assert.equal(root.getAttribute("data-gui-surface"), "popup");
assert.equal(root.getAttribute("data-gui-theme"), "basic");
assert.equal(root.getAttribute("data-gui-palette"), "reference-dark");
assert.equal(root.getAttribute("data-existing"), "kept");
assert.deepEqual(host.update({ surface: "side-panel", theme: "glass", palette: "reference-light" }), {
  surface: "side-panel",
  theme: "glass",
  palette: "reference-light",
});
assert.equal(root.getAttribute("data-gui-surface"), "side-panel");
assert.throws(() => host.update({ surface: "browser-action" }), /Unsupported browser extension surface/);
host.destroy();
assert.equal(root.getAttribute("data-gui-theme"), "modern");
assert.equal(root.getAttribute("data-gui-palette"), null);
assert.equal(root.getAttribute("data-gui-host"), null);
assert.equal(root.getAttribute("data-gui-surface"), null);
assert.throws(() => host.update({ theme: "basic" }), /destroyed/);

assert.equal(
  resolveBrowserExtensionAssetUrl((path) => `moz-extension://test/${path}`, "/gui-framework/gui-framework.css"),
  "moz-extension://test/gui-framework/gui-framework.css",
);
assert.throws(() => resolveBrowserExtensionAssetUrl(null, "x.css"), /runtimeGetURL/);

const document = new FakeDocument();
const firstStyles = installBrowserExtensionStyles(document, {
  runtimeGetURL: (path) => `chrome-extension://id/${path}`,
});
assert.equal(document.head.children.length, 1);
assert.equal(firstStyles.elements[0].getAttribute("rel"), "stylesheet");
assert.equal(firstStyles.elements[0].getAttribute("href"), "chrome-extension://id/gui-framework/gui-framework.css");
const secondStyles = installBrowserExtensionStyles(document, {
  runtimeGetURL: (path) => `chrome-extension://id/${path}`,
});
assert.equal(document.head.children.length, 1, "style installation must be idempotent");
assert.equal(secondStyles.elements[0], firstStyles.elements[0]);
secondStyles.destroy();
assert.equal(document.head.children.length, 1, "a controller must not remove a stylesheet it did not create");
firstStyles.destroy();
assert.equal(document.head.children.length, 0);

const workspace = await mkdtemp(join(tmpdir(), "gui-browser-extension-kit-"));
const buildWeb = join(workspace, "build", "web");
const assets = join(buildWeb, "assets");
await mkdir(assets, { recursive: true });
await writeFile(join(buildWeb, "tokens.css"), ":root { --gui-test: 1; }\n", "utf8");
await writeFile(join(buildWeb, "components.css"), "[data-gui-theme] { color: var(--gui-test); }\n", "utf8");
await writeFile(join(assets, "reference-check.svg"), "<svg/>\n", "utf8");
const outputDir = join(workspace, "extension", "gui-framework");
const bundle = await buildBrowserExtensionBundle({
  tokensPath: join(buildWeb, "tokens.css"),
  componentsPath: join(buildWeb, "components.css"),
  assetsPath: assets,
  outputDir,
});
const bundledCss = await readFile(bundle.stylesheetPath, "utf8");
assert.match(bundledCss, /GUI Framework browser-extension integration bundle/);
assert.ok(bundledCss.indexOf(":root { --gui-test: 1; }") < bundledCss.indexOf("[data-gui-theme]"), "tokens must precede component rules");
assert.equal(await readFile(join(bundle.assetsPath, "reference-check.svg"), "utf8"), "<svg/>\n");
const generatedManifest = JSON.parse(await readFile(bundle.manifestPath, "utf8"));
assert.equal(generatedManifest.schemaVersion, 1);
assert.equal(generatedManifest.host, "browser-extension");
assert.equal(generatedManifest.stylesheet, "gui-framework.css");
assert.equal(generatedManifest.assetsDirectory, "assets");
assert.equal(generatedManifest.integrationModule, "integration.mjs");
assert.equal(generatedManifest.adapterDirectory, "adapter");
assert.ok(generatedManifest.adapterModules.includes("button.mjs"));
assert.match(await readFile(bundle.integrationModulePath, "utf8"), /createBrowserExtensionGuiHost/);
assert.match(await readFile(join(bundle.adapterPath, "button.mjs"), "utf8"), /export function createGuiButton/);

console.log("Browser extension integration kit tests passed.");
