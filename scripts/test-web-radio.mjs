// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiRadio } from "../packages/adapter-web/src/radio.mjs";

const irPath = "build/spec-ir-radio-test.json";
const cssPath = "build/web/components-radio-test.css";
function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase(); this.dataset = {}; this.attributes = new Map(); this.listeners = new Map();
    this.children = []; this.disabled = false; this.className = ""; this.type = ""; this.textContent = "";
  }
  append(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get("click")?.({ type: "click", currentTarget: this }); }
}
const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-radio \{/);
  assert.match(css, /\.gui-radio__indicator/);
  assert.match(css, /\.gui-radio:where\(:focus-visible\)/);
  assert.match(css, /\.gui-radio:where\(\[data-gui-state~="selected"\]\)/);
  assert.match(css, /min-width: var\(--gui-component-radio-control-size-medium\);/);
  assert.match(css, /border-radius: var\(--gui-radius-pill\);/);
  assert.match(css, /background-color: var\(--gui-semantic-color-accent\);/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const changes = [];
  const radio = createGuiRadio(fakeDocument, {
    selected: false, accessibilityLabel: "Compact layout", groupName: "density", size: "large",
    onSelectedChange(value) { changes.push(value); },
  });
  assert.equal(radio.element.tagName, "BUTTON");
  assert.equal(radio.element.getAttribute("role"), "radio");
  assert.equal(radio.element.getAttribute("aria-checked"), "false");
  assert.equal(radio.element.dataset.guiRadioGroup, "density");
  radio.element.click();
  assert.deepEqual(changes, [true]);
  assert.equal(radio.element.getAttribute("aria-checked"), "false");
  radio.update({ selected: true });
  assert.equal(radio.element.getAttribute("aria-checked"), "true");
  assert.equal(radio.element.dataset.guiState, "selected");
  assert.equal(radio.element.children[0].textContent, "●");
  radio.element.click();
  assert.deepEqual(changes, [true]);
  radio.update({ selected: false, disabled: true });
  radio.element.click();
  assert.deepEqual(changes, [true]);
  assert.throws(() => radio.update({ selected: "true" }), /selected must be a boolean/);
  assert.throws(() => radio.update({ groupName: "" }), /groupName must be a non-empty string/);
  radio.destroy();
  console.log("Web Basic radio vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
