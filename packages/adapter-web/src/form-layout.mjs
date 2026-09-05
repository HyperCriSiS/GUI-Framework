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
    if (existing !== requestedId) control.setAttribute("id", requestedId);
    return { id: requestedId, owned: existing !== requestedId, previous: existing };
  }
  if (existing) return { id: existing, owned: false, previous: existing };
  generatedFieldId += 1;
  const id = `gui-form-control-${generatedFieldId}`;
  control.setAttribute("id", id);
  return { id, owned: true, previous: "" };
}

function restoreOwnedAttribute(element, name, ownedState) {
  if (!ownedState.owned) return;
  if (element.getAttribute(name) !== ownedState.applied) {
    ownedState.owned = false;
    return;
  }
  if (ownedState.previous === null) element.removeAttribute(name);
  else element.setAttribute(name, ownedState.previous);
  ownedState.owned = false;
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
  const idInfo = ensureControlId(control, props.id);
  const baseId = idInfo.id;
  const descriptionId = `${baseId}__description`;
  const errorId = `${baseId}__error`;
  labelElement.setAttribute("for", baseId);
  descriptionElement.setAttribute("id", descriptionId);
  errorElement.setAttribute("id", errorId);
  controlElement.append(control);
  element.append(labelElement, controlElement, descriptionElement, errorElement);

  const describedByOwnership = new Map([
    [descriptionId, false],
    [errorId, false],
  ]);
  const invalidOwnership = { owned: false, previous: null, applied: "true" };

  function syncDescribedById(id, desired) {
    const ids = splitIds(control.getAttribute("aria-describedby"));
    const present = ids.includes(id);
    const owned = describedByOwnership.get(id) === true;
    if (desired) {
      if (!present) {
        setIds(control, "aria-describedby", [...ids, id]);
        describedByOwnership.set(id, true);
      }
      return;
    }
    if (owned) {
      if (present) setIds(control, "aria-describedby", ids.filter((candidate) => candidate !== id));
      describedByOwnership.set(id, false);
    }
  }

  function syncInvalid(desired) {
    if (desired) {
      if (!invalidOwnership.owned && control.getAttribute("aria-invalid") !== "true") {
        invalidOwnership.previous = control.getAttribute("aria-invalid");
        control.setAttribute("aria-invalid", "true");
        invalidOwnership.owned = true;
      } else if (invalidOwnership.owned && control.getAttribute("aria-invalid") !== "true") {
        invalidOwnership.owned = false;
      }
      return;
    }
    restoreOwnedAttribute(control, "aria-invalid", invalidOwnership);
  }

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

    syncDescribedById(descriptionId, Boolean(props.description));
    syncDescribedById(errorId, Boolean(props.error));
    syncInvalid(Boolean(props.error));
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
      syncDescribedById(descriptionId, false);
      syncDescribedById(errorId, false);
      syncInvalid(false);
      if (idInfo.owned && control.getAttribute("id") === baseId) {
        if (idInfo.previous) control.setAttribute("id", idInfo.previous);
        else control.removeAttribute("id");
      }
    },
  };
}
