// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["plain", "gridlined"]);
const sizes = new Set(["small", "medium", "large"]);
const headerScopes = new Set(["col", "row", "colgroup", "rowgroup"]);

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI table ${key} must be a string`);
  return props[key];
}
function choice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI table ${label}: ${value}`);
  return value;
}
function normalizeProps(props = {}) {
  return {
    caption: optionalString(props, "caption"),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    variant: choice(props.variant ?? "plain", variants, "variant"),
    size: choice(props.size ?? "medium", sizes, "size"),
  };
}
function normalizeCellProps(props = {}, header = false) {
  const normalized = {
    text: optionalString(props, "text"),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
  };
  if (header) normalized.scope = choice(props.scope ?? "col", headerScopes, "header scope");
  return normalized;
}
function requireDocument(document, factory) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError(`${factory} requires a DOM Document-like object`);
  }
}

export function createGuiTableRow(document) {
  requireDocument(document, "createGuiTableRow");
  const element = document.createElement("tr");
  element.className = "gui-table__row";
  return { element, destroy() {} };
}

export function createGuiTableHeaderCell(document, initialProps = {}) {
  requireDocument(document, "createGuiTableHeaderCell");
  const element = document.createElement("th");
  element.className = "gui-table__header-cell";
  let props = normalizeCellProps(initialProps, true);
  function render() {
    element.textContent = props.text;
    element.scope = props.scope;
    element.setAttribute("scope", props.scope);
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }
  render();
  return {
    element,
    update(nextProps = {}) { props = normalizeCellProps({ ...props, ...nextProps }, true); render(); },
    destroy() {},
  };
}

export function createGuiTableCell(document, initialProps = {}) {
  requireDocument(document, "createGuiTableCell");
  const element = document.createElement("td");
  element.className = "gui-table__cell";
  let props = normalizeCellProps(initialProps, false);
  function render() {
    element.textContent = props.text;
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }
  render();
  return {
    element,
    update(nextProps = {}) { props = normalizeCellProps({ ...props, ...nextProps }, false); render(); },
    destroy() {},
  };
}

/**
 * Creates a passive native HTML table. The adapter deliberately leaves row
 * and cell composition to the host through the compound helpers above rather
 * than inventing a renderer-specific data model outside the neutral contract.
 */
export function createGuiTable(document, initialProps = {}) {
  requireDocument(document, "createGuiTable");
  const element = document.createElement("table");
  element.className = "gui-table";
  const captionElement = document.createElement("caption");
  captionElement.className = "gui-table__caption";
  const headerElement = document.createElement("thead");
  headerElement.className = "gui-table__header";
  const bodyElement = document.createElement("tbody");
  bodyElement.className = "gui-table__body";
  element.append(captionElement);
  element.append(headerElement);
  element.append(bodyElement);

  let props = normalizeProps(initialProps);
  function render() {
    element.dataset.guiComponent = "table";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    captionElement.textContent = props.caption;
    captionElement.hidden = props.caption === "";
    if (props.accessibilityLabel) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
  }
  render();
  return {
    element,
    captionElement,
    headerElement,
    bodyElement,
    update(nextProps = {}) { props = normalizeProps({ ...props, ...nextProps }); render(); },
    destroy() {},
  };
}
