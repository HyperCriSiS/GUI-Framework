// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["row-selection"]);
const sizes = new Set(["small", "medium", "large"]);

function choice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI data-grid ${label}: ${value}`);
  return value;
}
function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI data-grid ${key} must be a string`);
  return props[key];
}
function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI data-grid ${key} must be a boolean`);
  return props[key];
}
function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") throw new TypeError(`GUI data-grid ${key} must be a function or null`);
  return value;
}
function normalizeProps(props = {}) {
  return {
    value: optionalString(props, "value"),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    disabled: optionalBoolean(props, "disabled"),
    variant: choice(props.variant ?? "row-selection", variants, "variant"),
    size: choice(props.size ?? "medium", sizes, "size"),
    onValueChange: optionalCallback(props, "onValueChange"),
    onRowActivate: optionalCallback(props, "onRowActivate"),
  };
}
function normalizeRowProps(props = {}) {
  const value = optionalString(props, "value");
  if (value.trim() === "") throw new TypeError("GUI data-grid row value must be a non-empty string");
  return {
    value,
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    disabled: optionalBoolean(props, "disabled"),
  };
}
function normalizeCellProps(props = {}) {
  return { text: optionalString(props, "text"), accessibilityLabel: optionalString(props, "accessibilityLabel") };
}
function requireDocument(document, factory) {
  if (!document || typeof document.createElement !== "function") throw new TypeError(`${factory} requires a DOM Document-like object`);
}
function rowChildren(bodyElement) {
  return [...bodyElement.children].filter((child) => child?.dataset?.guiDataGridRow === "true");
}
function rowValue(row) { return row.dataset.guiDataGridValue ?? ""; }
function ownDisabled(row) { return row.dataset.guiDataGridDisabled === "true"; }
function closestRow(target, bodyElement) {
  let current = target;
  while (current && current !== bodyElement) {
    if (current.dataset?.guiDataGridRow === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}
function roleChildren(element, role) {
  return [...element.children].filter((child) => child?.getAttribute?.("role") === role);
}

export function createGuiDataGridColumnHeader(document, initialProps = {}) {
  requireDocument(document, "createGuiDataGridColumnHeader");
  const element = document.createElement("div");
  element.className = "gui-data-grid__column-header";
  element.setAttribute("role", "columnheader");
  let props = normalizeCellProps(initialProps);
  function render() {
    element.textContent = props.text;
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }
  render();
  return { element, update(nextProps = {}) { props = normalizeCellProps({ ...props, ...nextProps }); render(); }, destroy() {} };
}

export function createGuiDataGridCell(document, initialProps = {}) {
  requireDocument(document, "createGuiDataGridCell");
  const element = document.createElement("div");
  element.className = "gui-data-grid__cell";
  element.setAttribute("role", "gridcell");
  let props = normalizeCellProps(initialProps);
  function render() {
    element.textContent = props.text;
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }
  render();
  return { element, update(nextProps = {}) { props = normalizeCellProps({ ...props, ...nextProps }); render(); }, destroy() {} };
}

export function createGuiDataGridRow(document, initialProps = {}) {
  requireDocument(document, "createGuiDataGridRow");
  const element = document.createElement("div");
  element.className = "gui-data-grid__row";
  element.setAttribute("role", "row");
  const selectionIndicatorElement = document.createElement("span");
  selectionIndicatorElement.className = "gui-data-grid__selection-indicator";
  selectionIndicatorElement.setAttribute("aria-hidden", "true");
  element.append(selectionIndicatorElement);
  let props = normalizeRowProps(initialProps);
  function render() {
    element.dataset.guiDataGridRow = "true";
    element.dataset.guiDataGridValue = props.value;
    element.dataset.guiDataGridDisabled = props.disabled ? "true" : "false";
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }
  render();
  return {
    element,
    selectionIndicatorElement,
    update(nextProps = {}) { props = normalizeRowProps({ ...props, ...nextProps }); render(); },
    destroy() {},
  };
}

/**
 * Creates an ARIA row-selection grid. Rows form the roving-focus unit: arrows
 * move focus, Space requests controlled selection, and Enter/double-click
 * activates the focused row. Selection changes only after the host updates
 * value, matching the framework's controlled-state contract.
 */
export function createGuiDataGrid(document, initialProps = {}) {
  requireDocument(document, "createGuiDataGrid");
  const element = document.createElement("div");
  element.className = "gui-data-grid";
  element.setAttribute("role", "grid");
  const headerElement = document.createElement("div");
  headerElement.className = "gui-data-grid__header";
  headerElement.setAttribute("role", "row");
  const bodyElement = document.createElement("div");
  bodyElement.className = "gui-data-grid__body";
  bodyElement.setAttribute("role", "rowgroup");
  element.append(headerElement);
  element.append(bodyElement);

  let props = normalizeProps(initialProps);

  function effectiveDisabled(row) { return props.disabled || ownDisabled(row); }
  function enabledRows() { return rowChildren(bodyElement).filter((row) => !effectiveDisabled(row)); }
  function syncStructure() {
    const headers = roleChildren(headerElement, "columnheader");
    const rows = rowChildren(bodyElement);
    const inferredColumns = Math.max(headers.length, ...rows.map((row) => roleChildren(row, "gridcell").length), 1);
    element.style?.setProperty?.("--gui-data-grid-column-count", String(inferredColumns));
    element.setAttribute("aria-colcount", String(inferredColumns));
    element.setAttribute("aria-rowcount", String(rows.length + 1));
    headers.forEach((header, index) => header.setAttribute("aria-colindex", String(index + 1)));
    rows.forEach((row, rowIndex) => {
      row.setAttribute("aria-rowindex", String(rowIndex + 2));
      roleChildren(row, "gridcell").forEach((cell, columnIndex) => cell.setAttribute("aria-colindex", String(columnIndex + 1)));
    });
  }
  function syncRows() {
    const rows = rowChildren(bodyElement);
    const selected = rows.find((row) => rowValue(row) === props.value && !effectiveDisabled(row)) ?? null;
    const fallbackTabStop = enabledRows()[0] ?? null;
    const tabStop = selected ?? fallbackTabStop;
    for (const row of rows) {
      const disabled = effectiveDisabled(row);
      const isSelected = !disabled && rowValue(row) === props.value;
      row.tabIndex = !disabled && row === tabStop ? 0 : -1;
      row.setAttribute("tabindex", String(row.tabIndex));
      row.setAttribute("aria-disabled", disabled ? "true" : "false");
      row.setAttribute("aria-selected", isSelected ? "true" : "false");
      row.dataset.guiState = isSelected ? "selected" : "";
    }
  }
  function render() {
    element.dataset.guiComponent = "data-grid";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDisabled = props.disabled ? "true" : "false";
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    syncStructure();
    syncRows();
  }
  function requestSelection(row) {
    if (!row || effectiveDisabled(row)) return;
    const value = rowValue(row);
    if (value !== props.value) props.onValueChange?.(value);
  }
  function click(event) { requestSelection(closestRow(event.target, bodyElement)); }
  function doubleClick(event) {
    const row = closestRow(event.target, bodyElement);
    if (!row || effectiveDisabled(row)) return;
    requestSelection(row);
    props.onRowActivate?.(rowValue(row));
  }
  function keydown(event) {
    const row = closestRow(event.target, bodyElement);
    if (!row || effectiveDisabled(row)) return;
    const rows = enabledRows();
    const index = rows.indexOf(row);
    let target = null;
    if (event.key === "ArrowDown") target = rows[Math.min(index + 1, rows.length - 1)] ?? row;
    else if (event.key === "ArrowUp") target = rows[Math.max(index - 1, 0)] ?? row;
    else if (event.key === "Home") target = rows[0] ?? row;
    else if (event.key === "End") target = rows.at(-1) ?? row;
    if (target) {
      event.preventDefault?.();
      target.focus?.();
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault?.();
      requestSelection(row);
    } else if (event.key === "Enter") {
      event.preventDefault?.();
      props.onRowActivate?.(rowValue(row));
    }
  }

  bodyElement.addEventListener("click", click);
  bodyElement.addEventListener("dblclick", doubleClick);
  bodyElement.addEventListener("keydown", keydown);
  render();

  return {
    element,
    headerElement,
    bodyElement,
    update(nextProps = {}) { props = normalizeProps({ ...props, ...nextProps }); render(); },
    refreshRows() { render(); },
    destroy() {
      bodyElement.removeEventListener("click", click);
      bodyElement.removeEventListener("dblclick", doubleClick);
      bodyElement.removeEventListener("keydown", keydown);
    },
  };
}
