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
  assert.match(css, /\.gui-input:where\(:focus-visible\)/);
  assert.match(css, /\.gui-input:where\(\[aria-invalid="true"\]\)/);
  assert.match(css, /min-height: var\(--gui-sizing-control-medium\);/);
  assert.match(css, /font-size: var\(--gui-typography-size-medium\);/);
  assert.match(css, /color: var\(--gui-semantic-color-text-secondary\);/);
  assert.match(css, /border-color: var\(--gui-semantic-color-danger\);/);
  const hoverSelector = ".gui-input:where(:hover:not(:disabled))";
  const errorSelector = '.gui-input:where([aria-invalid="true"])';
  assert.ok(css.indexOf(errorSelector) > css.indexOf(hoverSelector), "The declared error state must win over hover at equal specificity");
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Component CSS must use cascading token variables rather than duplicate palette values");
  assert.match(css, /transition: var\(--gui-motion-interaction-fast\);/, "Basic interactive controls must use the shared fast interaction transition");
  assert.match(css, /transition-duration: 0ms !important;/, "Reduced motion must disable functional transition duration");
  assert.match(css, /transition-delay: 0ms !important;/, "Reduced motion must disable functional transition delay");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  const changes = [];
  const changeArgumentCounts = [];
  const input = createGuiInput(fakeDocument, {
    value: "alpha",
    placeholder: "Search",
    accessibilityLabel: "Search records",
    size: "large",
    onValueChange(value) {
      changes.push(value);
      changeArgumentCounts.push(arguments.length);
    },
  });

  assert.equal(input.element.tagName, "INPUT");
  assert.equal(input.element.type, "text");
  assert.equal(input.element.dataset.guiVariant, "standard");
  assert.equal(input.element.dataset.guiSize, "large");
  assert.equal(input.element.value, "alpha");
  assert.equal(input.element.placeholder, "Search");
  assert.equal(input.element.getAttribute("aria-label"), "Search records");
  assert.equal(input.element.disabled, false);
  assert.equal(input.element.readOnly, false);

  input.element.input("beta");
  assert.deepEqual(changes, ["beta"]);
  assert.deepEqual(changeArgumentCounts, [1], "Input changes must expose only the string payload");
  assert.equal(typeof changes[0], "string");

  input.update({ value: "beta", error: true, accessibilityLabel: "Updated search label" });
  assert.equal(input.element.value, "beta");
  assert.equal(input.element.dataset.guiError, "true");
  assert.equal(input.element.getAttribute("aria-invalid"), "true");
  assert.equal(input.element.getAttribute("aria-label"), "Updated search label");

  input.update({ accessibilityLabel: "" });
  assert.equal(input.element.getAttribute("aria-label"), null, "Empty labels must defer to host-associated labels");

  input.update({ readOnly: true });
  assert.equal(input.element.readOnly, true);
  input.element.input("blocked");
  assert.deepEqual(changes, ["beta"], "Read-only inputs must not emit framework value changes");

  input.update({ readOnly: false, disabled: true, error: false });
  assert.equal(input.element.disabled, true);
  assert.equal(input.element.getAttribute("aria-invalid"), null);
  input.element.input("disabled");
  assert.deepEqual(changes, ["beta"], "Disabled inputs must not emit framework value changes");

  assert.throws(
    () => input.update({ value: undefined }),
    { name: "TypeError", message: "GUI input value must be a string" },
  );
  assert.throws(
    () => input.update({ accessibilityLabel: null }),
    { name: "TypeError", message: "GUI input accessibilityLabel must be a string" },
  );
  assert.throws(
    () => input.update({ disabled: "false" }),
    { name: "TypeError", message: "GUI input disabled must be a boolean" },
  );
  assert.throws(
    () => input.update({ readOnly: 0 }),
    { name: "TypeError", message: "GUI input readOnly must be a boolean" },
  );
  assert.throws(
    () => input.update({ error: null }),
    { name: "TypeError", message: "GUI input error must be a boolean" },
  );

  input.destroy();
  assert.equal(input.element.listeners.has("input"), false);
  assert.throws(
    () => createGuiInput(fakeDocument),
    { name: "TypeError", message: "GUI input value must be a string" },
  );
  assert.throws(
    () => createGuiInput(fakeDocument, { value: 1 }),
    { name: "TypeError", message: "GUI input value must be a string" },
  );
  assert.throws(
    () => createGuiInput(fakeDocument, { value: "", error: undefined }),
    { name: "TypeError", message: "GUI input error must be a boolean" },
  );
  assert.throws(
    () => createGuiInput(fakeDocument, { value: "", size: "invalid" }),
    /Unknown GUI input size/,
  );

  console.log("Web Basic input vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
