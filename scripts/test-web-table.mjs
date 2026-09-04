// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createGuiTable, createGuiTableRow, createGuiTableHeaderCell, createGuiTableCell } from "../packages/adapter-web/src/table.mjs";
import { createGuiDataGrid, createGuiDataGridRow, createGuiDataGridColumnHeader, createGuiDataGridCell } from "../packages/adapter-web/src/data-grid.mjs";

const irPath = "build/spec-ir-table-test.json";
const cssPath = "build/web/components-table-test.css";

function run(args, label) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout}\n${result.stderr}`);
}

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) ?? ""; }
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
    this.hidden = false;
    this.className = "";
    this.textContent = "";
    this.tabIndex = -1;
    this.style = new FakeStyle();
  }
  append(child) { child.parentNode = this; this.children.push(child); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  focus() { this.ownerDocument.activeElement = this; }
  dispatch(type, init = {}) {
    let prevented = false;
    const event = {
      type,
      target: init.target ?? this,
      currentTarget: this,
      key: init.key,
      preventDefault() { prevented = true; },
    };
    this.listeners.get(type)?.(event);
    return { prevented };
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

  assert.match(css, /\.gui-table \{/);
  assert.match(css, /\.gui-table__caption/);
  assert.match(css, /\.gui-table__header-cell/);
  assert.match(css, /\.gui-table__cell/);
  assert.match(css, /\.gui-table:where\(\[data-gui-variant="plain"\]\) \.gui-table__header-cell/);
  assert.match(css, /\.gui-table:where\(\[data-gui-variant="gridlined"\]\) \.gui-table__cell:not\(:first-child\)/);
  assert.match(css, /\.gui-data-grid \{/);
  assert.match(css, /\.gui-data-grid__row \{/);
  assert.match(css, /grid-template-columns: repeat\(var\(--gui-data-grid-column-count, 1\), minmax\(0, 1fr\)\)/);
  assert.match(css, /\.gui-data-grid__row:where\(:hover:not\(\[aria-disabled="true"\]\)\)/);
  assert.match(css, /\.gui-data-grid__row:where\(:focus-visible:not\(\[aria-disabled="true"\]\)\)/);
  assert.match(css, /\.gui-data-grid__row:where\(\[aria-selected="true"\]\)/);
  assert.match(css, /\.gui-data-grid__row:where\(\[aria-selected="true"\]\) \.gui-data-grid__selection-indicator/);
  assert.match(css, /\.gui-data-grid:where\(\[aria-disabled="true"\]\)/);
  assert.doesNotMatch(css, /\.gui-data-grid:where\(:hover[^)]*\) \.gui-data-grid__row/, "Data Grid hover must be row-scoped");
  assert.doesNotMatch(css, /data-gui-palette|reference-dark|reference-light/);
  assert.doesNotMatch(css, /\{[A-Za-z0-9_.-]+\}/);

  const table = createGuiTable(fakeDocument, {
    caption: "Build status",
    accessibilityLabel: "Build status table",
    variant: "gridlined",
    size: "small",
  });
  const headerRow = createGuiTableRow(fakeDocument);
  const projectHeader = createGuiTableHeaderCell(fakeDocument, { text: "Project" });
  const statusHeader = createGuiTableHeaderCell(fakeDocument, { text: "Status", accessibilityLabel: "Current status" });
  headerRow.element.append(projectHeader.element);
  headerRow.element.append(statusHeader.element);
  table.headerElement.append(headerRow.element);
  const bodyRow = createGuiTableRow(fakeDocument);
  const projectCell = createGuiTableCell(fakeDocument, { text: "Observatory" });
  const statusCell = createGuiTableCell(fakeDocument, { text: "Ready" });
  bodyRow.element.append(projectCell.element);
  bodyRow.element.append(statusCell.element);
  table.bodyElement.append(bodyRow.element);

  assert.equal(table.element.tagName, "TABLE");
  assert.equal(table.captionElement.tagName, "CAPTION");
  assert.equal(table.headerElement.tagName, "THEAD");
  assert.equal(table.bodyElement.tagName, "TBODY");
  assert.equal(headerRow.element.tagName, "TR");
  assert.equal(projectHeader.element.tagName, "TH");
  assert.equal(projectHeader.element.getAttribute("scope"), "col");
  assert.equal(statusHeader.element.getAttribute("aria-label"), "Current status");
  assert.equal(projectCell.element.tagName, "TD");
  assert.equal(table.element.dataset.guiVariant, "gridlined");
  assert.equal(table.element.dataset.guiSize, "small");
  assert.equal(table.element.getAttribute("aria-label"), "Build status table");
  assert.equal(table.captionElement.hidden, false);
  table.update({ caption: "", accessibilityLabel: "", variant: "plain", size: "large" });
  assert.equal(table.captionElement.hidden, true);
  assert.equal(table.element.getAttribute("aria-label"), null);
  assert.equal(table.element.dataset.guiVariant, "plain");
  assert.equal(table.element.dataset.guiSize, "large");
  assert.throws(() => table.update({ variant: "spreadsheet" }), /Unknown GUI table variant/);
  assert.throws(() => projectHeader.update({ scope: "invalid" }), /Unknown GUI table header scope/);

  const changes = [];
  const activations = [];
  const grid = createGuiDataGrid(fakeDocument, {
    value: "one",
    accessibilityLabel: "Deployments",
    size: "small",
    onValueChange(value) { changes.push(value); },
    onRowActivate(value) { activations.push(value); },
  });
  const nameHeader = createGuiDataGridColumnHeader(fakeDocument, { text: "Name" });
  const stateHeader = createGuiDataGridColumnHeader(fakeDocument, { text: "State" });
  grid.headerElement.append(nameHeader.element);
  grid.headerElement.append(stateHeader.element);

  const one = createGuiDataGridRow(fakeDocument, { value: "one", accessibilityLabel: "Deployment one" });
  const oneName = createGuiDataGridCell(fakeDocument, { text: "One" });
  const oneState = createGuiDataGridCell(fakeDocument, { text: "Ready" });
  one.element.append(oneName.element);
  one.element.append(oneState.element);
  const two = createGuiDataGridRow(fakeDocument, { value: "two" });
  const twoName = createGuiDataGridCell(fakeDocument, { text: "Two" });
  const twoState = createGuiDataGridCell(fakeDocument, { text: "Pending" });
  two.element.append(twoName.element);
  two.element.append(twoState.element);
  const locked = createGuiDataGridRow(fakeDocument, { value: "locked", disabled: true });
  locked.element.append(createGuiDataGridCell(fakeDocument, { text: "Locked" }).element);
  locked.element.append(createGuiDataGridCell(fakeDocument, { text: "Blocked" }).element);
  grid.bodyElement.append(one.element);
  grid.bodyElement.append(two.element);
  grid.bodyElement.append(locked.element);
  grid.refreshRows();

  assert.equal(grid.element.getAttribute("role"), "grid");
  assert.equal(grid.headerElement.getAttribute("role"), "row");
  assert.equal(grid.bodyElement.getAttribute("role"), "rowgroup");
  assert.equal(nameHeader.element.getAttribute("role"), "columnheader");
  assert.equal(one.element.getAttribute("role"), "row");
  assert.equal(oneName.element.getAttribute("role"), "gridcell");
  assert.equal(grid.element.getAttribute("aria-label"), "Deployments");
  assert.equal(grid.element.getAttribute("aria-colcount"), "2");
  assert.equal(grid.element.getAttribute("aria-rowcount"), "4");
  assert.equal(grid.style, undefined);
  assert.equal(grid.element.style.getPropertyValue("--gui-data-grid-column-count"), "2");
  assert.equal(nameHeader.element.getAttribute("aria-colindex"), "1");
  assert.equal(stateHeader.element.getAttribute("aria-colindex"), "2");
  assert.equal(one.element.getAttribute("aria-rowindex"), "2");
  assert.equal(two.element.getAttribute("aria-rowindex"), "3");
  assert.equal(oneName.element.getAttribute("aria-colindex"), "1");
  assert.equal(one.getAttribute, undefined);
  assert.equal(one.element.getAttribute("aria-selected"), "true");
  assert.equal(one.element.tabIndex, 0);
  assert.equal(two.element.getAttribute("aria-selected"), "false");
  assert.equal(two.element.tabIndex, -1);
  assert.equal(locked.element.getAttribute("aria-disabled"), "true");
  assert.equal(locked.element.tabIndex, -1);
  assert.equal(one.selectionIndicatorElement.getAttribute("aria-hidden"), "true");

  grid.bodyElement.dispatch("click", { target: twoName.element });
  assert.deepEqual(changes, ["two"]);
  assert.equal(two.element.getAttribute("aria-selected"), "false", "Selection remains controlled until host update");
  grid.update({ value: "two" });
  assert.equal(two.element.getAttribute("aria-selected"), "true");
  assert.equal(two.element.tabIndex, 0);
  assert.equal(one.element.tabIndex, -1);

  const up = grid.bodyElement.dispatch("keydown", { target: twoName.element, key: "ArrowUp" });
  assert.equal(up.prevented, true);
  assert.equal(fakeDocument.activeElement, one.element);
  assert.deepEqual(changes, ["two"], "Arrow navigation changes focus, not controlled selection");
  const select = grid.bodyElement.dispatch("keydown", { target: oneState.element, key: " " });
  assert.equal(select.prevented, true);
  assert.deepEqual(changes, ["two", "one"]);
  assert.equal(two.element.getAttribute("aria-selected"), "true");
  const activate = grid.bodyElement.dispatch("keydown", { target: oneName.element, key: "Enter" });
  assert.equal(activate.prevented, true);
  assert.deepEqual(activations, ["one"]);
  grid.bodyElement.dispatch("dblclick", { target: twoState.element });
  assert.deepEqual(activations, ["one", "two"]);
  grid.bodyElement.dispatch("click", { target: locked.element });
  grid.bodyElement.dispatch("dblclick", { target: locked.element });
  assert.deepEqual(changes, ["two", "one"]);
  assert.deepEqual(activations, ["one", "two"]);

  grid.update({ disabled: true });
  assert.equal(grid.element.getAttribute("aria-disabled"), "true");
  assert.equal(one.element.tabIndex, -1);
  assert.equal(two.element.tabIndex, -1);
  grid.bodyElement.dispatch("click", { target: one.element });
  assert.deepEqual(changes, ["two", "one"]);
  grid.update({ disabled: false, value: "one", accessibilityLabel: "" });
  assert.equal(grid.element.getAttribute("aria-label"), null);
  assert.equal(one.element.tabIndex, 0);
  assert.equal(locked.element.getAttribute("aria-disabled"), "true", "Own row disabled state survives group re-enable");
  assert.throws(() => grid.update({ size: "tiny" }), /Unknown GUI data-grid size/);
  assert.throws(() => createGuiDataGridRow(fakeDocument, { value: "" }), /non-empty string/);

  grid.destroy();
  table.destroy();
  console.log("Web Basic Table / Data Grid vertical-slice tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
