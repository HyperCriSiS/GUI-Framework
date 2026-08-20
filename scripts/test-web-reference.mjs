// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mountReferenceApp } from "../examples/web-reference/app.mjs";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.className = "";
    this.style = {};
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.readOnly = false;
    this.id = "";
    this.htmlFor = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  click() {
    if (this.disabled) return;
    this.listeners.get("click")?.({ type: "click", currentTarget: this });
  }
  input(value) {
    this.value = value;
    this.listeners.get("input")?.({ type: "input", currentTarget: this });
  }
}

class FakeDialogElement extends FakeElement {
  constructor() {
    super("dialog");
    this.open = false;
  }
  showModal() { this.open = true; }
  close() { this.open = false; }
  cancel() {
    let prevented = false;
    const event = {
      type: "cancel",
      currentTarget: this,
      preventDefault() { prevented = true; },
    };
    this.listeners.get("cancel")?.(event);
    if (!prevented) this.close();
    return prevented;
  }
}

const fakeDocument = {
  createElement(tagName) {
    return tagName.toLowerCase() === "dialog" ? new FakeDialogElement() : new FakeElement(tagName);
  },
};

const root = new FakeElement("main");
const app = mountReferenceApp(fakeDocument, root);

assert.equal(root.dataset.guiTheme, "basic");
assert.equal(root.dataset.guiPalette, "reference-dark");
assert.equal(root.dataset.guiHostContext, "page");
assert.equal(app.hostContext, "page");
assert.equal(root.className, "gui-reference-host");
assert.equal(root.children.length, 2, "The theme host must contain the layout surface and dialog");
assert.equal(root.children[0], app.surface);
assert.equal(app.surface.className, "gui-reference");
assert.deepEqual(app.getState(), {
  name: "Ada Lovelace",
  notifications: true,
  palette: "reference-dark",
  dialogOpen: false,
});

assert.equal(app.components.nameInput.element.value, "Ada Lovelace");
app.components.nameInput.element.input("Grace Hopper");
assert.equal(app.getState().name, "Grace Hopper");
assert.equal(app.components.nameInput.element.value, "Grace Hopper", "Controlled input updates must round-trip through application state");

app.components.notificationSwitch.element.click();
assert.equal(app.getState().notifications, false);
assert.equal(app.components.notificationSwitch.element.getAttribute("aria-checked"), "false");

app.components.paletteButton.element.click();
assert.equal(app.getState().palette, "reference-light");
assert.equal(root.dataset.guiPalette, "reference-light", "Palette switching must happen at the common application ancestor");
assert.equal(app.components.paletteButton.element.children[0].textContent, "Use dark palette");

app.components.openDialogButton.element.click();
assert.equal(app.getState().dialogOpen, true);
assert.equal(app.components.dialog.element.open, true);
assert.equal(app.components.dialog.element.cancel(), true, "Native cancel must be converted into a controlled dismiss request");
assert.equal(app.getState().dialogOpen, false);
assert.equal(app.components.dialog.element.open, false);

app.components.openDialogButton.element.click();
app.components.closeDialogButton.element.click();
assert.equal(app.getState().dialogOpen, false);
assert.equal(app.components.dialog.element.open, false);

const extensionRoot = new FakeElement("main");
const extensionApp = mountReferenceApp(fakeDocument, extensionRoot, { hostContext: "extension-popup" });
assert.equal(extensionRoot.dataset.guiHostContext, "extension-popup");
assert.equal(extensionApp.hostContext, "extension-popup");
extensionApp.destroy();
assert.equal(extensionRoot.dataset.guiHostContext, undefined);

const [html, css] = await Promise.all([
  readFile("examples/web-reference/index.html", "utf8"),
  readFile("examples/web-reference/reference.css", "utf8"),
]);
assert.match(html, /\.\.\/\.\.\/build\/web\/tokens\.css/);
assert.match(html, /\.\.\/\.\.\/build\/web\/components\.css/);
assert.match(html, /type="module" src="\.\/app\.mjs"/);
assert.doesNotMatch(css, /\.gui-(?:button|input|switch|panel|dialog)(?:\b|__)/, "Reference layout CSS must not duplicate framework component styling");
assert.match(
  css,
  /#gui-reference-root\s*\{[^}]*background:\s*var\(--gui-semantic-color-surface,[^}]*color:\s*var\(--gui-semantic-color-text-primary,/s,
  "The themed application root must own the reference surface and primary text colors",
);
assert.match(css, /data-gui-host-context="extension-popup"/);
assert.match(css, /data-gui-host-context="extension-sidebar"/);
assert.match(css, /data-gui-host-context="extension-options"/);

app.destroy();
assert.equal(root.children.length, 0);
assert.equal(root.dataset.guiTheme, undefined);
assert.equal(root.dataset.guiPalette, undefined);
assert.equal(root.dataset.guiHostContext, undefined);
assert.equal(root.className, "");

assert.throws(() => mountReferenceApp(null, root), /Document-like object/);
assert.throws(() => mountReferenceApp(fakeDocument, null), /Element-like root/);
assert.throws(() => mountReferenceApp(fakeDocument, root, { palette: "unknown" }), /Unknown reference palette/);
assert.throws(() => mountReferenceApp(fakeDocument, root, { hostContext: "unknown" }), /Unknown Web reference host context/);

console.log("Functional Web reference application integration tests passed.");
