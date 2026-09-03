// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiToast } from "../../packages/adapter-web/src/toast.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountToastReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountToastReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountToastReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  const timedDurationMs = Number(options.durationMs ?? 250);
  if (!densities.has(density)) throw new Error(`Unknown Toast reference density: ${density}`);
  if (!Number.isFinite(timedDurationMs) || timedDurationMs <= 0) throw new Error("Toast reference durationMs must be positive");

  let open = false;
  let lastAction = "none";
  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Toast / Notification"),
    element(document, "h1", "", "Transient feedback"),
    element(document, "p", "gui-reference__lead", "Controlled in-app notification with explicit host placement and accessible action/dismiss behavior."),
  );

  const field = element(document, "div", "gui-reference__field");
  const controls = element(document, "div", "gui-reference__actions");
  const status = element(document, "p", "gui-reference__status", "Notification closed.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const actionStatus = element(document, "p", "gui-reference__status", "Last notification action: none");

  let toast;
  function setOpen(nextOpen) {
    open = nextOpen;
    toast.update({ open });
    status.textContent = open ? "Notification open." : "Notification closed.";
  }

  function showNotification({ variant = "info", durationMs = 0, title = "Workspace updated", message = "Your changes were saved." } = {}) {
    open = true;
    toast.update({ open, variant, durationMs, title, message });
    status.textContent = "Notification open.";
  }

  toast = createGuiToast(document, {
    open,
    title: "Workspace updated",
    message: "Your changes were saved.",
    actionLabel: "Undo",
    actionValue: "undo",
    dismissible: true,
    durationMs: 0,
    accessibilityLabel: "Workspace notification",
    variant: "info",
    size: density === "compact" ? "small" : "medium",
    onOpenChange: setOpen,
    onActivate(value) {
      lastAction = value;
      actionStatus.textContent = `Last notification action: ${value}`;
    },
  });

  // Placement belongs to the host, not the neutral Toast contract.
  toast.element.style.position = "fixed";
  toast.element.style.insetInlineEnd = "8px";
  toast.element.style.insetBlockEnd = "8px";
  toast.element.style.zIndex = "10";

  const persistentButton = createGuiButton(document, {
    label: "Show notification",
    variant: "secondary",
    size: density === "compact" ? "small" : "medium",
    onActivate() { showNotification(); },
  });
  const timedButton = createGuiButton(document, {
    label: "Show timed notification",
    variant: "secondary",
    size: density === "compact" ? "small" : "medium",
    onActivate() { showNotification({ durationMs: timedDurationMs }); },
  });
  const errorButton = createGuiButton(document, {
    label: "Show error notification",
    variant: "secondary",
    size: density === "compact" ? "small" : "medium",
    onActivate() {
      showNotification({
        variant: "error",
        durationMs: 0,
        title: "Sync failed",
        message: "The workspace could not be synchronized.",
      });
    },
  });

  controls.append(persistentButton.element, timedButton.element, errorButton.element);
  field.append(controls, status, actionStatus);
  surface.append(header, field, toast.element);
  root.append(surface);

  return {
    toast,
    persistentButton,
    timedButton,
    errorButton,
    getState() { return { open, density, timedDurationMs, lastAction }; },
    destroy() {
      toast.destroy();
      persistentButton.destroy();
      timedButton.destroy();
      errorButton.destroy();
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
  const root = document.querySelector?.("#gui-toast-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountToastReference(document, root, {
      density: query.get("density") ?? "standard",
      durationMs: query.get("durationMs") ?? 250,
    });
  }
}
