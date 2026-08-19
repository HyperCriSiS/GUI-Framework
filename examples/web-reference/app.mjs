// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiInput } from "../../packages/adapter-web/src/input.mjs";
import { createGuiSwitch } from "../../packages/adapter-web/src/switch.mjs";
import { createGuiPanel } from "../../packages/adapter-web/src/panel.mjs";
import { createGuiDialog } from "../../packages/adapter-web/src/dialog.mjs";

const palettes = new Set(["reference-dark", "reference-light"]);

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

  const initialPalette = options.palette ?? "reference-dark";
  if (!palettes.has(initialPalette)) throw new Error(`Unknown reference palette: ${initialPalette}`);

  const state = {
    name: options.name ?? "Ada Lovelace",
    notifications: options.notifications ?? true,
    palette: initialPalette,
    dialogOpen: false,
  };
  if (typeof state.name !== "string") throw new TypeError("Reference app name must be a string");
  if (typeof state.notifications !== "boolean") throw new TypeError("Reference app notifications must be a boolean");

  root.replaceChildren();
  root.className = "gui-reference";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = state.palette;

  const header = createElement(document, "header", "gui-reference__header");
  header.append(
    createElement(document, "p", "gui-reference__eyebrow", "Basic theme · Web adapter"),
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

  const settingsPanel = createGuiPanel(document, { accessibilityLabel: "Profile settings", size: "large" });
  const settingsTitle = createElement(document, "h2", "", "Profile settings");
  const nameField = createElement(document, "div", "gui-reference__field");
  const nameLabel = createElement(document, "label", "gui-reference__label", "Display name");
  nameLabel.htmlFor = "gui-reference-name";

  const summaryPanel = createGuiPanel(document, { accessibilityLabel: "Current state", size: "medium" });
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
  }

  let nameInput;
  nameInput = createGuiInput(document, {
    value: state.name,
    placeholder: "Enter a display name",
    size: "large",
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
    size: "medium",
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
    onActivate() {
      status.textContent = state.name.trim() === "" ? "Saved with an empty display name." : `Saved settings for ${state.name}.`;
    },
  });

  let paletteButton;
  paletteButton = createGuiButton(document, {
    label: state.palette === "reference-dark" ? "Use light palette" : "Use dark palette",
    variant: "secondary",
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
    onActivate() {
      state.dialogOpen = true;
      dialog.update({ open: true });
    },
  });

  actions.append(saveButton.element, paletteButton.element, openDialogButton.element);
  settingsPanel.element.append(settingsTitle, nameField, notificationSetting, actions, status);
  summaryPanel.element.append(summaryTitle, summaryList);

  const detailPanel = createGuiPanel(document, { accessibilityLabel: "Integration scope", size: "medium" });
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
  root.append(header, grid);

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
    onActivate: closeDialog,
  });
  dialogActions.append(closeDialogButton.element);
  dialogContent.append(dialogTitle, dialogDescription, dialogActions);

  dialog = createGuiDialog(document, {
    open: state.dialogOpen,
    accessibilityLabel: "Review settings",
    size: "medium",
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

  return {
    root,
    components,
    getState() {
      return { ...state };
    },
    destroy() {
      for (const component of Object.values(components)) component.destroy();
      root.replaceChildren();
      delete root.dataset.guiTheme;
      delete root.dataset.guiPalette;
      root.className = "";
    },
  };
}

if (typeof document !== "undefined") {
  const root = document.querySelector?.("#gui-reference-root");
  if (root) mountReferenceApp(document, root);
}
