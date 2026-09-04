// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import {
  createGuiTable,
  createGuiTableRow,
  createGuiTableHeaderCell,
  createGuiTableCell,
} from "../../packages/adapter-web/src/table.mjs";
import {
  createGuiDataGrid,
  createGuiDataGridRow,
  createGuiDataGridColumnHeader,
  createGuiDataGridCell,
} from "../../packages/adapter-web/src/data-grid.mjs";

const densities = new Set(["standard", "compact"]);
const columns = ["Project", "Owner", "Status"];
const records = [
  { value: "atlas", cells: ["Atlas", "Mira", "Ready"] },
  { value: "nova", cells: ["Nova", "Kai", "Review"] },
  { value: "archive", cells: ["Archive", "System", "Locked"], disabled: true },
];

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function populateTable(document, table) {
  const headerRow = createGuiTableRow(document);
  const headers = columns.map((text) => createGuiTableHeaderCell(document, { text }));
  headerRow.element.append(...headers.map((header) => header.element));
  table.headerElement.append(headerRow.element);

  const rows = records.map((record) => {
    const row = createGuiTableRow(document);
    const cells = record.cells.map((text) => createGuiTableCell(document, { text }));
    row.element.append(...cells.map((cell) => cell.element));
    table.bodyElement.append(row.element);
    return { row, cells };
  });
  return { headerRow, headers, rows };
}

function populateGrid(document, grid) {
  const headers = columns.map((text) => createGuiDataGridColumnHeader(document, { text }));
  grid.headerElement.append(...headers.map((header) => header.element));
  const rows = records.map((record) => {
    const row = createGuiDataGridRow(document, {
      value: record.value,
      accessibilityLabel: `${record.cells[0]} project row`,
      disabled: record.disabled ?? false,
    });
    const cells = record.cells.map((text) => createGuiDataGridCell(document, { text }));
    row.element.append(...cells.map((cell) => cell.element));
    grid.bodyElement.append(row.element);
    return { row, cells };
  });
  grid.refreshRows();
  return { headers, rows };
}

export function mountTableReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountTableReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountTableReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Table reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";
  let value = "atlas";
  let disabled = false;
  let activated = "none";

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Table / Data Grid"),
    element(document, "h1", "", "Structured data"),
    element(document, "p", "gui-reference__lead", "Table remains passive native structure; Data Grid adds controlled row selection, focus navigation and activation without inventing spreadsheet semantics."),
  );

  const field = element(document, "div", "gui-reference__field");
  const table = createGuiTable(document, {
    caption: "Project inventory",
    accessibilityLabel: "Project inventory table",
    variant: "gridlined",
    size: componentSize,
  });
  const tableParts = populateTable(document, table);

  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  function renderStatus() {
    status.textContent = `Selected row: ${value} · activated: ${activated} · ${disabled ? "grid disabled" : "grid enabled"}`;
  }
  function setValue(nextValue) {
    value = nextValue;
    grid.update({ value });
    renderStatus();
  }

  const grid = createGuiDataGrid(document, {
    value,
    accessibilityLabel: "Project selection grid",
    size: componentSize,
    onValueChange: setValue,
    onRowActivate(nextValue) {
      activated = nextValue;
      renderStatus();
    },
  });
  const gridParts = populateGrid(document, grid);

  const controls = element(document, "div", "gui-reference__actions");
  const toggleDisabledButton = createGuiButton(document, {
    label: "Disable grid",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      disabled = !disabled;
      grid.update({ disabled });
      toggleDisabledButton.update({ label: disabled ? "Enable grid" : "Disable grid" });
      renderStatus();
    },
  });
  const resetButton = createGuiButton(document, {
    label: "Select Atlas",
    variant: "secondary",
    size: componentSize,
    onActivate() { setValue("atlas"); },
  });

  renderStatus();
  controls.append(toggleDisabledButton.element, resetButton.element);
  field.append(
    table.element,
    element(document, "p", "gui-reference__hint", "Passive native table · no selection behavior"),
    grid.element,
    element(document, "p", "gui-reference__hint", "Controlled row-selection grid · Archive is disabled · Arrow Up/Down/Home/End move focus · Space selects · Enter activates"),
    controls,
    status,
  );
  surface.append(header, field);
  root.append(surface);

  return {
    table,
    grid,
    tableParts,
    gridParts,
    toggleDisabledButton,
    resetButton,
    getState() { return { density, value, disabled, activated }; },
    destroy() {
      table.destroy();
      grid.destroy();
      toggleDisabledButton.destroy();
      resetButton.destroy();
      root.replaceChildren();
      delete root.dataset.guiTheme;
      delete root.dataset.guiPalette;
      delete root.dataset.guiHostContext;
      delete root.dataset.guiDensity;
      root.className = "";
    },
  };
}

if (typeof document !== "undefined") {
  const root = document.querySelector?.("#gui-table-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountTableReference(document, root, { density: query.get("density") ?? "standard" });
  }
}
