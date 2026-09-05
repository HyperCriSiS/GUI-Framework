// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiTree, createGuiTreeItem } from "../packages/adapter-web/src/tree.mjs";

const irPath = "build/spec-ir-tree-test.json";
const cssPath = "build/web/components-tree-test.css";
function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}
run(["packages/compiler/src/index.mjs", "--output", irPath], "Specification compiler");
run(["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath], "Web component CSS generator");
const css = await readFile(cssPath, "utf8");
assert.match(css, /\.gui-tree \{/);
assert.match(css, /\.gui-tree__node \{ outline: none; \}/);
assert.match(css, /\.gui-tree__group\[hidden\] \{ display: none; \}/);
assert.match(css, /\.gui-tree__node:where\(\[aria-selected="true"\]\) > \.gui-tree__item/);
assert.match(css, /\.gui-tree__node:where\(\[aria-expanded="true"\]\) > \.gui-tree__item > \.gui-tree__disclosure/);
assert.match(css, /\.gui-tree__node:where\(:focus-visible:not\(\[aria-disabled="true"\]\)\) > \.gui-tree__item/);
assert.match(css, /\.gui-tree__node:where\(\[aria-disabled="true"\]\) > \.gui-tree__item/);
assert.doesNotMatch(css, /\.gui-tree__node:where\(\[aria-selected="true"\]\) \.gui-tree__item/, "Selected parent styling must not bleed into descendant rows");
assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

class FakeElement {
  constructor(document, tagName) {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.tabIndex = -1;
    this.textContent = "";
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
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    let current = this;
    while (current) {
      event.currentTarget = current;
      for (const callback of current.listeners.get(event.type) ?? []) callback(event);
      if (event.cancelBubble) break;
      current = current.parentNode;
    }
    return true;
  }
  focus() {
    this.ownerDocument.activeElement = this;
    this.dispatchEvent({ type: "focusin", target: this });
  }
}

class FakeDocument {
  constructor() { this.activeElement = null; }
  createElement(tagName) { return new FakeElement(this, tagName); }
}

function dispatch(target, type, extra = {}) {
  const event = {
    type,
    target,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    ...extra,
  };
  target.dispatchEvent(event);
  return event;
}

const document = new FakeDocument();
const valueChanges = [];
const expandedChanges = [];
const activations = [];
const tree = createGuiTree(document, {
  value: "projects",
  accessibilityLabel: "Workspace hierarchy",
  onValueChange: (value) => valueChanges.push(value),
  onExpandedChange: (value) => expandedChanges.push(value),
  onNodeActivate: (value) => activations.push(value),
});
const projects = createGuiTreeItem(document, { value: "projects", label: "Projects", icon: "P", expanded: true, branch: true });
const atlas = createGuiTreeItem(document, { value: "atlas", label: "Atlas" });
const archive = createGuiTreeItem(document, { value: "archive", label: "Archive", disabled: true });
const settings = createGuiTreeItem(document, { value: "settings", label: "Settings" });
projects.groupElement.append(atlas.element, archive.element);
tree.element.append(projects.element, settings.element);
tree.refreshItems();

assert.equal(tree.element.getAttribute("role"), "tree");
assert.equal(tree.element.getAttribute("aria-label"), "Workspace hierarchy");
assert.equal(projects.element.getAttribute("role"), "treeitem");
assert.equal(projects.groupElement.getAttribute("role"), "group");
assert.equal(projects.element.getAttribute("aria-expanded"), "true");
assert.equal(projects.element.getAttribute("aria-selected"), "true");
assert.equal(projects.element.tabIndex, 0);
assert.equal(atlas.element.tabIndex, -1);
assert.equal(archive.element.getAttribute("aria-disabled"), "true");
assert.equal(projects.disclosureElement.dataset.guiTreePlaceholder, "false");
assert.equal(atlas.disclosureElement.dataset.guiTreePlaceholder, "true");

// Pointer selection is controlled: callback first, visual state only after host update.
dispatch(atlas.labelElement, "click");
assert.deepEqual(valueChanges, ["atlas"]);
assert.equal(projects.element.getAttribute("aria-selected"), "true");
assert.equal(atlas.element.getAttribute("aria-selected"), "false");
tree.update({ value: "atlas" });
assert.equal(projects.element.getAttribute("aria-selected"), "false");
assert.equal(atlas.element.getAttribute("aria-selected"), "true");
assert.equal(atlas.element.tabIndex, 0);

// Disclosure is expansion-only and remains controlled.
dispatch(projects.disclosureElement, "click");
assert.deepEqual(expandedChanges, ["projects"]);
assert.equal(projects.element.getAttribute("aria-expanded"), "true");
projects.update({ expanded: false });
tree.refreshItems();
assert.equal(projects.element.getAttribute("aria-expanded"), "false");
assert.equal(projects.groupElement.hidden, true);
assert.equal(atlas.element.tabIndex, -1);

// Right requests expansion on a closed branch; once open it moves to the first enabled child.
projects.element.focus();
let event = dispatch(projects.element, "keydown", { key: "ArrowRight" });
assert.equal(event.defaultPrevented, true);
assert.deepEqual(expandedChanges, ["projects", "projects"]);
projects.update({ expanded: true });
tree.refreshItems();
dispatch(projects.element, "keydown", { key: "ArrowRight" });
assert.equal(document.activeElement, atlas.element);

// Left from a child returns to its parent; Down skips disabled nodes; Home/End are visible-order based.
dispatch(atlas.element, "keydown", { key: "ArrowLeft" });
assert.equal(document.activeElement, projects.element);
dispatch(projects.element, "keydown", { key: "ArrowDown" });
assert.equal(document.activeElement, atlas.element);
dispatch(atlas.element, "keydown", { key: "ArrowDown" });
assert.equal(document.activeElement, settings.element);
dispatch(settings.element, "keydown", { key: "Home" });
assert.equal(document.activeElement, projects.element);
dispatch(projects.element, "keydown", { key: "End" });
assert.equal(document.activeElement, settings.element);

// Space requests selection, Enter and double-click activate, disabled nodes are inert.
dispatch(settings.element, "keydown", { key: " " });
assert.equal(valueChanges.at(-1), "settings");
dispatch(settings.element, "keydown", { key: "Enter" });
assert.deepEqual(activations, ["settings"]);
dispatch(atlas.labelElement, "dblclick");
assert.deepEqual(activations, ["settings", "atlas"]);
const beforeDisabled = valueChanges.length;
dispatch(archive.labelElement, "click");
assert.equal(valueChanges.length, beforeDisabled);

// Group-level disabled state removes all nodes from the roving tab stop.
tree.update({ disabled: true });
assert.equal(tree.element.getAttribute("aria-disabled"), "true");
assert.equal(projects.element.getAttribute("aria-disabled"), "true");
assert.equal(atlas.element.getAttribute("aria-disabled"), "true");
assert.equal(settings.element.tabIndex, -1);

tree.destroy();
await rm(irPath, { force: true });
await rm(cssPath, { force: true });
console.log("Native Web Tree / Hierarchy adapter and generated CSS tests passed.");
