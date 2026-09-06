// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("examples/browser-extension/manifest.json", "utf8"));
const popupHtml = await readFile("examples/browser-extension/popup.html", "utf8");
const popupModule = await readFile("examples/browser-extension/popup.mjs", "utf8");
const builtManifest = JSON.parse(await readFile("build/examples/browser-extension/manifest.json", "utf8"));
const bundleManifest = JSON.parse(await readFile("build/examples/browser-extension/gui-framework/bundle-manifest.json", "utf8"));
const builtIntegration = await readFile("build/examples/browser-extension/gui-framework/integration.mjs", "utf8");
const builtButton = await readFile("build/examples/browser-extension/gui-framework/adapter/button.mjs", "utf8");

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.action.default_popup, "popup.html");
assert.equal(manifest.background.service_worker, "service-worker.mjs");
assert.equal(manifest.background.type, "module");
assert.deepEqual(builtManifest, manifest);
assert.doesNotMatch(popupHtml, /<style\b|style\s*=|<script(?![^>]*\bsrc=)/i, "reference must remain compatible with the default MV3 CSP");
assert.match(popupHtml, /href="\.\/gui-framework\/gui-framework\.css"/);
assert.match(popupHtml, /src="\.\/popup\.mjs"/);
assert.match(popupModule, /createBrowserExtensionGuiHost/);
assert.match(popupModule, /createGuiButton/);
assert.match(popupModule, /surface: "popup"/);
assert.match(popupModule, /theme: "basic"/);
assert.match(popupModule, /palette: "reference-dark"/);
assert.match(bundleManifest.integrationModule, /integration\.mjs/);
assert.equal(bundleManifest.adapterDirectory, "adapter");
assert.ok(bundleManifest.adapterModules.includes("button.mjs"));
assert.match(builtIntegration, /createBrowserExtensionGuiHost/);
assert.match(builtButton, /export function createGuiButton/);

console.log("Browser extension reference build/source contract tests passed.");
