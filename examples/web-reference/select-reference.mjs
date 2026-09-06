// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  createGuiSelect,
  createGuiSelectOption,
} from "../../packages/adapter-web/src/select.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountSelectReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountSelectReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountSelectReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Select reference density: ${density}`);
  const editable = options.editable ?? false;
  if (typeof editable !== "boolean") throw new TypeError("Select reference editable must be a boolean");

  let value = options.value ?? "email";
  let query = options.query ?? "";
  let expanded = false;
  let suppressNextExpandedStatus = false;
  if (typeof value !== "string" || typeof query !== "string") {
    throw new TypeError("Select reference value and query must be strings");
  }

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Select / ComboBox"),
    element(document, "h1", "", "Delivery preference"),
    element(document, "p", "gui-reference__lead", "Controlled Select and editable ComboBox behavior using the real Web adapter."),
  );

  const field = element(document, "div", "gui-reference__field");
  const label = element(document, "label", "gui-reference__label", editable ? "Find delivery channel" : "Delivery channel");
  label.htmlFor = "gui-select-reference-control";
  const status = element(document, "p", "gui-reference__status", "Ready.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  let select;
  function render(next = {}) {
    select.update({ value, query, expanded, ...next });
  }

  select = createGuiSelect(document, {
    value,
    query,
    editable,
    expanded,
    accessibilityLabel: editable ? "Find delivery channel" : "Delivery channel",
    placeholder: editable ? "Type to filter" : "Choose a delivery channel",
    size: density === "compact" ? "small" : "medium",
    onValueChange(nextValue) {
      suppressNextExpandedStatus = expanded;
      value = nextValue;
      render();
      status.textContent = `Selected ${nextValue}.`;
    },
    onQueryChange(nextQuery) {
      suppressNextExpandedStatus = !expanded;
      query = nextQuery;
      render();
      status.textContent = `Query ${nextQuery || "cleared"}.`;
    },
    onExpandedChange(nextExpanded) {
      expanded = nextExpanded;
      render();
      if (suppressNextExpandedStatus) {
        suppressNextExpandedStatus = false;
        return;
      }
      status.textContent = nextExpanded ? "Options opened." : "Options closed.";
    },
  });
  select.element.id = "gui-select-reference-control";

  const optionHandles = [
    createGuiSelectOption(document, { value: "email", label: "Email" }),
    createGuiSelectOption(document, { value: "push", label: "Push" }),
    createGuiSelectOption(document, { value: "digest", label: "Daily digest" }),
    createGuiSelectOption(document, { value: "legacy", label: "Legacy channel", disabled: true }),
  ];
  select.popupElement.setAttribute("aria-label", "Delivery channel options");
  select.popupElement.append(...optionHandles.map(({ element }) => element));
  select.refreshOptions();

  field.append(label, select.element, select.popupElement);
  surface.append(header, field, status);
  root.append(surface);

  return {
    select,
    optionHandles,
    getState() { return { value, query, expanded, editable, density }; },
    destroy() {
      select.destroy();
      for (const option of optionHandles) option.destroy();
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
  const root = document.querySelector?.("#gui-select-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    globalThis.__guiSelectReferenceController = mountSelectReference(document, root, {
      density: query.get("density") ?? "standard",
      editable: query.get("editable") === "true",
    });
  }
}
