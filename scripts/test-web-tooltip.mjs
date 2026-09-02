// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiTooltip } from "../packages/adapter-web/src/tooltip.mjs";

const irPath = "build/spec-ir-tooltip-test.json";
const cssPath = "build/web/components-tooltip-test.css";

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
    this.textContent = "";
    this.hidden = false;
    this.id = "";
    this.style = {};
  }
  append(child) { child.parentNode = this; this.children.push(child); }
  contains(candidate) {
    if (candidate === this) return true;
    return this.children.some((child) => child.contains?.(candidate) ?? child === candidate);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  dispatch(type, extra = {}) {
    let prevented = false;
    this.listeners.get(type)?.({
      type,
      target: extra.target ?? this,
      currentTarget: this,
      key: extra.key ?? null,
      relatedTarget: extra.relatedTarget ?? null,
      preventDefault() { prevented = true; },
    });
    return prevented;
  }
}
const fakeDocument = {
  activeElement: null,
  createElement(tagName) { return new FakeElement(tagName, this); },
};

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.gui-tooltip \{/);
  assert.match(css, /\.gui-tooltip__popup \{/);
  assert.match(css, /\.gui-tooltip__content \{/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const changes = [];
  const tooltip = createGuiTooltip(fakeDocument, {
    open: false,
    content: "More information",
    placement: "bottom",
    size: "small",
    onOpenChange(value) { changes.push(value); },
  });

  assert.equal(tooltip.element.dataset.guiComponent, "tooltip");
  assert.equal(tooltip.element.dataset.guiPlacement, "bottom");
  assert.equal(tooltip.popupElement.getAttribute("role"), "tooltip");
  assert.equal(tooltip.popupElement.hidden, true);
  assert.equal(tooltip.popupElement.style.top, "calc(100% + 6px)");
  assert.equal(tooltip.popupElement.style.transform, "translateX(-50%)");
  assert.equal(tooltip.contentElement.textContent, "More information");
  assert.equal(tooltip.triggerElement.getAttribute("aria-describedby"), null);

  tooltip.triggerElement.dispatch("pointerenter");
  assert.deepEqual(changes, [true], "Hover requests opening without mutating controlled state");
  assert.equal(tooltip.popupElement.hidden, true);

  tooltip.update({ open: true });
  assert.equal(tooltip.popupElement.hidden, false);
  assert.equal(tooltip.triggerElement.getAttribute("aria-describedby"), tooltip.popupElement.id);

  assert.equal(tooltip.triggerElement.dispatch("keydown", { key: "Escape" }), true);
  assert.deepEqual(changes, [true, false]);
  assert.equal(tooltip.popupElement.hidden, false, "Escape remains a controlled close request");

  tooltip.update({ open: false });
  fakeDocument.activeElement = tooltip.triggerElement;
  tooltip.triggerElement.dispatch("focusin");
  assert.deepEqual(changes, [true, false, true]);
  tooltip.triggerElement.dispatch("pointerleave");
  assert.deepEqual(changes, [true, false, true], "Pointer leave must not close while focus remains inside trigger");
  fakeDocument.activeElement = null;
  tooltip.triggerElement.dispatch("focusout");
  assert.deepEqual(changes, [true, false, true, false]);

  assert.throws(() => tooltip.update({ placement: "center" }), /Unknown GUI tooltip placement/);
  assert.throws(() => tooltip.update({ content: "" }), /content must be a non-empty string/);
  assert.throws(() => tooltip.update({ open: "yes" }), /open must be a boolean/);

  tooltip.destroy();
  console.log("Web Basic Tooltip vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
