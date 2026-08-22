// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiInput } from "../../packages/adapter-web/src/input.mjs";
import { createGuiSwitch } from "../../packages/adapter-web/src/switch.mjs";
import { createGuiPanel } from "../../packages/adapter-web/src/panel.mjs";
import { createGuiDialog } from "../../packages/adapter-web/src/dialog.mjs";
import {
  configureWebComponentCapabilities,
  detectWebCapabilities,
} from "../../packages/adapter-web/src/capabilities.mjs";

const themes = new Set(["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"]);
const themeLabels = new Map([
  ["basic", "Basic"],
  ["modern", "Modern"],
  ["glass", "Glass"],
  ["frosted-glass", "Frosted Glass"],
  ["spacey", "Spacey"],
  ["cyberpunk", "Cyberpunk"],
]);
const palettes = new Set(["reference-dark", "reference-light"]);
const hostContexts = new Set(["page", "extension-popup", "extension-sidebar", "extension-options"]);
const densities = new Set(["standard", "compact"]);

function createElement(document, tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function assertMountTarget(document, root) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountReferenceApp requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountReferenceApp requires a DOM Element-like root");
  }
}

/**
 * Mounts a small real application surface that exercises the complete initial
 * Web reference-component set through the adapter's actual component factories.
 */
export function mountReferenceApp(document, root, options = {}) {
  assertMountTarget(document, root);

  const theme = options.theme ?? "basic";
  if (!themes.has(theme)) throw new Error(`Unknown Web reference theme: ${theme}`);
  const initialPalette = options.palette ?? "reference-dark";
  if (!palettes.has(initialPalette)) throw new Error(`Unknown reference palette: ${initialPalette}`);
  const hostContext = options.hostContext ?? "page";
  if (!hostContexts.has(hostContext)) throw new Error(`Unknown Web reference host context: ${hostContext}`);
  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Web reference density: ${density}`);
  const compact = density === "compact";
  const capabilityIr = options.capabilityIr ?? null;
  const availableCapabilities = options.availableCapabilities ??
    (capabilityIr ? detectWebCapabilities() : null);
  if (capabilityIr !== null && (typeof capabilityIr !== "object" || Array.isArray(capabilityIr))) {
    throw new TypeError("Reference app capabilityIr must be a compiled GUI specification object or null");
  }
  if (availableCapabilities !== null && !Array.isArray(availableCapabilities)) {
    throw new TypeError("Reference app availableCapabilities must be an array when provided");
  }

  let capabilityTargets = [];
  function applyCapabilityFallbacks() {
    if (!capabilityIr || !availableCapabilities) return;
    for (const component of capabilityTargets) {
      configureWebComponentCapabilities(
        component.element,
        capabilityIr,
        { paletteId: state.palette, themeId: theme },
        { availableCapabilities },
      );
    }
  }

  const state = {
    name: options.name ?? "Ada Lovelace",
    notifications: options.notifications ?? true,
    palette: initialPalette,
    dialogOpen: false,
  };
  if (typeof state.name !== "string") throw new TypeError("Reference app name must be a string");
  if (typeof state.notifications !== "boolean") throw new TypeError("Reference app notifications must be a boolean");

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = theme;
  root.dataset.guiPalette = state.palette;
  root.dataset.guiHostContext = hostContext;
  root.dataset.guiDensity = density;

  const surface = createElement(document, "div", "gui-reference");
  const header = createElement(document, "header", "gui-reference__header");
  header.append(
    createElement(document, "p", "gui-reference__eyebrow", `${themeLabels.get(theme)} theme · Web adapter`),
    createElement(document, "h1", "", "Reference settings"),
    createElement(
      document,
      "p",
      "gui-reference__lead",
      "A functional integration surface for the neutral component contracts, generated theme values and native browser behavior.",
    ),
  );

  const grid = createElement(document, "div", "gui-reference__grid");
  const primaryStack = createElement(document, "div", "gui-reference__stack");
  const secondaryStack = createElement(document, "div", "gui-reference__stack");

  const settingsPanel = createGuiPanel(document, { accessibilityLabel: "Profile settings", size: compact ? "small" : "large" });
  const settingsTitle = createElement(document, "h2", "", "Profile settings");
  const nameField = createElement(document, "div", "gui-reference__field");
  const nameLabel = createElement(document, "label", "gui-reference__label", "Display name");
  nameLabel.htmlFor = "gui-reference-name";

  const summaryPanel = createGuiPanel(document, { accessibilityLabel: "Current state", size: compact ? "small" : "medium" });
  const summaryTitle = createElement(document, "h2", "", "Current state");
  const summaryList = createElement(document, "dl", "gui-reference__summary");
  const nameValue = createElement(document, "dd");
  const notificationValue = createElement(document, "dd");
  const paletteValue = createElement(document, "dd");

  function summaryRow(label, valueElement) {
    const row = createElement(document, "div", "gui-reference__summary-row");
    row.append(createElement(document, "dt", "", label), valueElement);
    return row;
  }

  summaryList.append(
    summaryRow("Name", nameValue),
    summaryRow("Notifications", notificationValue),
    summaryRow("Palette", paletteValue),
  );

  const status = createElement(document, "p", "gui-reference__status", "Ready.");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  function renderState() {
    nameValue.textContent = state.name || "—";
    notificationValue.textContent = state.notifications ? "Enabled" : "Disabled";
    paletteValue.textContent = state.palette === "reference-dark" ? "Reference dark" : "Reference light";
    root.dataset.guiPalette = state.palette;
    applyCapabilityFallbacks();
  }

  let nameInput;
  nameInput = createGuiInput(document, {
    value: state.name,
    placeholder: "Enter a display name",
    size: compact ? "small" : "large",
    onValueChange(nextValue) {
      state.name = nextValue;
      nameInput.update({ value: nextValue });
      status.textContent = "Profile has unsaved changes.";
      renderState();
    },
  });
  nameInput.element.id = "gui-reference-name";
  nameField.append(nameLabel, nameInput.element);

  const notificationSetting = createElement(document, "div", "gui-reference__setting");
  const notificationCopy = createElement(document, "div", "gui-reference__setting-copy");
  notificationCopy.append(
    createElement(document, "div", "gui-reference__setting-title", "Activity notifications"),
    createElement(document, "p", "", "Keep this controlled setting synchronized with application state."),
  );

  let notificationSwitch;
  notificationSwitch = createGuiSwitch(document, {
    checked: state.notifications,
    accessibilityLabel: "Activity notifications",
    size: compact ? "small" : "medium",
    onCheckedChange(nextChecked) {
      state.notifications = nextChecked;
      notificationSwitch.update({ checked: nextChecked });
      status.textContent = `Notifications ${nextChecked ? "enabled" : "disabled"}.`;
      renderState();
    },
  });
  notificationSetting.append(notificationCopy, notificationSwitch.element);

  const actions = createElement(document, "div", "gui-reference__actions");

  const saveButton = createGuiButton(document, {
    label: "Save settings",
    variant: "primary",
    size: compact ? "small" : "medium",
    onActivate() {
      status.textContent = state.name.trim() === "" ? "Saved with an empty display name." : `Saved settings for ${state.name}.`;
    },
  });

  let paletteButton;
  paletteButton = createGuiButton(document, {
    label: state.palette === "reference-dark" ? "Use light palette" : "Use dark palette",
    variant: "secondary",
    size: compact ? "small" : "medium",
    onActivate() {
      state.palette = state.palette === "reference-dark" ? "reference-light" : "reference-dark";
      paletteButton.update({ label: state.palette === "reference-dark" ? "Use light palette" : "Use dark palette" });
      status.textContent = `Palette changed to ${state.palette === "reference-dark" ? "reference dark" : "reference light"}.`;
      renderState();
    },
  });

  let dialog;
  const openDialogButton = createGuiButton(document, {
    label: "Review changes",
    variant: "ghost",
    size: compact ? "small" : "medium",
    onActivate() {
      state.dialogOpen = true;
      dialog.update({ open: true });
    },
  });

  actions.append(saveButton.element, paletteButton.element, openDialogButton.element);
  settingsPanel.element.append(settingsTitle, nameField, notificationSetting, actions, status);
  summaryPanel.element.append(summaryTitle, summaryList);

  const detailPanel = createGuiPanel(document, { accessibilityLabel: "Integration scope", size: compact ? "small" : "medium" });
  detailPanel.element.append(
    createElement(document, "h2", "", "Integration scope"),
    createElement(
      document,
      "p",
      "gui-reference__secondary",
      "This surface uses the real Button, Input, Switch, Panel/Card and Dialog adapters. Layout remains host-platform HTML/CSS.",
    ),
  );

  primaryStack.append(settingsPanel.element);
  secondaryStack.append(summaryPanel.element, detailPanel.element);
  grid.append(primaryStack, secondaryStack);
  surface.append(header, grid);
  root.append(surface);

  const dialogContent = createElement(document, "div", "gui-reference__dialog-content");
  const dialogTitle = createElement(document, "h2", "", "Review settings");
  const dialogDescription = createElement(
    document,
    "p",
    "",
    "The dialog is controlled by application state. Escape requests dismissal through the neutral event contract instead of mutating state directly.",
  );
  const dialogActions = createElement(document, "div", "gui-reference__dialog-actions");

  function closeDialog() {
    state.dialogOpen = false;
    dialog.update({ open: false });
    status.textContent = "Review closed.";
  }

  const closeDialogButton = createGuiButton(document, {
    label: "Close",
    variant: "primary",
    size: compact ? "small" : "medium",
    onActivate: closeDialog,
  });
  dialogActions.append(closeDialogButton.element);
  dialogContent.append(dialogTitle, dialogDescription, dialogActions);

  dialog = createGuiDialog(document, {
    open: state.dialogOpen,
    accessibilityLabel: "Review settings",
    size: compact ? "small" : "medium",
    onDismissRequest: closeDialog,
  });
  dialog.element.append(dialogContent);
  root.append(dialog.element);

  renderState();

  const components = {
    nameInput,
    notificationSwitch,
    saveButton,
    paletteButton,
    openDialogButton,
    settingsPanel,
    summaryPanel,
    detailPanel,
    dialog,
    closeDialogButton,
  };
  capabilityTargets = Object.values(components);
  applyCapabilityFallbacks();

  return {
    root,
    surface,
    hostContext,
    density,
    theme,
    components,
    getState() {
      return { ...state };
    },
    destroy() {
      for (const component of Object.values(components)) component.destroy();
      root.replaceChildren();
      delete root.dataset.guiTheme;
      delete root.dataset.guiPalette;
      delete root.dataset.guiHostContext;
      delete root.dataset.guiDensity;
      root.className = "";
    },
  };
}

async function loadReferenceIr() {
  const response = await fetch("../../build/spec-ir.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load compiled GUI specification: HTTP ${response.status}`);
  return response.json();
}

if (typeof document !== "undefined") {
  const root = document.querySelector?.("#gui-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    const capabilityMode = query.get("capabilities") ?? "auto";
    const availableCapabilities = capabilityMode === "none" ? [] : undefined;
    if (capabilityMode !== "auto" && capabilityMode !== "none") {
      throw new Error(`Unknown Web reference capability mode: ${capabilityMode}`);
    }

    loadReferenceIr()
      .then((capabilityIr) => {
        mountReferenceApp(document, root, {
          hostContext: query.get("context") ?? "page",
          density: query.get("density") ?? "standard",
          theme: query.get("theme") ?? "basic",
          capabilityIr,
          availableCapabilities,
        });
      })
      .catch((error) => {
        root.dataset.guiReferenceError = "true";
        console.error(error);
      });
  }
}
