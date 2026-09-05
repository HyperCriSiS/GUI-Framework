// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["stacked", "inline"]);
const sizes = new Set(["small", "medium", "large"]);
let generatedFieldId = 0;

function requireDocument(document, factory) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError(`${factory} requires a DOM Document-like object`);
  }
}
function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI form layout ${key} must be a string`);
  return props[key];
}
function optionalBoolean(props, key, fallback = false) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI form field ${key} must be a boolean`);
  return props[key];
}
function choice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI form layout ${label}: ${value}`);
  return value;
}
function normalizeColumns(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new TypeError("GUI form layout columns must be a finite positive integer");
  }
  return value;
}
function normalizeLayoutProps(props = {}) {
  return {
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    columns: normalizeColumns(props.columns ?? 1),
    variant: choice(props.variant ?? "stacked", variants, "variant"),
    size: choice(props.size ?? "medium", sizes, "size"),
  };
}
function isElementLike(value) {
  return value && typeof value.setAttribute === "function" && typeof value.getAttribute === "function" && typeof value.removeAttribute === "function";
}
function normalizeFieldProps(props = {}) {
  if (!isElementLike(props.control)) throw new TypeError("GUI form field control must be a DOM Element-like object");
  return {
    control: props.control,
    id: optionalString(props, "id"),
    label: optionalString(props, "label"),
    description: optionalString(props, "description"),
    error: optionalString(props, "error"),
    disabled: optionalBoolean(props, "disabled"),
  };
}
function splitIds(value) {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean);
}
function setIds(element, name, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length) element.setAttribute(name, unique.join(" "));
  else element.removeAttribute(name);
}
function ensureControlId(control, requestedId) {
  const existing = control.getAttribute("id")?.trim() ?? "";
  if (requestedId) {
    control.setAttribute("id", requestedId);
    return { id: requestedId, generated: existing === "", previous: existing };
  }
  if (existing) return { id: existing, generated: false, previous: existing };
  generatedFieldId += 1;
  const id = `gui-form-control-${generatedFieldId}`;
  control.setAttribute("id", id);
  return { id, generated: true, previous: "" };
}

export function createGuiFormLayout(document, initialProps = {}) {
  requireDocument(document, "createGuiFormLayout");
  const element = document.createElement("div");
  element.className = "gui-form-layout";
  let props = normalizeLayoutProps(initialProps);

  function render() {
    element.dataset.guiComponent = "form-layout";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.setAttribute("role", "group");
    if (props.accessibilityLabel.trim()) element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    element.style.setProperty("--gui-form-layout-columns", String(props.columns));
  }
  render();
  return {
    element,
    update(nextProps = {}) {
      props = normalizeLayoutProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}

export function createGuiFormLayoutSection(document) {
  requireDocument(document, "createGuiFormLayoutSection");
  const element = document.createElement("div");
  element.className = "gui-form-layout__section";
  return { element, destroy() {} };
}

export function createGuiFormActions(document) {
  requireDocument(document, "createGuiFormActions");
  const element = document.createElement("div");
  element.className = "gui-form-layout__actions";
  return { element, destroy() {} };
}

/**
 * Creates structural field semantics around a host-owned native/custom control.
 * Validation is intentionally not performed here: `error` and `disabled` only
 * reflect state supplied by the host. The helper owns label/help/error linkage,
 * but never changes the control's value or disabled property.
 */
export function createGuiFormField(document, initialProps = {}) {
  requireDocument(document, "createGuiFormField");
  const element = document.createElement("div");
  element.className = "gui-form-layout__field";
  const labelElement = document.createElement("label");
  labelElement.className = "gui-form-layout__label";
  const controlElement = document.createElement("div");
  controlElement.className = "gui-form-layout__control";
  const descriptionElement = document.createElement("div");
  descriptionElement.className = "gui-form-layout__description";
  const errorElement = document.createElement("div");
  errorElement.className = "gui-form-layout__error";

  let props = normalizeFieldProps(initialProps);
  const control = props.control;
  const originalId = control.getAttribute("id");
  const originalDescribedBy = control.getAttribute("aria-describedby");
  const originalInvalid = control.getAttribute("aria-invalid");
  const idInfo = ensureControlId(control, props.id);
  const baseId = idInfo.id;
  const descriptionId = `${baseId}__description`;
  const errorId = `${baseId}__error`;
  labelElement.setAttribute("for", baseId);
  descriptionElement.setAttribute("id", descriptionId);
  errorElement.setAttribute("id", errorId);
  controlElement.append(control);
  element.append(labelElement, controlElement, descriptionElement, errorElement);

  const externalDescriptionIds = splitIds(originalDescribedBy).filter((id) => id !== descriptionId && id !== errorId);

  function render() {
    const states = [];
    if (props.error.trim()) states.push("error");
    if (props.disabled) states.push("disabled");
    element.dataset.guiState = states.join(" ");
    if (props.disabled) element.setAttribute("aria-disabled", "true");
    else element.removeAttribute("aria-disabled");

    labelElement.textContent = props.label;
    labelElement.hidden = props.label === "";
    descriptionElement.textContent = props.description;
    descriptionElement.hidden = props.description === "";
    errorElement.textContent = props.error;
    errorElement.hidden = props.error === "";

    setIds(control, "aria-describedby", [
      ...externalDescriptionIds,
      props.description ? descriptionId : "",
      props.error ? errorId : "",
    ]);
    if (props.error) control.setAttribute("aria-invalid", "true");
    else if (originalInvalid === null) control.removeAttribute("aria-invalid");
    else control.setAttribute("aria-invalid", originalInvalid);
  }
  render();

  return {
    element,
    labelElement,
    controlElement,
    descriptionElement,
    errorElement,
    control,
    update(nextProps = {}) {
      if (Object.prototype.hasOwnProperty.call(nextProps, "control") && nextProps.control !== control) {
        throw new Error("GUI form field control cannot be replaced after creation");
      }
      if (Object.prototype.hasOwnProperty.call(nextProps, "id") && nextProps.id !== props.id) {
        throw new Error("GUI form field id cannot be changed after creation");
      }
      props = normalizeFieldProps({ ...props, ...nextProps, control });
      render();
    },
    destroy() {
      if (originalId === null) control.removeAttribute("id");
      else control.setAttribute("id", originalId);
      if (originalDescribedBy === null) control.removeAttribute("aria-describedby");
      else control.setAttribute("aria-describedby", originalDescribedBy);
      if (originalInvalid === null) control.removeAttribute("aria-invalid");
      else control.setAttribute("aria-invalid", originalInvalid);
    },
  };
}
