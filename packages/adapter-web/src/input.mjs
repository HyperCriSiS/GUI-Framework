// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI input ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI input ${key} must be a boolean`);
  return props[key];
}

function normalizeProps(props = {}) {
  const normalized = {
    value: props.value,
    placeholder: props.placeholder ?? "",
    accessibilityLabel: props.accessibilityLabel ?? "",
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    disabled: optionalBoolean(props, "disabled"),
    readOnly: optionalBoolean(props, "readOnly"),
    error: optionalBoolean(props, "error"),
    onValueChange: props.onValueChange ?? null,
  };
  if (typeof normalized.value !== "string") throw new TypeError("GUI input value must be a string");
  if (typeof normalized.placeholder !== "string") throw new TypeError("GUI input placeholder must be a string");
  if (typeof normalized.accessibilityLabel !== "string") throw new TypeError("GUI input accessibilityLabel must be a string");
  if (normalized.onValueChange !== null && typeof normalized.onValueChange !== "function") {
    throw new TypeError("GUI input onValueChange must be a function or null");
  }
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a native HTML input controlled by the neutral GUI input contract.
 * Browser-native editing, focus, selection, disabled and read-only behavior are retained.
 */
export function createGuiInput(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiInput requires a DOM Document-like object");
  }

  const element = document.createElement("input");
  element.type = "text";
  element.className = "gui-input";

  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "input";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiError = props.error ? "true" : "false";
    element.value = props.value;
    element.placeholder = props.placeholder;
    element.disabled = props.disabled;
    element.readOnly = props.readOnly;

    if (props.accessibilityLabel.trim() !== "") element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    if (props.error) element.setAttribute("aria-invalid", "true");
    else element.removeAttribute("aria-invalid");
  }

  function valueChange(event) {
    if (props.disabled || props.readOnly) return;
    props.onValueChange?.(event.currentTarget.value);
  }

  element.addEventListener("input", valueChange);
  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      element.removeEventListener("input", valueChange);
    },
  };
}
