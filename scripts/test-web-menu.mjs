// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiMenu, createGuiMenuItem, createGuiMenuSeparator } from "../packages/adapter-web/src/menu.mjs";

const irPath = "build/spec-ir-menu-test.json";
const cssPath = "build/web/components-menu-test.css";

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
    this.disabled = false;
    this.tabIndex = 0;
    this.type = "";
    this.style = {};
    this.rect = { left: 40, top: 40, right: 100, bottom: 64, width: 60, height: 24 };
  }
  append(child) { child.parentNode = this; this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  getBoundingClientRect() { return this.rect; }
  focus() { this.ownerDocument.activeElement = this; }
  remove() { this.removed = true; }
  dispatch(type, { target = this, key = null, clientX = 0, clientY = 0 } = {}) {
    let prevented = false;
    this.listeners.get(type)?.({
      type,
      target,
      currentTarget: this,
      key,
      clientX,
      clientY,
      preventDefault() { prevented = true; },
    });
    return prevented;
  }
}

const windowListeners = new Map();
const fakeDocument = {
  activeElement: null,
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

  assert.match(css, /\.gui-menu \{/);
  assert.match(css, /\.gui-menu__popup \{/);
  assert.match(css, /\.gui-menu__popup\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.gui-menu__item \{/);
  assert.match(css, /\.gui-menu__item:where\(:hover:not\(:disabled\)\)/, "Menu hover state must target the interactive item, not the popup root");
  assert.match(css, /\.gui-menu__item:where\(:focus-visible\)/, "Menu focus state must target the interactive item");
  assert.match(css, /\.gui-menu__item:where\(:active:not\(:disabled\)\)/, "Menu pressed state must target the interactive item");
  assert.match(css, /\.gui-menu__item:where\(:disabled\)/, "Menu disabled state must target native disabled items");
  assert.match(css, /position: fixed;/);
  assert.match(css, /pointer-events: auto;/);
  assert.match(css, /\.gui-menu__separator \{/);
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const openChanges = [];
  const activations = [];
  const trigger = fakeDocument.createElement("button");
  trigger.className = "host-trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.rect = { left: 40, top: 40, right: 100, bottom: 64, width: 60, height: 24 };

  const menu = createGuiMenu(fakeDocument, {
    open: false,
    triggerElement: trigger,
    accessibilityLabel: "Workspace actions",
    size: "small",
    onOpenChange(open) { openChanges.push(open); },
    onActivate(value) { activations.push(value); },
  });
  menu.popupElement.rect = { left: 0, top: 0, right: 140, bottom: 100, width: 140, height: 100 };

  const reload = createGuiMenuItem(fakeDocument, { value: "reload", label: "Reload", shortcut: "Ctrl+R" });
  const disabled = createGuiMenuItem(fakeDocument, { value: "locked", label: "Locked", disabled: true });
  const settings = createGuiMenuItem(fakeDocument, { value: "settings", label: "Settings" });
  const separator = createGuiMenuSeparator(fakeDocument);
  menu.popupElement.append(reload.element);
  menu.popupElement.append(separator.element);
  menu.popupElement.append(disabled.element);
  menu.popupElement.append(settings.element);
  menu.refreshItems();

  assert.equal(menu.element.tagName, "SPAN");
  assert.equal(menu.element.dataset.guiComponent, "menu");
  assert.equal(menu.element.dataset.guiVariant, "standard");
  assert.equal(menu.element.dataset.guiSize, "small");
  assert.equal(menu.popupElement.getAttribute("role"), "menu");
  assert.equal(menu.popupElement.getAttribute("aria-label"), "Workspace actions");
  assert.equal(menu.popupElement.hidden, true);
  assert.equal(trigger.getAttribute("aria-haspopup"), "menu");
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.match(trigger.className, /\bgui-menu__trigger\b/);
  assert.equal(reload.element.getAttribute("role"), "menuitem");
  assert.equal(reload.labelElement.textContent, "Reload");
  assert.equal(reload.shortcutElement.textContent, "Ctrl+R");
  assert.equal(settings.shortcutElement.hidden, true);
  assert.equal(separator.element.getAttribute("role"), "separator");

  trigger.dispatch("click");
  assert.deepEqual(openChanges, [true]);
  assert.equal(menu.popupElement.hidden, true, "Trigger click only requests controlled open state");

  menu.update({ open: true });
  assert.equal(menu.popupElement.hidden, false);
  assert.equal(menu.element.dataset.guiState, "expanded");
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(menu.popupElement.dataset.guiResolvedPlacement, "bottom");
  assert.equal(menu.popupElement.style.left, "40px");
  assert.equal(menu.popupElement.style.top, "68px");
  assert.equal(fakeDocument.activeElement, reload.element, "Opening focuses the first enabled menuitem");
  assert.equal(reload.element.tabIndex, 0);
  assert.equal(disabled.element.tabIndex, -1);

  assert.equal(menu.popupElement.dispatch("keydown", { target: reload.element, key: "ArrowDown" }), true);
  assert.equal(fakeDocument.activeElement, settings.element, "ArrowDown skips disabled menuitems");
  assert.equal(menu.popupElement.dispatch("keydown", { target: settings.element, key: "ArrowDown" }), true);
  assert.equal(fakeDocument.activeElement, reload.element, "ArrowDown wraps");
  assert.equal(menu.popupElement.dispatch("keydown", { target: reload.element, key: "End" }), true);
  assert.equal(fakeDocument.activeElement, settings.element);
  assert.equal(menu.popupElement.dispatch("keydown", { target: settings.element, key: "Home" }), true);
  assert.equal(fakeDocument.activeElement, reload.element);

  assert.equal(menu.popupElement.dispatch("keydown", { target: reload.element, key: "Enter" }), true);
  assert.deepEqual(activations, ["reload"]);
  assert.deepEqual(openChanges, [true, false]);
  assert.equal(menu.popupElement.hidden, false, "Activation remains controlled until host closes the menu");
  menu.update({ open: false });
  assert.equal(fakeDocument.activeElement, trigger, "Controlled close after activation restores trigger focus");

  trigger.dispatch("contextmenu", { clientX: 300, clientY: 220 });
  assert.deepEqual(openChanges, [true, false, true]);
  menu.update({ open: true });
  assert.equal(menu.popupElement.dataset.guiResolvedPlacement, "context");
  assert.equal(menu.popupElement.style.left, "160px", "Context menu flips left when the pointer is near the right edge");
  assert.equal(menu.popupElement.style.top, "120px", "Context menu flips upward near the bottom edge");
  assert.equal(menu.popupElement.dispatch("keydown", { target: reload.element, key: "Escape" }), true);
  assert.deepEqual(openChanges, [true, false, true, false]);
  menu.update({ open: false });
  assert.equal(fakeDocument.activeElement, trigger, "Escape closure restores host trigger focus");

  menu.update({ disabled: true });
  trigger.dispatch("click");
  assert.deepEqual(openChanges, [true, false, true, false], "Disabled menu does not request opening");
  assert.equal(reload.element.disabled, true, "Menu-level disabled state disables all items");
  assert.equal(settings.element.disabled, true);
  menu.update({ disabled: false });
  assert.equal(reload.element.disabled, false);
  assert.equal(disabled.element.disabled, true, "Item-level disabled state survives menu-level disable toggles");

  assert.throws(() => menu.update({ size: "giant" }), /Unknown GUI menu size/);
  assert.throws(() => menu.update({ triggerElement: fakeDocument.createElement("button") }), /cannot be replaced/);
  assert.throws(() => createGuiMenuItem(fakeDocument, { value: "", label: "Bad" }), /value must be a non-empty string/);

  const detachedChanges = [];
  const detached = createGuiMenu(fakeDocument, {
    open: false,
    accessibilityLabel: "Canvas menu",
    onOpenChange(open) { detachedChanges.push(open); },
  });
  detached.popupElement.rect = { left: 0, top: 0, right: 100, bottom: 80, width: 100, height: 80 };
  detached.openAt(12, 18);
  assert.deepEqual(detachedChanges, [true]);
  detached.update({ open: true });
  assert.equal(detached.popupElement.dataset.guiResolvedPlacement, "context");
  assert.equal(detached.popupElement.style.left, "12px");
  assert.equal(detached.popupElement.style.top, "18px");
  assert.throws(() => detached.openAt(Number.NaN, 10), /context x must be a finite number/);
  detached.destroy();

  menu.destroy();
  assert.equal(trigger.className, "host-trigger");
  assert.equal(trigger.getAttribute("aria-haspopup"), "dialog", "Destroy restores pre-existing host ARIA state");
  assert.equal(trigger.getAttribute("aria-expanded"), null);
  assert.equal(trigger.getAttribute("aria-controls"), null);
  assert.equal(menu.element.removed, true);
  assert.equal(windowListeners.size, 0);

  console.log("Web Basic Menu / Context Menu vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
