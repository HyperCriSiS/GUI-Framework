// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiSwitch } from "../packages/adapter-web/src/switch.mjs";

const irPath = "build/spec-ir-switch-test.json";
const cssPath = "build/web/components-switch-test.css";

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
  assert.match(css, /\.gui-switch \{/);
  assert.match(css, /\.gui-switch__thumb/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /\.gui-switch:where\(:focus-visible\)/);
  assert.match(css, /\.gui-switch:where\(\[aria-checked="true"\]\)/);
  assert.match(css, /min-width: var\(--gui-sizing-switch-track-width-medium\);/);
  assert.match(css, /min-height: var\(--gui-sizing-switch-track-height-medium\);/);
  assert.match(css, /min-width: var\(--gui-sizing-switch-thumb-medium\);/);
  assert.match(css, /background-color: var\(--gui-semantic-color-accent\);/);
  const hoverSelector = ".gui-switch:where(:hover:not(:disabled))";
  const checkedSelector = '.gui-switch:where([aria-checked="true"])';
  assert.ok(css.indexOf(checkedSelector) > css.indexOf(hoverSelector), "The declared checked state must win over hover at equal specificity");
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Component CSS must use cascading token variables rather than duplicate palette values");
  assert.doesNotMatch(css, /transition-duration: 120ms;/, "The v1 Basic switch must not enable animation");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into component CSS");

  const changes = [];
  const changeArgumentCounts = [];
  const guiSwitch = createGuiSwitch(fakeDocument, {
    checked: false,
    accessibilityLabel: "Enable synchronization",
    size: "large",
    onCheckedChange(checked) {
      changes.push(checked);
      changeArgumentCounts.push(arguments.length);
    },
  });

  assert.equal(guiSwitch.element.tagName, "BUTTON");
  assert.equal(guiSwitch.element.type, "button");
  assert.equal(guiSwitch.element.getAttribute("role"), "switch");
  assert.equal(guiSwitch.element.getAttribute("aria-checked"), "false");
  assert.equal(guiSwitch.element.getAttribute("aria-label"), "Enable synchronization");
  assert.equal(guiSwitch.element.dataset.guiVariant, "standard");
  assert.equal(guiSwitch.element.dataset.guiSize, "large");
  assert.equal(guiSwitch.element.children.length, 1);
  assert.equal(guiSwitch.element.children[0].className, "gui-switch__thumb");
  assert.equal(guiSwitch.element.children[0].getAttribute("aria-hidden"), "true");

  guiSwitch.element.click();
  assert.deepEqual(changes, [true]);
  assert.deepEqual(changeArgumentCounts, [1], "Switch changes must expose only the boolean payload");
  assert.equal(typeof changes[0], "boolean");
  assert.equal(guiSwitch.element.getAttribute("aria-checked"), "false", "Switch value remains controlled until update");

  guiSwitch.update({ checked: true, accessibilityLabel: "Disable synchronization" });
  assert.equal(guiSwitch.element.getAttribute("aria-checked"), "true");
  assert.equal(guiSwitch.element.dataset.guiChecked, "true");
  assert.equal(guiSwitch.element.getAttribute("aria-label"), "Disable synchronization");
  guiSwitch.element.click();
  assert.deepEqual(changes, [true, false]);
  assert.deepEqual(changeArgumentCounts, [1, 1]);

  guiSwitch.update({ disabled: true });
  assert.equal(guiSwitch.element.disabled, true);
  guiSwitch.element.click();
  assert.deepEqual(changes, [true, false], "Disabled switches must not emit checked changes");

  assert.throws(
    () => guiSwitch.update({ checked: "false" }),
    { name: "TypeError", message: "GUI switch checked must be a boolean" },
  );
  assert.throws(
    () => guiSwitch.update({ disabled: 0 }),
    { name: "TypeError", message: "GUI switch disabled must be a boolean" },
  );

  guiSwitch.destroy();
  assert.equal(guiSwitch.element.listeners.has("click"), false);
  assert.throws(
    () => createGuiSwitch(fakeDocument, { accessibilityLabel: "Switch" }),
    { name: "TypeError", message: "GUI switch checked must be a boolean" },
  );
  assert.throws(
    () => createGuiSwitch(fakeDocument, { checked: null, accessibilityLabel: "Switch" }),
    { name: "TypeError", message: "GUI switch checked must be a boolean" },
  );
  assert.throws(
    () => createGuiSwitch(fakeDocument, { checked: false, accessibilityLabel: "Switch", disabled: undefined }),
    { name: "TypeError", message: "GUI switch disabled must be a boolean" },
  );
  assert.throws(() => createGuiSwitch(fakeDocument, { checked: false }), /accessibilityLabel must be a non-empty string/);
  assert.throws(() => createGuiSwitch(fakeDocument, { checked: false, accessibilityLabel: "Switch", size: "invalid" }), /Unknown GUI switch size/);

  console.log("Web Basic switch vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
