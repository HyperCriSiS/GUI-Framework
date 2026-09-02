// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiTooltip } from "../../packages/adapter-web/src/tooltip.mjs";

const densities = new Set(["standard", "compact"]);
const placements = new Set(["top", "bottom", "left", "right"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountTooltipReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountTooltipReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountTooltipReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  const placement = options.placement ?? "top";
  if (!densities.has(density)) throw new Error(`Unknown Tooltip reference density: ${density}`);
  if (!placements.has(placement)) throw new Error(`Unknown Tooltip reference placement: ${placement}`);

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
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Tooltip"),
    element(document, "h1", "", "Context help"),
    element(document, "p", "gui-reference__lead", "Controlled, non-interactive help attached to the real native trigger."),
  );

  const field = element(document, "div", "gui-reference__field");
  const label = element(document, "p", "gui-reference__label", "Workspace action");
  const status = element(document, "p", "gui-reference__status", "Tooltip closed.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const button = createGuiButton(document, {
    label: "Reload workspace",
    variant: "secondary",
    size: density === "compact" ? "small" : "medium",
    onActivate() {
      status.textContent = "Reload activated.";
    },
  });

  let tooltip;
  function setOpen(nextOpen) {
    open = nextOpen;
    tooltip.update({ open });
    status.textContent = open ? "Tooltip open." : "Tooltip closed.";
  }

  tooltip = createGuiTooltip(document, {
    open,
    triggerElement: button.element,
    content: "Reload the current workspace data.",
    placement,
    size: density === "compact" ? "small" : "medium",
    onOpenChange: setOpen,
  });

  field.append(label, button.element, tooltip.element);
  surface.append(header, field, status);
  root.append(surface);

  return {
    button,
    tooltip,
    getState() { return { open, density, placement }; },
    destroy() {
      tooltip.destroy();
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
  const root = document.querySelector?.("#gui-tooltip-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountTooltipReference(document, root, {
      density: query.get("density") ?? "standard",
      placement: query.get("placement") ?? "top",
    });
  }
}
