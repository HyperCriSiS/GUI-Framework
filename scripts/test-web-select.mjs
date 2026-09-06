// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiSelect, createGuiSelectOption } from "../packages/adapter-web/src/select.mjs";

const irPath = "build/spec-ir-select-test.json";
const cssPath = "build/web/components-select-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.id = "";
    this.type = "";
    this.value = "";
    this.placeholder = "";
    this.disabled = false;
    this.readOnly = false;
    this.hidden = false;
    this.textContent = "";
  }
  append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get("click")?.({ type: "click", currentTarget: this, target: this }); }
  input(value, { isComposing = false } = {}) { this.value = value; this.listeners.get("input")?.({ type: "input", currentTarget: this, target: this, isComposing }); }
  compositionStart() { this.listeners.get("compositionstart")?.({ type: "compositionstart", currentTarget: this, target: this }); }
  compositionEnd(value = this.value) { this.value = value; this.listeners.get("compositionend")?.({ type: "compositionend", currentTarget: this, target: this }); }
  keydown(key, { isComposing = false, keyCode = 0 } = {}) {
    let prevented = false;
    this.listeners.get("keydown")?.({ type: "keydown", key, keyCode, isComposing, currentTarget: this, target: this, preventDefault() { prevented = true; } });
    return prevented;
  }
  clickChild(child) { this.listeners.get("click")?.({ type: "click", currentTarget: this, target: child }); }
}
const fakeDocument = { createElement(tagName) { return new FakeElement(tagName, this); } };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-select \{/);
  assert.match(css, /\.gui-select::placeholder/);
  assert.match(css, /\.gui-select:where\(:focus-visible\)/);
  assert.match(css, /\.gui-select:where\(\[data-gui-state~="expanded"\]\)/);
  assert.match(css, /min-height: var\(--gui-sizing-control-medium\);/);
  assert.match(css, /border-color: var\(--gui-semantic-color-focus\);/);
  assert.match(css, /\.gui-select__popup\[hidden\] \{ display: none; \}/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const expandedChanges = [];
  const valueChanges = [];
  const queryChanges = [];
  const select = createGuiSelect(fakeDocument, {
    value: "basic",
    accessibilityLabel: "Theme",
    onExpandedChange(value) { expandedChanges.push(value); },
    onValueChange(value) { valueChanges.push(value); },
    onQueryChange(value) { queryChanges.push(value); },
  });
  const basic = createGuiSelectOption(fakeDocument, { value: "basic", label: "Basic" });
  const modern = createGuiSelectOption(fakeDocument, { value: "modern", label: "Modern" });
  const disabled = createGuiSelectOption(fakeDocument, { value: "glass", label: "Glass", disabled: true });
  select.popupElement.append(basic.element, modern.element, disabled.element);
  select.refreshOptions();

  assert.equal(select.element.tagName, "INPUT");
  assert.equal(select.element.getAttribute("role"), "combobox");
  assert.equal(select.element.getAttribute("aria-haspopup"), "listbox");
  assert.equal(select.element.getAttribute("aria-expanded"), "false");
  assert.equal(select.element.getAttribute("aria-label"), "Theme");
  assert.equal(select.element.readOnly, true);
  assert.equal(select.element.dataset.guiEditable, "false");
  assert.equal(select.popupElement.getAttribute("role"), "listbox");
  assert.equal(select.popupElement.hidden, true);
  assert.equal(basic.element.getAttribute("aria-selected"), "true");
  assert.equal(modern.element.getAttribute("aria-selected"), "false");

  select.element.click();
  assert.deepEqual(expandedChanges, [true]);
  assert.equal(select.element.getAttribute("aria-expanded"), "false", "Select remains controlled until host updates expanded");

  select.update({ expanded: true });
  assert.equal(select.popupElement.hidden, false);
  assert.equal(select.element.dataset.guiState, "expanded");
  assert.equal(select.element.keydown("ArrowDown"), true);
  assert.equal(select.element.getAttribute("aria-activedescendant"), modern.element.id);
  assert.equal(disabled.element.dataset.guiActive, "false", "Disabled options are skipped by active navigation");
  assert.equal(select.element.keydown("Enter"), true);
  assert.deepEqual(valueChanges, ["modern"]);
  assert.deepEqual(expandedChanges, [true, false]);

  select.update({ value: "modern", expanded: false });
  assert.equal(modern.element.getAttribute("aria-selected"), "true");
  assert.equal(select.element.getAttribute("aria-activedescendant"), null);

  select.update({ editable: true, query: "mo", expanded: true });
  assert.equal(select.element.readOnly, false);
  assert.equal(select.element.value, "mo");
  assert.equal(select.element.getAttribute("aria-autocomplete"), "list");
  select.element.input("mod");
  assert.deepEqual(queryChanges, ["mod"]);

  select.popupElement.clickChild(disabled.element);
  assert.deepEqual(valueChanges, ["modern"], "Disabled option clicks do not emit value changes");
  select.popupElement.clickChild(basic.element);
  assert.deepEqual(valueChanges, ["modern", "basic"]);

  select.update({ disabled: true });
  select.element.click();
  assert.deepEqual(expandedChanges, [true, false, false], "Only the enabled option commit closed the editable popup");
  assert.throws(() => select.update({ editable: "yes" }), /editable must be a boolean/);
  assert.throws(() => createGuiSelectOption(fakeDocument, { value: "x", label: "" }), /label must be a non-empty string/);

  const imeQueries = [];
  const imeValues = [];
  const imeExpanded = [];
  const imeSelect = createGuiSelect(fakeDocument, {
    value: "",
    query: "seed",
    editable: true,
    expanded: true,
    onQueryChange(value) { imeQueries.push(value); },
    onValueChange(value) { imeValues.push(value); },
    onExpandedChange(value) { imeExpanded.push(value); },
  });
  const imeOption = createGuiSelectOption(fakeDocument, { value: "jp", label: "日本語" });
  imeSelect.popupElement.append(imeOption.element);
  imeSelect.refreshOptions();
  imeSelect.element.compositionStart();
  imeSelect.element.input("か", { isComposing: true });
  imeSelect.update({ query: "seed" });
  assert.equal(imeSelect.element.value, "か", "Controlled query echoes must not overwrite active IME preedit");
  assert.equal(imeSelect.element.keydown("Enter", { isComposing: true, keyCode: 229 }), false, "IME Enter must not be consumed by ComboBox navigation");
  assert.equal(imeSelect.element.keydown("ArrowDown", { isComposing: true, keyCode: 229 }), false, "IME candidate arrows must remain available to the platform");
  assert.deepEqual(imeValues, [], "IME candidate interaction must not commit an option");
  imeSelect.element.input("かな", { isComposing: true });
  imeSelect.update({ query: "か" });
  assert.equal(imeSelect.element.value, "かな");
  imeSelect.element.compositionEnd("かな");
  await Promise.resolve();
  assert.deepEqual(imeQueries, ["か", "かな"], "compositionend must not duplicate a final query already emitted by input");
  imeSelect.update({ query: "かな" });
  assert.equal(imeSelect.element.keydown("Enter", { keyCode: 229 }), false, "Legacy IME process key 229 must not be treated as option commit");
  assert.deepEqual(imeValues, []);
  assert.equal(imeSelect.element.keydown("Enter"), true, "Normal Enter handling must resume after composition");
  assert.deepEqual(imeValues, ["jp"]);
  assert.deepEqual(imeExpanded, [false]);
  imeSelect.element.compositionStart();
  imeSelect.element.value = "北京";
  imeSelect.element.compositionEnd("北京");
  await Promise.resolve();
  assert.deepEqual(imeQueries, ["か", "かな", "北京"], "compositionend must recover the committed query when a browser omits the final input event");
  imeOption.destroy();
  imeSelect.destroy();
  assert.equal(imeSelect.element.listeners.has("compositionstart"), false);
  assert.equal(imeSelect.element.listeners.has("compositionend"), false);

  disabled.destroy(); modern.destroy(); basic.destroy(); select.destroy();
  console.log("Web Basic Select / ComboBox vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
