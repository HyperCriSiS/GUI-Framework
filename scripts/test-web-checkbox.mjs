// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiCheckbox } from "../packages/adapter-web/src/checkbox.mjs";

const irPath = "build/spec-ir-checkbox-test.json";
const cssPath = "build/web/components-checkbox-test.css";

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
    this.className = "";
    this.type = "";
    this.textContent = "";
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
  assert.match(css, /\.gui-checkbox \{/);
  assert.match(css, /\.gui-checkbox__indicator/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /\.gui-checkbox:where\(:focus-visible\)/);
  assert.match(css, /\.gui-checkbox:where\(\[aria-checked="true"\]\)/);
  assert.match(css, /\.gui-checkbox:where\(\[data-gui-state~="indeterminate"\]\)/);
  assert.match(css, /min-width: var\(--gui-component-checkbox-box-size-medium\);/);
  assert.match(css, /min-height: var\(--gui-component-checkbox-box-size-medium\);/);
  assert.match(css, /font-size: var\(--gui-component-checkbox-indicator-size-medium\);/);
  assert.match(css, /background-color: var\(--gui-semantic-color-accent\);/);
  assert.match(css, /color: var\(--gui-semantic-color-on-accent\);/);
  assert.match(css, /transition: var\(--gui-motion-interaction-fast\);/);
  assert.match(css, /transition-duration: 0ms !important;/);
  assert.match(css, /transition-delay: 0ms !important;/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  const changes = [];
  const guiCheckbox = createGuiCheckbox(fakeDocument, {
    checked: false,
    accessibilityLabel: "Enable diagnostics",
    size: "large",
    onCheckedChange(checked) { changes.push(checked); },
  });

  assert.equal(guiCheckbox.element.tagName, "BUTTON");
  assert.equal(guiCheckbox.element.type, "button");
  assert.equal(guiCheckbox.element.getAttribute("role"), "checkbox");
  assert.equal(guiCheckbox.element.getAttribute("aria-checked"), "false");
  assert.equal(guiCheckbox.element.getAttribute("aria-label"), "Enable diagnostics");
  assert.equal(guiCheckbox.element.dataset.guiComponent, "checkbox");
  assert.equal(guiCheckbox.element.dataset.guiVariant, "standard");
  assert.equal(guiCheckbox.element.dataset.guiSize, "large");
  assert.equal(guiCheckbox.element.children.length, 1);
  assert.equal(guiCheckbox.element.children[0].className, "gui-checkbox__indicator");
  assert.equal(guiCheckbox.element.children[0].getAttribute("aria-hidden"), "true");
  assert.equal(guiCheckbox.element.children[0].textContent, "");

  guiCheckbox.element.click();
  assert.deepEqual(changes, [true]);
  assert.equal(guiCheckbox.element.getAttribute("aria-checked"), "false", "Checkbox value remains controlled until update");

  guiCheckbox.update({ checked: true });
  assert.equal(guiCheckbox.element.getAttribute("aria-checked"), "true");
  assert.equal(guiCheckbox.element.dataset.guiChecked, "true");
  assert.equal(guiCheckbox.element.children[0].textContent, "✓");
  guiCheckbox.element.click();
  assert.deepEqual(changes, [true, false]);

  guiCheckbox.update({ checked: false, indeterminate: true, size: "small" });
  assert.equal(guiCheckbox.element.getAttribute("aria-checked"), "mixed");
  assert.equal(guiCheckbox.element.dataset.guiIndeterminate, "true");
  assert.equal(guiCheckbox.element.dataset.guiState, "indeterminate");
  assert.equal(guiCheckbox.element.dataset.guiSize, "small");
  assert.equal(guiCheckbox.element.children[0].textContent, "−");
  guiCheckbox.element.click();
  assert.deepEqual(changes, [true, false, true], "Activating a mixed checkbox requests the checked state");

  guiCheckbox.update({ indeterminate: false, disabled: true });
  assert.equal(guiCheckbox.element.disabled, true);
  guiCheckbox.element.click();
  assert.deepEqual(changes, [true, false, true], "Disabled checkboxes must not emit changes");

  assert.throws(() => guiCheckbox.update({ checked: "false" }), { name: "TypeError", message: "GUI checkbox checked must be a boolean" });
  assert.throws(() => guiCheckbox.update({ indeterminate: 1 }), { name: "TypeError", message: "GUI checkbox indeterminate must be a boolean" });
  assert.throws(() => guiCheckbox.update({ disabled: 0 }), { name: "TypeError", message: "GUI checkbox disabled must be a boolean" });
  assert.throws(() => guiCheckbox.update({ size: "invalid" }), /Unknown GUI checkbox size/);

  guiCheckbox.destroy();
  assert.equal(guiCheckbox.element.listeners.has("click"), false);
  assert.throws(() => createGuiCheckbox(fakeDocument, { accessibilityLabel: "Checkbox" }), /checked must be a boolean/);
  assert.throws(() => createGuiCheckbox(fakeDocument, { checked: false }), /accessibilityLabel must be a non-empty string/);

  console.log("Web Basic checkbox vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
