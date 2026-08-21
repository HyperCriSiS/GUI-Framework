// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiDialog } from "../packages/adapter-web/src/dialog.mjs";

const irPath = "build/spec-ir-dialog-test.json";
const cssPath = "build/web/components-dialog-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.className = "";
    this.style = {};
    this.isConnected = true;
    this.focusCalls = 0;
  }
  append(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }
  focus() {
    this.focusCalls += 1;
    this.ownerDocument.activeElement = this;
  }
}

class FakeDialogElement extends FakeElement {
  constructor(document) {
    super("dialog", document);
    this.open = false;
    this.showModalCalls = 0;
    this.closeCalls = 0;
  }
  showModal() {
    if (this.open) throw new Error("Dialog is already open");
    this.open = true;
    this.showModalCalls += 1;
    this.ownerDocument.activeElement = this;
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.closeCalls += 1;
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null;
  }
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

class FakeDocument {
  constructor() {
    this.activeElement = null;
  }
  createElement(tagName) {
    return tagName.toLowerCase() === "dialog"
      ? new FakeDialogElement(this)
      : new FakeElement(tagName, this);
  }
}

const fakeDocument = new FakeDocument();

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");

  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-dialog/);
  assert.match(css, /data-gui-theme="basic"/);
  assert.match(css, /background-color: var\(--gui-semantic-color-surface-elevated\);/);
  assert.match(css, /border-color: var\(--gui-semantic-color-border\);/);
  assert.match(css, /border-width: var\(--gui-border-width-standard\);/);
  assert.match(css, /border-radius: var\(--gui-radius-lg\);/);
  assert.match(css, /padding-inline: var\(--gui-spacing-lg\);/);
  assert.match(css, /padding-block: var\(--gui-spacing-lg\);/);
  assert.match(css, /:where\(\[data-gui-size="small"\]\)/);
  assert.match(css, /:where\(\[data-gui-size="large"\]\)/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Dialog CSS must inherit cascading palette token variables");
  assert.doesNotMatch(css, /\.gui-dialog[^{]*\{[^}]*transition:/s, "The Basic dialog must not add custom open or close animation");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into dialog CSS");

  const opener = fakeDocument.createElement("button");
  opener.focus();
  assert.equal(opener.focusCalls, 1);

  let dismissRequests = 0;
  const dialog = createGuiDialog(fakeDocument, {
    open: false,
    accessibilityLabel: "Delete account",
    size: "large",
    onDismissRequest: () => { dismissRequests += 1; },
  });

  assert.equal(dialog.element.tagName, "DIALOG");
  assert.equal(dialog.element.className, "gui-dialog");
  assert.equal(dialog.element.dataset.guiComponent, "dialog");
  assert.equal(dialog.element.dataset.guiVariant, "standard");
  assert.equal(dialog.element.dataset.guiSize, "large");
  assert.equal(dialog.element.dataset.guiDismissible, "true");
  assert.equal(dialog.element.getAttribute("aria-label"), "Delete account");
  assert.equal(dialog.element.getAttribute("aria-modal"), "true");
  assert.equal(dialog.element.open, false);
  assert.equal(dialog.element.style.boxSizing, "border-box");
  assert.equal(dialog.element.style.borderStyle, "solid");
  assert.equal(dialog.element.style.color, "inherit");

  const child = fakeDocument.createElement("section");
  dialog.element.append(child);
  dialog.update({ open: true });
  assert.equal(dialog.element.open, true);
  assert.equal(dialog.element.showModalCalls, 1);
  assert.equal(fakeDocument.activeElement, dialog.element, "Opening must enter native modal focus handling");
  assert.equal(dialog.element.children[0], child, "Dialog updates must preserve caller-owned children");

  const prevented = dialog.element.cancel();
  assert.equal(prevented, true, "Native cancel must be prevented so controlled state remains authoritative");
  assert.equal(dismissRequests, 1);
  assert.equal(dialog.element.open, true, "Dismiss requests must not close a controlled dialog before parent update");

  dialog.update({ dismissible: false });
  assert.equal(dialog.element.dataset.guiDismissible, "false");
  assert.equal(dialog.element.cancel(), true);
  assert.equal(dismissRequests, 1, "Non-dismissible dialogs must suppress native dismiss requests");
  assert.equal(dialog.element.open, true);

  dialog.update({ open: false, accessibilityLabel: "Account deletion confirmation" });
  assert.equal(dialog.element.open, false);
  assert.equal(dialog.element.closeCalls, 1);
  assert.equal(dialog.element.getAttribute("aria-label"), "Account deletion confirmation");
  assert.equal(dialog.element.children[0], child);
  assert.equal(opener.focusCalls, 2, "Controlled close must restore focus to the pre-open element");
  assert.equal(fakeDocument.activeElement, opener);

  opener.focus();
  const focusCallsBeforeDisconnectedClose = opener.focusCalls;
  dialog.update({ open: true, dismissible: true });
  opener.isConnected = false;
  dialog.update({ open: false });
  assert.equal(
    opener.focusCalls,
    focusCallsBeforeDisconnectedClose,
    "Focus restoration must ignore a target that left the document",
  );
  opener.isConnected = true;

  assert.throws(() => createGuiDialog(fakeDocument, { accessibilityLabel: "Dialog" }), /open must be a boolean/);
  assert.throws(() => createGuiDialog(fakeDocument, { open: false }), /accessibilityLabel must be a non-empty string/);
  assert.throws(() => dialog.update({ dismissible: undefined }), /dismissible must be a boolean/);
  assert.throws(() => dialog.update({ variant: "invalid" }), /Unknown GUI dialog variant/);
  assert.throws(() => dialog.update({ size: "invalid" }), /Unknown GUI dialog size/);
  assert.throws(() => dialog.update({ onDismissRequest: "invalid" }), /onDismissRequest must be a function or null/);
  assert.throws(() => createGuiDialog(null, { open: false, accessibilityLabel: "Dialog" }), /requires a DOM Document-like object/);

  opener.focus();
  const focusCallsBeforeDestroy = opener.focusCalls;
  dialog.update({ open: true, dismissible: true });
  dialog.destroy();
  assert.equal(dialog.element.listeners.has("cancel"), false);
  assert.equal(dialog.element.open, false, "Destroy must remove an open dialog from the native modal state");
  assert.equal(
    opener.focusCalls,
    focusCallsBeforeDestroy,
    "Destroy must not impose focus ownership on application teardown",
  );
  assert.equal(dialog.element.children[0], child, "Destroy must not take ownership of caller-provided child nodes");

  console.log("Web Basic dialog vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
