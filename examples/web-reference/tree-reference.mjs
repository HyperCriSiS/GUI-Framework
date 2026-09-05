// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiTree, createGuiTreeItem } from "../../packages/adapter-web/src/tree.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountTreeReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountTreeReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountTreeReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Tree reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";
  let value = "workspace";
  let workspaceExpanded = true;
  let activated = "none";
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
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Tree / Hierarchy"),
    element(document, "h1", "", "Project hierarchy"),
    element(document, "p", "gui-reference__lead", "Controlled single selection and expansion with native tree semantics, roving focus and hierarchy-aware keyboard navigation."),
  );

  const field = element(document, "div", "gui-reference__field");
  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const workspace = createGuiTreeItem(document, {
    value: "workspace",
    label: "Workspace",
    icon: "◇",
    accessibilityLabel: "Workspace node",
    branch: true,
    expanded: workspaceExpanded,
  });
  const atlas = createGuiTreeItem(document, {
    value: "atlas",
    label: "Atlas",
    icon: "◈",
    accessibilityLabel: "Atlas node",
  });
  const archive = createGuiTreeItem(document, {
    value: "archive",
    label: "Archive",
    icon: "□",
    accessibilityLabel: "Archive node",
    disabled: true,
  });
  const settings = createGuiTreeItem(document, {
    value: "settings",
    label: "Settings",
    icon: "⚙",
    accessibilityLabel: "Settings node",
  });
  workspace.groupElement.append(atlas.element, archive.element);

  function renderStatus() {
    status.textContent = `Selected node: ${value} · activated: ${activated} · workspace ${workspaceExpanded ? "expanded" : "collapsed"} · ${disabled ? "tree disabled" : "tree enabled"}`;
  }

  function setValue(nextValue) {
    value = nextValue;
    tree.update({ value });
    renderStatus();
  }

  function toggleExpanded(nextValue) {
    if (nextValue !== "workspace") return;
    workspaceExpanded = !workspaceExpanded;
    workspace.update({ expanded: workspaceExpanded });
    tree.refreshItems();
    renderStatus();
  }

  const tree = createGuiTree(document, {
    value,
    accessibilityLabel: "Project hierarchy tree",
    size: componentSize,
    onValueChange: setValue,
    onExpandedChange: toggleExpanded,
    onNodeActivate(nextValue) {
      activated = nextValue;
      renderStatus();
    },
  });
  tree.element.append(workspace.element, settings.element);
  tree.refreshItems();

  const controls = element(document, "div", "gui-reference__actions");
  const toggleDisabledButton = createGuiButton(document, {
    label: "Disable tree",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      disabled = !disabled;
      tree.update({ disabled });
      toggleDisabledButton.update({ label: disabled ? "Enable tree" : "Disable tree" });
      renderStatus();
    },
  });
  const resetButton = createGuiButton(document, {
    label: "Reset hierarchy",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      value = "workspace";
      activated = "none";
      workspaceExpanded = true;
      workspace.update({ expanded: true });
      tree.update({ value });
      tree.refreshItems();
      renderStatus();
    },
  });

  renderStatus();
  controls.append(toggleDisabledButton.element, resetButton.element);
  field.append(
    tree.element,
    element(document, "p", "gui-reference__hint", "Workspace owns Atlas and disabled Archive · Arrow Up/Down/Home/End move focus · Right/Left enter or leave branches · Space selects · Enter activates"),
    controls,
    status,
  );
  surface.append(header, field);
  root.append(surface);

  return {
    tree,
    workspace,
    atlas,
    archive,
    settings,
    toggleDisabledButton,
    resetButton,
    getState() { return { density, value, workspaceExpanded, activated, disabled }; },
    destroy() {
      tree.destroy();
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
  const root = document.querySelector?.("#gui-tree-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountTreeReference(document, root, { density: query.get("density") ?? "standard" });
  }
}
