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
    this.id = "";
    this.hidden = false;
    this.style = {};
    this.rect = { left: 40, top: 40, right: 80, bottom: 64, width: 40, height: 24 };
  }
  append(child) { child.parentNode = this; this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  contains(candidate) { return candidate === this || this.children.includes(candidate); }
  getBoundingClientRect() { return this.rect; }
  remove() { this.removed = true; }
  dispatch(type, { key = null, relatedTarget = null } = {}) {
    let prevented = false;
    this.listeners.get(type)?.({
      type,
      target: this,
      currentTarget: this,
      key,
      relatedTarget,
      preventDefault() { prevented = true; },
    });
    return prevented;
  }
}

const windowListeners = new Map();
const fakeDocument = {
  documentElement: { clientWidth: 320, clientHeight: 240 },
  defaultView: {
    innerWidth: 320,
    innerHeight: 240,
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    removeEventListener(type, listener) { if (windowListeners.get(type) === listener) windowListeners.delete(type); },
  },
  createElement(tagName) { return new FakeElement(tagName, this); },
};

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.gui-tooltip \{/);
  assert.match(css, /\.gui-tooltip__popup \{/);
  assert.match(css, /\.gui-tooltip__popup\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.gui-tooltip__content \{/);
  assert.match(css, /position: fixed;/);
  assert.match(css, /pointer-events: none;/);
  assert.doesNotMatch(css, /\.gui-tooltip(?:__[^ {]+)?[^\{]*\{[^}]*transition:/s, "Tooltip foundation must not add decorative animation");
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const changes = [];
  const trigger = fakeDocument.createElement("button");
  trigger.className = "icon-control";
  trigger.setAttribute("aria-describedby", "existing-help");
  trigger.rect = { left: 120, top: 2, right: 160, bottom: 26, width: 40, height: 24 };

  const tooltip = createGuiTooltip(fakeDocument, {
    open: false,
    triggerElement: trigger,
    content: "Reload data",
    placement: "top",
    size: "small",
    onOpenChange(open) { changes.push(open); },
  });
  tooltip.popupElement.rect = { left: 0, top: 0, right: 96, bottom: 24, width: 96, height: 24 };

  assert.equal(tooltip.element.tagName, "SPAN");
  assert.equal(tooltip.element.dataset.guiComponent, "tooltip");
  assert.equal(tooltip.element.dataset.guiVariant, "standard");
  assert.equal(tooltip.element.dataset.guiSize, "small");
  assert.equal(tooltip.element.dataset.guiPlacement, "top");
  assert.match(trigger.className, /\bgui-tooltip__trigger\b/);
  assert.equal(trigger.tagName, "BUTTON", "Tooltip must preserve the host trigger element and semantics");
  assert.equal(tooltip.popupElement.getAttribute("role"), "tooltip");
  assert.equal(tooltip.popupElement.hidden, true);
  assert.equal(tooltip.popupElement.getAttribute("aria-hidden"), "true");
  assert.equal(tooltip.contentElement.textContent, "Reload data");
  assert.equal(trigger.getAttribute("aria-describedby"), "existing-help");

  trigger.dispatch("mouseenter");
  assert.deepEqual(changes, [true]);
  assert.equal(tooltip.popupElement.hidden, true, "Hover only requests state; host controls visibility");

  tooltip.update({ open: true });
  assert.equal(tooltip.popupElement.hidden, false);
  assert.equal(tooltip.popupElement.getAttribute("aria-hidden"), "false");
  assert.match(trigger.getAttribute("aria-describedby"), /^existing-help gui-tooltip-\d+$/);
  assert.equal(tooltip.popupElement.dataset.guiResolvedPlacement, "bottom", "Top placement flips when viewport space is insufficient");
  assert.equal(tooltip.popupElement.style.top, "34px");

  tooltip.popupElement.rect = { left: 0, top: 0, right: 420, bottom: 24, width: 420, height: 24 };
  tooltip.refreshPosition();
  assert.equal(
    tooltip.popupElement.dataset.guiResolvedPlacement,
    "bottom",
    "Cross-axis overflow must not block a valid primary-axis flip",
  );
  assert.equal(tooltip.popupElement.style.left, "4px", "Oversized popup is clamped after placement resolution");
  tooltip.popupElement.rect = { left: 0, top: 0, right: 96, bottom: 24, width: 96, height: 24 };

  trigger.dispatch("focusin");
  trigger.dispatch("mouseleave");
  assert.deepEqual(changes, [true], "Leaving hover while focused keeps the tooltip requested open");
  trigger.dispatch("focusout");
  assert.deepEqual(changes, [true, false]);

  assert.equal(trigger.dispatch("keydown", { key: "Escape" }), true);
  assert.deepEqual(changes, [true, false, false], "Escape requests closure while controlled open state remains true");

  tooltip.update({ open: false, placement: "right", content: "Refresh now" });
  assert.equal(trigger.getAttribute("aria-describedby"), "existing-help");
  assert.equal(tooltip.contentElement.textContent, "Refresh now");
  assert.equal(tooltip.popupElement.dataset.guiResolvedPlacement, undefined);

  trigger.rect = { left: 292, top: 100, right: 316, bottom: 124, width: 24, height: 24 };
  tooltip.update({ open: true });
  assert.equal(tooltip.popupElement.dataset.guiResolvedPlacement, "left", "Right placement flips near the viewport edge");
  const left = Number.parseInt(tooltip.popupElement.style.left, 10);
  assert.ok(left >= 4 && left <= 220, "Resolved position stays clamped to the viewport");

  assert.throws(() => tooltip.update({ placement: "center" }), /Unknown GUI tooltip placement/);
  assert.throws(() => tooltip.update({ content: "" }), /content must be a non-empty string/);
  assert.throws(() => tooltip.update({ triggerElement: fakeDocument.createElement("button") }), /cannot be replaced/);

  tooltip.destroy();
  assert.equal(trigger.className, "icon-control");
  assert.equal(trigger.getAttribute("aria-describedby"), "existing-help");
  assert.equal(tooltip.element.removed, true);
  assert.equal(windowListeners.size, 0);

  console.log("Web Basic Tooltip vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
