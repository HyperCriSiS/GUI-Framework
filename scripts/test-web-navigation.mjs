// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiNavigation, createGuiNavigationItem } from "../packages/adapter-web/src/navigation.mjs";

const irPath = "build/spec-ir-navigation-test.json";
const cssPath = "build/web/components-navigation-test.css";

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
    this.disabled = false;
    this.hidden = false;
    this.className = "";
    this.type = "";
    this.textContent = "";
  }
  append(child) { child.parentNode = this; this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  dispatch(type, target = this) { this.listeners.get(type)?.({ type, target, currentTarget: this }); }
}
const fakeDocument = { createElement(tagName) { return new FakeElement(tagName, this); } };

try {
  run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
  run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.gui-navigation \{/);
  assert.match(css, /\.gui-navigation__list \{/);
  assert.match(css, /\.gui-navigation__item \{/);
  assert.match(css, /\.gui-navigation__icon/);
  assert.match(css, /\.gui-navigation__label/);
  assert.match(css, /\.gui-navigation__indicator/);
  assert.match(css, /\.gui-navigation:where\(\[data-gui-variant="horizontal"\]\) \.gui-navigation__list \{ flex-direction: row; \}/);
  assert.match(css, /\.gui-navigation:where\(\[data-gui-variant="vertical"\]\) \.gui-navigation__list \{ flex-direction: column; \}/);
  assert.match(css, /\.gui-navigation__item:where\(:hover:not\(:disabled\)\)/);
  assert.match(css, /\.gui-navigation__item:where\(:focus-visible\)/);
  assert.match(css, /\.gui-navigation__item:where\(\[aria-current="page"\]\)/);
  assert.match(css, /\.gui-navigation__item:where\(\[aria-current="page"\]\) \.gui-navigation__indicator/);
  assert.match(css, /\.gui-navigation__item:where\(:disabled\)/);
  assert.match(css, /\.gui-navigation__item\[aria-current="page"\] \.gui-navigation__indicator \{ visibility: visible; \}/);
  assert.doesNotMatch(css, /\.gui-navigation:where\(:hover[^)]*\) \.gui-navigation__item/, "Navigation hover styling must be scoped to the interactive item");
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const changes = [];
  const navigation = createGuiNavigation(fakeDocument, {
    value: "home",
    accessibilityLabel: "Primary navigation",
    size: "large",
    onValueChange(value) { changes.push(value); },
  });
  const home = createGuiNavigationItem(fakeDocument, { value: "home", label: "Home", icon: "H" });
  const search = createGuiNavigationItem(fakeDocument, { value: "search", label: "Search" });
  const settings = createGuiNavigationItem(fakeDocument, { value: "settings", icon: "S", accessibilityLabel: "Settings", disabled: true });

  navigation.listElement.append(home.element);
  navigation.listElement.append(search.element);
  navigation.listElement.append(settings.element);
  navigation.refreshItems();

  assert.equal(navigation.element.tagName, "NAV");
  assert.equal(navigation.element.dataset.guiComponent, "navigation");
  assert.equal(navigation.element.dataset.guiVariant, "horizontal");
  assert.equal(navigation.element.dataset.guiSize, "large");
  assert.equal(navigation.element.getAttribute("aria-label"), "Primary navigation");
  assert.equal(home.element.tagName, "BUTTON");
  assert.equal(home.element.getAttribute("aria-current"), "page");
  assert.equal(search.element.getAttribute("aria-current"), null);
  assert.equal(settings.element.disabled, true);
  assert.equal(settings.labelElement.hidden, true);
  assert.equal(settings.element.getAttribute("aria-label"), "Settings");
  assert.equal(home.iconElement.getAttribute("aria-hidden"), "true");
  assert.equal(home.indicatorElement.getAttribute("aria-hidden"), "true");

  navigation.listElement.dispatch("click", search.labelElement);
  assert.deepEqual(changes, ["search"]);
  assert.equal(search.element.getAttribute("aria-current"), null, "Selection remains controlled until the host updates value");

  navigation.update({ value: "search", variant: "vertical" });
  assert.equal(navigation.element.dataset.guiVariant, "vertical");
  assert.equal(search.element.getAttribute("aria-current"), "page");
  assert.equal(search.element.dataset.guiState, "selected");
  assert.equal(home.element.getAttribute("aria-current"), null);

  navigation.listElement.dispatch("click", settings.iconElement);
  assert.deepEqual(changes, ["search"], "Disabled navigation items ignore delegated activation");

  navigation.update({ disabled: true });
  assert.equal(home.element.disabled, true);
  assert.equal(search.element.disabled, true);
  navigation.listElement.dispatch("click", home.labelElement);
  assert.deepEqual(changes, ["search"]);

  navigation.update({ disabled: false, accessibilityLabel: "" });
  assert.equal(navigation.element.getAttribute("aria-label"), null);
  assert.equal(home.element.disabled, false);
  assert.equal(settings.element.disabled, true, "Own disabled state survives group re-enable");
  assert.throws(() => navigation.update({ value: 1 }), /value must be a string/);
  assert.throws(() => navigation.update({ variant: "diagonal" }), /Unknown GUI navigation variant/);
  assert.throws(() => createGuiNavigationItem(fakeDocument, { value: "empty" }), /requires a label or accessibilityLabel/);

  settings.destroy();
  search.destroy();
  home.destroy();
  navigation.destroy();
  console.log("Web Basic Navigation vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
