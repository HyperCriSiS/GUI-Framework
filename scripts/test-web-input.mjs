// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiInput } from "../packages/adapter-web/src/input.mjs";

const irPath = "build/spec-ir-input-test.json";
const cssPath = "build/web/components-input-test.css";

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
    this.disabled = false;
    this.readOnly = false;
    this.value = "";
    this.placeholder = "";
    this.className = "";
    this.type = "";
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  input(value) {
    this.value = value;
    this.listeners.get("input")?.({ type: "input", currentTarget: this });
  }
}

const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");

  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-input \{/);
  assert.match(css, /\.gui-input::placeholder/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /data-gui-palette="reference-dark"/);
  assert.match(css, /data-gui-palette="reference-light"/);
  assert.match(css, /\.gui-input:focus-visible/);
  assert.match(css, /\.gui-input\[aria-invalid="true"\]/);
  assert.match(css, /min-height: 36px;/);
  assert.match(css, /font-size: 14px;/);
  assert.match(css, /color: #AEB6C2;/);
  assert.match(css, /border-color: #E15B64;/);
  assert.doesNotMatch(css, /transition-duration: 120ms;/, "The v1 Basic input must not enable animation");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  const changes = [];
  const input = createGuiInput(fakeDocument, {
    value: "alpha",
    placeholder: "Search",
    size: "large",
    onValueChange: (value) => changes.push(value),
  });

  assert.equal(input.element.tagName, "INPUT");
  assert.equal(input.element.type, "text");
  assert.equal(input.element.dataset.guiVariant, "standard");
  assert.equal(input.element.dataset.guiSize, "large");
  assert.equal(input.element.value, "alpha");
  assert.equal(input.element.placeholder, "Search");
  assert.equal(input.element.disabled, false);
  assert.equal(input.element.readOnly, false);

  input.element.input("beta");
  assert.deepEqual(changes, ["beta"]);

  input.update({ value: "beta", error: true });
  assert.equal(input.element.value, "beta");
  assert.equal(input.element.dataset.guiError, "true");
  assert.equal(input.element.getAttribute("aria-invalid"), "true");

  input.update({ readOnly: true });
  assert.equal(input.element.readOnly, true);
  input.element.input("blocked");
  assert.deepEqual(changes, ["beta"], "Read-only inputs must not emit framework value changes");

  input.update({ readOnly: false, disabled: true, error: false });
  assert.equal(input.element.disabled, true);
  assert.equal(input.element.getAttribute("aria-invalid"), null);
  input.element.input("disabled");
  assert.deepEqual(changes, ["beta"], "Disabled inputs must not emit framework value changes");

  input.destroy();
  assert.equal(input.element.listeners.has("input"), false);
  assert.throws(() => createGuiInput(fakeDocument, { size: "invalid" }), /Unknown GUI input size/);

  console.log("Web Basic input vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
