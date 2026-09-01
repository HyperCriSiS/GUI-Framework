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
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase(); this.ownerDocument = ownerDocument; this.dataset = {}; this.attributes = new Map(); this.listeners = new Map();
    this.children = []; this.disabled = false; this.className = ""; this.type = ""; this.textContent = ""; this.tabIndex = 0;
  }
  append(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get("click")?.({ type: "click", currentTarget: this }); }
  focus() { this.ownerDocument.activeElement = this; }
  keydown(key) {
    let prevented = false;
    this.listeners.get("keydown")?.({ type: "keydown", key, currentTarget: this, preventDefault() { prevented = true; } });
    return prevented;
  }
}
const fakeDocument = { activeElement: null, createElement(tagName) { return new FakeElement(tagName, this); } };

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
    selected: true, accessibilityLabel: "Compact layout", groupName: "density", size: "large",
    onSelectedChange(value) { changes.push(["compact", value]); },
  });
  const comfortableChanges = [];
  const comfortable = createGuiRadio(fakeDocument, {
    selected: false, accessibilityLabel: "Comfortable layout", groupName: "density",
    onSelectedChange(value) { comfortableChanges.push(value); },
  });
  const disabled = createGuiRadio(fakeDocument, {
    selected: false, accessibilityLabel: "Disabled layout", groupName: "density", disabled: true,
  });
  assert.equal(radio.element.tagName, "BUTTON");
  assert.equal(radio.element.getAttribute("role"), "radio");
  assert.equal(radio.element.getAttribute("aria-checked"), "true");
  assert.equal(radio.element.dataset.guiRadioGroup, "density");
  assert.equal(radio.element.tabIndex, 0);
  assert.equal(comfortable.element.tabIndex, -1);
  assert.equal(disabled.element.tabIndex, -1);

  assert.equal(radio.element.keydown("ArrowRight"), true);
  assert.equal(fakeDocument.activeElement, comfortable.element);
  assert.deepEqual(comfortableChanges, [true]);
  assert.equal(comfortable.element.tabIndex, 0, "Arrow navigation moves the roving tab stop before controlled state updates");
  assert.equal(radio.element.tabIndex, -1);
  assert.equal(comfortable.element.getAttribute("aria-checked"), "false", "Radio remains controlled until the host updates selected");

  radio.update({ selected: false });
  comfortable.update({ selected: true });
  assert.equal(comfortable.element.getAttribute("aria-checked"), "true");
  assert.equal(comfortable.element.dataset.guiState, "selected");
  assert.equal(comfortable.element.children[0].textContent, "●");
  assert.equal(comfortable.element.keydown("ArrowDown"), true);
  assert.equal(fakeDocument.activeElement, radio.element, "Disabled radios are skipped and group navigation wraps");
  assert.deepEqual(changes, [["compact", true]]);
  assert.equal(radio.element.keydown("Enter"), false, "Unrelated keys are left to native button behavior");

  radio.update({ selected: true });
  radio.element.click();
  assert.deepEqual(changes, [["compact", true]]);
  assert.throws(() => radio.update({ selected: "true" }), /selected must be a boolean/);
  assert.throws(() => radio.update({ groupName: "" }), /groupName must be a non-empty string/);
  comfortable.update({ groupName: "alternate" });
  assert.equal(comfortable.element.tabIndex, 0, "A radio moved to a new group becomes that group's tab stop");
  disabled.destroy();
  comfortable.destroy();
  radio.destroy();
  console.log("Web Basic radio vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
