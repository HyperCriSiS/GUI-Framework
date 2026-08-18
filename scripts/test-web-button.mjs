// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiButton } from "../packages/adapter-web/src/button.mjs";

const irPath = "build/spec-ir-button-test.json";
const cssPath = "build/web/components-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.disabled = false;
    this.textContent = "";
    this.className = "";
    this.type = "";
  }
  append(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  click() { this.listeners.get("click")?.({ type: "click", currentTarget: this }); }
}

const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");

  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-button \{/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /data-gui-palette="reference-dark"/);
  assert.match(css, /data-gui-palette="reference-light"/);
  assert.match(css, /data-gui-variant="primary"/);
  assert.match(css, /data-gui-size="large"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline-width: 2px;/);
  assert.match(css, /min-height: 36px;/);
  assert.match(css, /font-size: 14px;/);
  assert.match(css, /background-color: #4C8DFF;/);
  assert.match(css, /background-color: #684DE2;/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  let activations = 0;
  const button = createGuiButton(fakeDocument, {
    label: "Save",
    variant: "secondary",
    size: "large",
    onActivate: () => { activations += 1; },
  });

  assert.equal(button.element.tagName, "BUTTON");
  assert.equal(button.element.type, "button");
  assert.equal(button.element.dataset.guiVariant, "secondary");
  assert.equal(button.element.dataset.guiSize, "large");
  assert.equal(button.element.children[0].textContent, "Save");
  assert.equal(button.element.disabled, false);
  button.element.click();
  assert.equal(activations, 1);

  button.update({ loading: true, label: "Saving" });
  assert.equal(button.element.disabled, true, "Loading must use native disabled semantics");
  assert.equal(button.element.dataset.guiLoading, "true");
  assert.equal(button.element.getAttribute("aria-busy"), "true");
  assert.equal(button.element.children[0].textContent, "Saving");
  button.element.click();
  assert.equal(activations, 1, "Loading buttons must not activate");

  button.update({ loading: false, disabled: true });
  assert.equal(button.element.getAttribute("aria-busy"), null);
  assert.equal(button.element.disabled, true);
  button.element.click();
  assert.equal(activations, 1, "Disabled buttons must not activate");

  button.destroy();
  assert.equal(button.element.listeners.has("click"), false);
  assert.throws(() => createGuiButton(fakeDocument, { variant: "invalid" }), /Unknown GUI button variant/);

  console.log("Web Basic button vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
