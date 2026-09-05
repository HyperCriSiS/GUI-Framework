// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiInput } from "../../packages/adapter-web/src/input.mjs";
import {
  createGuiFormLayout,
  createGuiFormLayoutSection,
  createGuiFormField,
  createGuiFormActions,
} from "../../packages/adapter-web/src/form-layout.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountFormLayoutReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountFormLayoutReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountFormLayoutReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Form Layout reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";
  let variant = "inline";
  let emailValue = "jan@example.com";
  let recoveryValue = "12";
  let saveCount = 0;

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Form Layout"),
    element(document, "h1", "", "Account settings"),
    element(document, "p", "gui-reference__lead", "Form Layout owns field structure, accessibility linkage and responsive arrangement while values, validation decisions and control state remain host-owned."),
  );

  const form = createGuiFormLayout(document, {
    accessibilityLabel: "Account settings form layout",
    columns: 2,
    variant,
    size: componentSize,
  });
  const section = createGuiFormLayoutSection(document);

  const emailInput = createGuiInput(document, {
    value: emailValue,
    size: componentSize,
    onValueChange(nextValue) {
      emailValue = nextValue;
      emailInput.update({ value: emailValue });
    },
  });
  const emailField = createGuiFormField(document, {
    control: emailInput.element,
    label: "Email",
    description: "Used for account notifications.",
  });

  const recoveryInput = createGuiInput(document, {
    value: recoveryValue,
    size: componentSize,
    error: true,
    onValueChange(nextValue) {
      recoveryValue = nextValue;
      recoveryInput.update({ value: recoveryValue, error: recoveryValue.length !== 6 });
      recoveryField.update({ error: recoveryValue.length === 6 ? "" : "Recovery code must contain 6 characters." });
    },
  });
  const recoveryField = createGuiFormField(document, {
    control: recoveryInput.element,
    label: "Recovery code",
    description: "Exactly 6 characters.",
    error: "Recovery code must contain 6 characters.",
  });

  const tokenInput = createGuiInput(document, {
    value: "sk-local-reference",
    size: componentSize,
    disabled: true,
  });
  const tokenField = createGuiFormField(document, {
    control: tokenInput.element,
    label: "API token",
    description: "Managed externally by the host application.",
    disabled: true,
  });

  section.element.append(emailField.element, recoveryField.element, tokenField.element);

  const actions = createGuiFormActions(document);
  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  function renderStatus() {
    status.textContent = `Saved: ${saveCount} · variant: ${variant} · email: ${emailValue}`;
  }

  const saveButton = createGuiButton(document, {
    label: "Save settings",
    size: componentSize,
    onActivate() {
      saveCount += 1;
      renderStatus();
    },
  });
  const toggleVariantButton = createGuiButton(document, {
    label: "Use stacked layout",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      variant = variant === "inline" ? "stacked" : "inline";
      form.update({ variant });
      toggleVariantButton.update({ label: variant === "inline" ? "Use stacked layout" : "Use inline layout" });
      renderStatus();
    },
  });
  const resetButton = createGuiButton(document, {
    label: "Reset recovery code",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      recoveryValue = "12";
      recoveryInput.update({ value: recoveryValue, error: true });
      recoveryField.update({ error: "Recovery code must contain 6 characters." });
    },
  });

  actions.element.append(saveButton.element, toggleVariantButton.element, resetButton.element);
  renderStatus();
  form.element.append(section.element, actions.element, status);
  const field = element(document, "div", "gui-reference__field");
  field.append(
    form.element,
    element(document, "p", "gui-reference__hint", "Two requested columns on wide layouts · compact view collapses to one column · field validation and disabled decisions remain host-owned"),
  );
  surface.append(header, field);
  root.append(surface);

  return {
    form,
    section,
    fields: { emailField, recoveryField, tokenField },
    inputs: { emailInput, recoveryInput, tokenInput },
    actions,
    saveButton,
    toggleVariantButton,
    resetButton,
    getState() { return { density, variant, emailValue, recoveryValue, saveCount }; },
    destroy() {
      emailField.destroy();
      recoveryField.destroy();
      tokenField.destroy();
      emailInput.destroy();
      recoveryInput.destroy();
      tokenInput.destroy();
      saveButton.destroy();
      toggleVariantButton.destroy();
      resetButton.destroy();
      form.destroy();
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
  const root = document.querySelector?.("#gui-form-layout-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountFormLayoutReference(document, root, { density: query.get("density") ?? "standard" });
  }
}
