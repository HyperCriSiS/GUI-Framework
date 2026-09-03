// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiToast } from "../packages/adapter-web/src/toast.mjs";

const irPath = "build/spec-ir-toast-test.json";
const cssPath = "build/web/components-toast-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeWindow {
  constructor() { this.time = 0; this.nextId = 1; this.timers = new Map(); this.performance = { now: () => this.time }; }
  setTimeout(callback, delay) { const id = this.nextId++; this.timers.set(id, { callback, due: this.time + delay }); return id; }
  clearTimeout(id) { this.timers.delete(id); }
  advance(ms) {
    const target = this.time + ms;
    while (true) {
      const pending = [...this.timers.entries()].filter(([, timer]) => timer.due <= target).sort((left, right) => left[1].due - right[1].due || left[0] - right[0]);
      if (pending.length === 0) break;
      const [id, timer] = pending[0]; this.timers.delete(id); this.time = timer.due; timer.callback();
    }
    this.time = target;
  }
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase(); this.ownerDocument = document; this.dataset = {}; this.attributes = new Map(); this.listeners = new Map(); this.children = []; this.className = ""; this.style = {}; this.hidden = false; this.textContent = ""; this.type = "";
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); if (this.listeners.get(type)?.size === 0) this.listeners.delete(type); }
  contains(candidate) { return this === candidate || this.children.some((child) => child.contains?.(candidate)); }
  dispatch(type, extras = {}) { const event = { type, currentTarget: this, target: this, relatedTarget: null, ...extras }; for (const listener of this.listeners.get(type) ?? []) listener(event); }
  click() { this.dispatch("click"); }
}

class FakeDocument { constructor() { this.defaultView = new FakeWindow(); } createElement(tagName) { return new FakeElement(tagName, this); } }
const fakeDocument = new FakeDocument();

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");
  assert.match(css, /\.gui-toast/); assert.match(css, /\.gui-toast__action/); assert.match(css, /\.gui-toast__dismiss/);
  assert.match(css, /background-color: var\(--gui-semantic-color-surface-elevated\);/);
  assert.match(css, /border-color: var\(--gui-semantic-color-accent\);/); assert.match(css, /border-color: var\(--gui-semantic-color-success\);/); assert.match(css, /border-color: var\(--gui-semantic-color-warning\);/); assert.match(css, /border-color: var\(--gui-semantic-color-danger\);/);
  assert.match(css, /\.gui-toast__action:where\(:hover:not\(:disabled\)\)/, "Toast action hover styling must scope to the action itself");
  assert.match(css, /\.gui-toast__action:where\(:focus-visible\)/, "Toast action focus styling must scope to the action itself");
  assert.match(css, /\.gui-toast__action:where\(:active:not\(:disabled\)\)/, "Toast action pressed styling must scope to the action itself");
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/, "Toast CSS must inherit cascading palette token variables");
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/, "Unresolved token references must not leak into Toast CSS");

  let closeRequests = 0; const activations = [];
  const toast = createGuiToast(fakeDocument, { open: false, title: "Workspace saved", message: "Your changes are stored locally.", actionLabel: "Undo", actionValue: "undo-save", durationMs: 1000, accessibilityLabel: "Workspace save notification", onOpenChange: (open) => { if (!open) closeRequests += 1; }, onActivate: (value) => activations.push(value) });
  assert.equal(toast.element.tagName, "DIV"); assert.equal(toast.element.className, "gui-toast"); assert.equal(toast.element.dataset.guiComponent, "toast"); assert.equal(toast.element.dataset.guiVariant, "info"); assert.equal(toast.element.dataset.guiSize, "medium"); assert.equal(toast.element.dataset.guiDismissible, "true"); assert.equal(toast.element.dataset.guiDurationMs, "1000"); assert.equal(toast.element.hidden, true);
  assert.equal(toast.element.getAttribute("role"), "status"); assert.equal(toast.element.getAttribute("aria-live"), "polite"); assert.equal(toast.element.getAttribute("aria-atomic"), "true"); assert.equal(toast.element.getAttribute("aria-label"), "Workspace save notification");
  assert.equal(toast.titleElement.textContent, "Workspace saved"); assert.equal(toast.titleElement.hidden, false); assert.equal(toast.messageElement.textContent, "Your changes are stored locally."); assert.equal(toast.actionElement.textContent, "Undo"); assert.equal(toast.actionElement.hidden, false); assert.equal(toast.dismissElement.hidden, false); assert.equal(toast.dismissElement.getAttribute("aria-label"), "Dismiss notification"); assert.equal(fakeDocument.defaultView.timers.size, 0);

  toast.update({ open: true }); assert.equal(toast.element.hidden, false); assert.equal(toast.element.getAttribute("aria-hidden"), "false"); assert.equal(fakeDocument.defaultView.timers.size, 1); fakeDocument.defaultView.advance(400); assert.equal(closeRequests, 0);
  toast.element.dispatch("mouseenter"); assert.equal(fakeDocument.defaultView.timers.size, 0); fakeDocument.defaultView.advance(1000); assert.equal(closeRequests, 0); toast.element.dispatch("mouseleave"); assert.equal(fakeDocument.defaultView.timers.size, 1); fakeDocument.defaultView.advance(599); assert.equal(closeRequests, 0); fakeDocument.defaultView.advance(1); assert.equal(closeRequests, 1); assert.equal(toast.element.hidden, false, "Auto-dismiss must not mutate controlled open state internally");
  toast.update({ open: false, title: "", accessibilityLabel: "" }); assert.equal(toast.element.hidden, true); assert.equal(toast.titleElement.hidden, true); assert.equal(toast.element.getAttribute("aria-label"), null);
  toast.update({ open: true, durationMs: 0, variant: "error", dismissible: false }); assert.equal(toast.element.getAttribute("role"), "alert"); assert.equal(toast.element.getAttribute("aria-live"), "assertive"); assert.equal(toast.dismissElement.hidden, true); assert.equal(fakeDocument.defaultView.timers.size, 0);
  toast.update({ dismissible: true, actionLabel: "Retry", actionValue: "retry" }); toast.actionElement.click(); assert.deepEqual(activations, ["retry"]); assert.equal(closeRequests, 2);
  toast.update({ open: true, durationMs: 500, actionLabel: "" }); assert.equal(toast.actionElement.hidden, true); assert.equal(fakeDocument.defaultView.timers.size, 1); toast.element.dispatch("focusin"); assert.equal(fakeDocument.defaultView.timers.size, 0); toast.element.dispatch("focusout", { relatedTarget: toast.dismissElement }); assert.equal(fakeDocument.defaultView.timers.size, 0); toast.element.dispatch("focusout", { relatedTarget: null }); assert.equal(fakeDocument.defaultView.timers.size, 1);
  toast.dismissElement.click(); assert.equal(closeRequests, 3); assert.equal(fakeDocument.defaultView.timers.size, 0);

  assert.throws(() => createGuiToast(fakeDocument, { message: "Missing open" }), /open must be a boolean/);
  assert.throws(() => createGuiToast(fakeDocument, { open: false, message: "" }), /message must be a non-empty string/);
  assert.throws(() => toast.update({ durationMs: -1 }), /durationMs must be a finite non-negative number/);
  assert.throws(() => toast.update({ dismissible: "yes" }), /dismissible must be a boolean/);
  assert.throws(() => toast.update({ variant: "invalid" }), /Unknown GUI toast variant/); assert.throws(() => toast.update({ size: "invalid" }), /Unknown GUI toast size/); assert.throws(() => toast.update({ onOpenChange: "invalid" }), /onOpenChange must be a function or null/); assert.throws(() => createGuiToast(null, { open: false, message: "Notification" }), /requires a DOM Document-like object/);
  toast.destroy(); assert.equal(fakeDocument.defaultView.timers.size, 0); for (const type of ["mouseenter", "mouseleave", "focusin", "focusout"]) assert.equal(toast.element.listeners.has(type), false); assert.equal(toast.actionElement.listeners.has("click"), false); assert.equal(toast.dismissElement.listeners.has("click"), false);
  console.log("Web Basic Toast / Notification vertical-slice tests passed.");
} finally { await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]); }
