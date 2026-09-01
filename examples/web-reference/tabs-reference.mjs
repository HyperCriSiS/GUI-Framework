// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  createGuiTab,
  createGuiTabs,
} from "../../packages/adapter-web/src/tabs.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountTabsReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountTabsReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountTabsReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Tabs reference density: ${density}`);

  let value = options.value ?? "overview";
  if (typeof value !== "string") throw new TypeError("Tabs reference value must be a string");

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Tabs"),
    element(document, "h1", "", "Workspace sections"),
    element(document, "p", "gui-reference__lead", "Controlled manual-activation tabs using the real Web adapter."),
  );

  const field = element(document, "div", "gui-reference__field");
  const label = element(document, "p", "gui-reference__label", "Workspace section");
  const status = element(document, "p", "gui-reference__status", "Ready.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const panelCopy = {
    overview: "Overview panel: current activity and summary.",
    metrics: "Metrics panel: disabled in this reference.",
    logs: "Logs panel: recent runtime events.",
  };

  let tabs;
  function renderPanel() {
    tabs.panelElement.replaceChildren(
      element(document, "p", "", panelCopy[value] ?? `Unknown panel: ${value}.`),
    );
  }

  function render(next = {}) {
    tabs.update({ value, ...next });
    renderPanel();
  }

  tabs = createGuiTabs(document, {
    value,
    accessibilityLabel: "Workspace sections",
    size: density === "compact" ? "small" : "medium",
    onValueChange(nextValue) {
      value = nextValue;
      render();
      status.textContent = `Selected ${nextValue}.`;
    },
  });

  const tabHandles = [
    createGuiTab(document, { value: "overview", label: "Overview" }),
    createGuiTab(document, { value: "metrics", label: "Metrics", disabled: true }),
    createGuiTab(document, { value: "logs", label: "Logs" }),
  ];
  tabs.tabListElement.append(...tabHandles.map(({ element }) => element));
  tabs.refreshTabs();
  renderPanel();

  field.append(label, tabs.element);
  surface.append(header, field, status);
  root.append(surface);

  return {
    tabs,
    tabHandles,
    getState() { return { value, density }; },
    destroy() {
      tabs.destroy();
      for (const tab of tabHandles) tab.destroy();
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
  const root = document.querySelector?.("#gui-tabs-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountTabsReference(document, root, {
      density: query.get("density") ?? "standard",
    });
  }
}
