// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiTab, createGuiTabs } from "../packages/adapter-web/src/tabs.mjs";

const irPath = "build/spec-ir-tabs-test.json";
const cssPath = "build/web/components-tabs-test.css";

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
    this.tabIndex = 0;
    this.id = "";
  }
  append(child) {
    child.parentNode = this;
    this.children.push(child);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  focus() { this.ownerDocument.activeElement = this; }
  dispatch(type, target = this, key = null) {
    let prevented = false;
    this.listeners.get(type)?.({
      type,
      target,
      currentTarget: this,
      key,
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

  assert.match(css, /\.gui-tabs \{/);
  assert.match(css, /\.gui-tabs__tab-list \{/);
  assert.match(css, /\.gui-tabs__tab \{/);
  assert.match(css, /\.gui-tabs__indicator \{/);
  assert.match(css, /\.gui-tabs__panel \{/);
  assert.match(css, /\.gui-tabs__tab:where\(:hover:not\(:disabled\)\)/);
  assert.match(css, /\.gui-tabs__tab:where\(:focus-visible\)/);
  assert.match(css, /\.gui-tabs__tab:where\(\[aria-selected="true"\]\)/);
  assert.match(css, /\.gui-tabs__tab:where\(\[aria-selected="true"\]\) \.gui-tabs__indicator/);
  assert.match(css, /\.gui-tabs__tab:where\(:disabled\)/);
  assert.match(css, /visibility: hidden;/);
  assert.match(css, /\.gui-tabs__tab\[aria-selected="true"\] \.gui-tabs__indicator \{ visibility: visible; \}/);
  assert.doesNotMatch(css, /\.gui-tabs:where\(:hover[^)]*\) \.gui-tabs__tab/, "Tabs hover styling must be scoped to the interactive tab");
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const changes = [];
  const tabs = createGuiTabs(fakeDocument, {
    value: "overview",
    accessibilityLabel: "Project sections",
    size: "large",
    onValueChange(value) { changes.push(value); },
  });
  const overview = createGuiTab(fakeDocument, { value: "overview", label: "Overview" });
  const metrics = createGuiTab(fakeDocument, { value: "metrics", label: "Metrics", disabled: true });
  const logs = createGuiTab(fakeDocument, { value: "logs", label: "Logs" });

  tabs.tabListElement.append(overview.element);
  tabs.tabListElement.append(metrics.element);
  tabs.tabListElement.append(logs.element);
  tabs.refreshTabs();

  assert.equal(tabs.element.tagName, "DIV");
  assert.equal(tabs.element.dataset.guiComponent, "tabs");
  assert.equal(tabs.tabListElement.getAttribute("role"), "tablist");
  assert.equal(tabs.tabListElement.getAttribute("aria-orientation"), "horizontal");
  assert.equal(tabs.tabListElement.getAttribute("aria-label"), "Project sections");
  assert.equal(tabs.panelElement.getAttribute("role"), "tabpanel");
  assert.equal(overview.element.getAttribute("role"), "tab");
  assert.equal(overview.element.getAttribute("aria-selected"), "true");
  assert.equal(overview.element.tabIndex, 0);
  assert.equal(metrics.element.tabIndex, -1);
  assert.equal(metrics.element.disabled, true);
  assert.equal(logs.element.tabIndex, -1);
  assert.equal(tabs.panelElement.getAttribute("aria-labelledby"), overview.element.id);
  assert.equal(tabs.panelElement.dataset.guiTabsValue, "overview");

  assert.equal(tabs.tabListElement.dispatch("keydown", overview.element, "ArrowRight"), true);
  assert.equal(fakeDocument.activeElement, logs.element, "Roving focus skips disabled tabs and wraps across enabled tabs");
  assert.equal(logs.element.tabIndex, 0);
  assert.equal(overview.element.tabIndex, -1);
  assert.deepEqual(changes, [], "Arrow navigation must not activate panels in manual activation mode");
  assert.equal(overview.element.getAttribute("aria-selected"), "true", "Selection remains controlled while focus moves");

  assert.equal(tabs.tabListElement.dispatch("keydown", logs.element, "Enter"), true);
  assert.deepEqual(changes, ["logs"]);
  assert.equal(logs.element.getAttribute("aria-selected"), "false", "Host must update the controlled value");

  tabs.update({ value: "logs" });
  assert.equal(logs.element.getAttribute("aria-selected"), "true");
  assert.equal(logs.element.dataset.guiState, "selected");
  assert.equal(tabs.panelElement.getAttribute("aria-labelledby"), logs.element.id);
  assert.equal(tabs.panelElement.dataset.guiTabsValue, "logs");

  assert.equal(tabs.tabListElement.dispatch("keydown", logs.element, "Home"), true);
  assert.equal(fakeDocument.activeElement, overview.element);
  assert.equal(tabs.tabListElement.dispatch("keydown", overview.element, " "), true);
  assert.deepEqual(changes, ["logs", "overview"]);

  const metricsLabel = metrics.element.children[0];
  tabs.tabListElement.dispatch("click", metricsLabel);
  assert.deepEqual(changes, ["logs", "overview"], "Disabled tabs ignore pointer activation");

  tabs.tabListElement.dispatch("click", overview.element.children[0]);
  assert.deepEqual(changes, ["logs", "overview", "overview"], "Delegated clicks may originate from tab label descendants");

  tabs.update({ disabled: true });
  assert.equal(overview.element.disabled, true);
  assert.equal(logs.element.disabled, true);
  assert.equal(overview.element.tabIndex, -1);
  tabs.tabListElement.dispatch("click", logs.element);
  assert.deepEqual(changes, ["logs", "overview", "overview"]);

  tabs.update({ disabled: false, accessibilityLabel: "" });
  assert.equal(tabs.tabListElement.getAttribute("aria-label"), null);
  assert.equal(logs.element.disabled, false);
  assert.throws(() => tabs.update({ value: 1 }), /value must be a string/);
  assert.throws(() => overview.update({ label: "" }), /label must be a non-empty string/);

  logs.destroy();
  metrics.destroy();
  overview.destroy();
  tabs.destroy();
  console.log("Web Basic Tabs vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
