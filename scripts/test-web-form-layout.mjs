// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  createGuiFormActions,
  createGuiFormField,
  createGuiFormLayout,
  createGuiFormLayoutSection,
} from "../packages/adapter-web/src/form-layout.mjs";

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) ?? ""; }
}
class FakeElement {
  constructor(document, tagName) {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.style = new FakeStyle();
    this.textContent = "";
    this.hidden = false;
    this.disabled = false;
  }
  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
}
class FakeDocument { createElement(tagName) { return new FakeElement(this, tagName); } }

const document = new FakeDocument();
const layout = createGuiFormLayout(document, {
  accessibilityLabel: "Account settings",
  columns: 2,
  variant: "inline",
  size: "large",
});
assert.equal(layout.element.tagName, "DIV");
assert.equal(layout.element.getAttribute("role"), "group");
assert.equal(layout.element.getAttribute("aria-label"), "Account settings");
assert.equal(layout.element.dataset.guiComponent, "form-layout");
assert.equal(layout.element.dataset.guiVariant, "inline");
assert.equal(layout.element.dataset.guiSize, "large");
assert.equal(layout.element.style.getPropertyValue("--gui-form-layout-columns"), "2");
assert.throws(() => layout.update({ columns: 0 }), /positive integer/);
assert.throws(() => createGuiFormLayout(document, { columns: 1.5 }), /positive integer/);
layout.update({ columns: 3, variant: "stacked", accessibilityLabel: "" });
assert.equal(layout.element.style.getPropertyValue("--gui-form-layout-columns"), "3");
assert.equal(layout.element.dataset.guiVariant, "stacked");
assert.equal(layout.element.getAttribute("aria-label"), null);

const control = document.createElement("input");
control.setAttribute("aria-describedby", "external-help");
const field = createGuiFormField(document, {
  control,
  label: "Email",
  description: "Used for account recovery",
  error: "Enter a valid email",
});
assert.equal(field.element.className, "gui-form-layout__field");
assert.equal(field.labelElement.textContent, "Email");
assert.equal(field.labelElement.getAttribute("for"), control.getAttribute("id"));
assert.match(control.getAttribute("id"), /^gui-form-control-\d+$/);
assert.equal(control.getAttribute("aria-invalid"), "true");
assert.equal(
  control.getAttribute("aria-describedby"),
  `external-help ${field.descriptionElement.getAttribute("id")} ${field.errorElement.getAttribute("id")}`,
);
assert.equal(field.element.dataset.guiState, "error");
assert.equal(field.controlElement.children[0], control);
assert.equal(control.disabled, false, "layout reflection must not mutate host-owned disabled state");

field.update({ error: "", disabled: true });
assert.equal(field.errorElement.hidden, true);
assert.equal(field.element.dataset.guiState, "disabled");
assert.equal(field.element.getAttribute("aria-disabled"), "true");
assert.equal(control.getAttribute("aria-invalid"), null);
assert.equal(control.getAttribute("aria-describedby"), `external-help ${field.descriptionElement.getAttribute("id")}`);
assert.equal(control.disabled, false);
field.update({ description: "", disabled: false });
assert.equal(control.getAttribute("aria-describedby"), "external-help");
assert.equal(field.element.dataset.guiState, "");
assert.throws(() => field.update({ control: document.createElement("input") }), /cannot be replaced/);
assert.throws(() => field.update({ id: "changed" }), /cannot be changed/);
field.destroy();
assert.equal(control.getAttribute("id"), null);
assert.equal(control.getAttribute("aria-describedby"), "external-help");
assert.equal(control.getAttribute("aria-invalid"), null);

const preidentified = document.createElement("select");
preidentified.setAttribute("id", "country");
preidentified.setAttribute("aria-invalid", "grammar");
const second = createGuiFormField(document, { control: preidentified, label: "Country", error: "Required" });
assert.equal(second.labelElement.getAttribute("for"), "country");
second.update({ error: "" });
assert.equal(preidentified.getAttribute("aria-invalid"), "grammar");
second.destroy();
assert.equal(preidentified.getAttribute("id"), "country");

assert.equal(createGuiFormLayoutSection(document).element.className, "gui-form-layout__section");
assert.equal(createGuiFormActions(document).element.className, "gui-form-layout__actions");

const irPath = "build/spec-ir-web-form-layout-test.json";
const cssPath = "build/web/form-layout-components-test.css";
function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}
try {
  run(process.execPath, ["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(process.execPath, ["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-form-layout \{ box-sizing: border-box; display: grid;/);
  assert.match(css, /grid-template-columns: repeat\(var\(--gui-form-layout-columns, 1\), minmax\(0, 1fr\)\)/);
  assert.match(css, /\.gui-form-layout__field:where\(\[data-gui-state~="error"\]\) > \.gui-form-layout__label/);
  assert.match(css, /\.gui-form-layout__field:where\(\[data-gui-state~="disabled"\]\)/);
  assert.match(css, /\.gui-form-layout:where\(\[data-gui-variant="inline"\]\) \.gui-form-layout__field/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /--gui-form-layout-columns/);
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}

console.log("Native Web Form Layout adapter and generated CSS tests passed.");
