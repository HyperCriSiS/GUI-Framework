// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  WEB_APPLICATION_SURFACES,
  createWebApplicationGuiHost,
} from "../packages/integration-web-application/src/index.mjs";

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.dataset = {};
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
}

assert.deepEqual(WEB_APPLICATION_SURFACES, ["application", "settings", "dashboard", "embedded"]);

const root = new FakeElement();
root.setAttribute("data-gui-theme", "legacy");
root.setAttribute("data-existing", "kept");
const host = createWebApplicationGuiHost(root, {
  theme: "basic",
  palette: "reference-dark",
  surface: "application",
  availableCapabilities: ["backdropBlur", "backdropBlur"],
});
assert.equal(root.getAttribute("data-gui-host"), "web-application");
assert.equal(root.getAttribute("data-gui-surface"), "application");
assert.equal(root.getAttribute("data-gui-theme"), "basic");
assert.equal(root.getAttribute("data-gui-palette"), "reference-dark");
assert.equal(root.getAttribute("data-gui-capabilities"), "backdropBlur");
assert.deepEqual(host.getState().availableCapabilities, ["backdropBlur"]);

const panel = new FakeElement();
panel.dataset.guiComponent = "panel";
const ir = {
  palettes: [{
    id: "reference-dark",
    components: {
      panel: {
        capabilities: {
          required: [],
          optional: ["backdropBlur"],
          fallbackOrder: ["high"],
        },
      },
    },
    themes: {
      basic: {
        components: {
          panel: {
            fallbacks: {
              high: { requires: ["backdropBlur"], recipe: {} },
            },
          },
        },
      },
    },
  }],
};
const selection = host.configureComponentCapabilities(panel, ir);
assert.equal(selection.supported, true);
assert.equal(selection.selectedFallback, "high");
assert.equal(panel.getAttribute("data-gui-fallback"), "high");
assert.deepEqual(selection.availableCapabilities, ["backdropBlur"]);

host.update({ surface: "settings", theme: "modern", availableCapabilities: [] });
assert.equal(root.getAttribute("data-gui-surface"), "settings");
assert.equal(root.getAttribute("data-gui-theme"), "modern");
assert.equal(root.getAttribute("data-gui-capabilities"), null);
assert.throws(() => host.update({ availableCapabilities: "backdropBlur" }), /not a string/);
assert.throws(() => host.update({ surface: "popup" }), /Unsupported Web application surface/);
host.destroy();
assert.equal(root.getAttribute("data-gui-theme"), "legacy");
assert.equal(root.getAttribute("data-gui-host"), null);
assert.equal(root.getAttribute("data-existing"), "kept");
assert.throws(() => host.update({ theme: "basic" }), /destroyed/);

const html = await readFile("examples/web-reference/integration.html", "utf8");
const reference = await readFile("examples/web-reference/integration-reference.mjs", "utf8");
assert.match(html, /build\/web\/tokens\.css/);
assert.match(html, /build\/web\/components\.css/);
assert.match(reference, /createWebApplicationGuiHost/);
assert.match(reference, /createGuiButton/);
assert.match(reference, /build\/spec-ir\.json/);
assert.match(reference, /configureComponentCapabilities/);

console.log("Web application integration kit source/host contract tests passed.");
