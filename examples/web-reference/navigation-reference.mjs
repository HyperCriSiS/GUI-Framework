// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiNavigation, createGuiNavigationItem } from "../../packages/adapter-web/src/navigation.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function appendItems(navigation, items) {
  navigation.listElement.append(...items.map((item) => item.element));
  navigation.refreshItems();
}

export function mountNavigationReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountNavigationReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountNavigationReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Navigation reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";

  let value = "overview";
  let disabled = false;

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Navigation"),
    element(document, "h1", "", "Workspace navigation"),
    element(document, "p", "gui-reference__lead", "Native navigation landmarks and buttons keep platform semantics while GUI Framework owns controlled selection and visual state."),
  );

  const field = element(document, "div", "gui-reference__field");
  const controls = element(document, "div", "gui-reference__actions");
  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const navigation = createGuiNavigation(document, {
    value,
    accessibilityLabel: "Workspace sections",
    size: componentSize,
    onValueChange(nextValue) {
      value = nextValue;
      navigation.update({ value });
      renderStatus();
    },
  });

  const items = [
    createGuiNavigationItem(document, { value: "overview", label: "Overview", icon: "◫" }),
    createGuiNavigationItem(document, { value: "activity", label: "Activity", icon: "↗" }),
    createGuiNavigationItem(document, { value: "settings", label: "Settings", icon: "⚙" }),
    createGuiNavigationItem(document, { value: "archive", label: "Archive", icon: "□", disabled: true }),
  ];
  appendItems(navigation, items);

  const vertical = createGuiNavigation(document, {
    value: "library",
    accessibilityLabel: "Library sections",
    variant: "vertical",
    size: componentSize,
  });
  const verticalItems = [
    createGuiNavigationItem(document, { value: "library", label: "Library" }),
    createGuiNavigationItem(document, { value: "favorites", label: "Favorites" }),
    createGuiNavigationItem(document, { value: "history", label: "History" }),
  ];
  appendItems(vertical, verticalItems);

  const toggleDisabledButton = createGuiButton(document, {
    label: "Disable navigation",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      disabled = !disabled;
      navigation.update({ disabled });
      toggleDisabledButton.update({ label: disabled ? "Enable navigation" : "Disable navigation" });
      renderStatus();
    },
  });

  const resetButton = createGuiButton(document, {
    label: "Select overview",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      value = "overview";
      navigation.update({ value });
      renderStatus();
    },
  });

  function renderStatus() {
    status.textContent = `Selected section: ${value} · ${disabled ? "navigation disabled" : "navigation enabled"}`;
  }

  renderStatus();
  controls.append(toggleDisabledButton.element, resetButton.element);
  field.append(
    navigation.element,
    element(document, "p", "gui-reference__hint", "Horizontal controlled navigation · Archive is disabled"),
    vertical.element,
    element(document, "p", "gui-reference__hint", "Vertical navigation primitive"),
    controls,
    status,
  );
  surface.append(header, field);
  root.append(surface);

  return {
    navigation,
    vertical,
    items,
    verticalItems,
    toggleDisabledButton,
    resetButton,
    getState() { return { density, value, disabled }; },
    destroy() {
      navigation.destroy();
      vertical.destroy();
      for (const item of [...items, ...verticalItems]) item.destroy();
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
  const root = document.querySelector?.("#gui-navigation-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountNavigationReference(document, root, {
      density: query.get("density") ?? "standard",
    });
  }
}
