// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiMenu, createGuiMenuItem, createGuiMenuSeparator } from "../../packages/adapter-web/src/menu.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountMenuReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountMenuReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountMenuReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Menu reference density: ${density}`);

  let open = false;
  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Menu / Context Menu"),
    element(document, "h1", "", "Workspace actions"),
    element(document, "p", "gui-reference__lead", "Controlled action menu with roving focus, disabled-item skipping and context positioning."),
  );

  const field = element(document, "div", "gui-reference__field");
  const label = element(document, "p", "gui-reference__label", "Menu trigger");
  const hint = element(document, "p", "gui-reference__lead", "Use the button normally or open its context menu with a right click.");
  const status = element(document, "p", "gui-reference__status", "Menu closed.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const activation = element(document, "p", "gui-reference__status", "No action activated.");
  activation.dataset.guiMenuActivation = "none";

  const button = createGuiButton(document, {
    label: "Open workspace menu",
    variant: "secondary",
    size: density === "compact" ? "small" : "medium",
    onActivate() {},
  });

  let menu;
  function setOpen(nextOpen) {
    open = nextOpen;
    menu.update({ open });
    status.textContent = open ? "Menu open." : "Menu closed.";
  }

  menu = createGuiMenu(document, {
    open,
    triggerElement: button.element,
    accessibilityLabel: "Workspace actions",
    size: density === "compact" ? "small" : "medium",
    onOpenChange: setOpen,
    onActivate(value) {
      activation.dataset.guiMenuActivation = value;
      activation.textContent = `Activated: ${value}.`;
    },
  });

  const reload = createGuiMenuItem(document, {
    value: "reload",
    label: "Reload workspace",
    shortcut: "Ctrl+R",
  });
  const locked = createGuiMenuItem(document, {
    value: "locked",
    label: "Locked action",
    disabled: true,
  });
  const settings = createGuiMenuItem(document, {
    value: "settings",
    label: "Workspace settings",
  });
  const separator = createGuiMenuSeparator(document);

  menu.popupElement.append(reload.element, separator.element, locked.element, settings.element);
  menu.refreshItems();

  field.append(label, button.element, menu.element, hint);
  surface.append(header, field, status, activation);
  root.append(surface);

  return {
    button,
    menu,
    items: { reload, locked, settings },
    getState() { return { open, density, activation: activation.dataset.guiMenuActivation }; },
    destroy() {
      menu.destroy();
      reload.destroy();
      locked.destroy();
      settings.destroy();
      separator.destroy();
      button.destroy();
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
  const root = document.querySelector?.("#gui-menu-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountMenuReference(document, root, {
      density: query.get("density") ?? "standard",
    });
  }
}
