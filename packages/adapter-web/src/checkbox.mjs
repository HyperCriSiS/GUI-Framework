// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI checkbox ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI checkbox ${key} must be a boolean`);
  return props[key];
}

function normalizeProps(props = {}) {
  const normalized = {
    checked: props.checked,
    indeterminate: optionalBoolean(props, "indeterminate"),
    accessibilityLabel: props.accessibilityLabel,
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    disabled: optionalBoolean(props, "disabled"),
    onCheckedChange: props.onCheckedChange ?? null,
  };
  if (typeof normalized.checked !== "boolean") {
    throw new TypeError("GUI checkbox checked must be a boolean");
  }
  if (typeof normalized.accessibilityLabel !== "string" || normalized.accessibilityLabel.trim() === "") {
    throw new TypeError("GUI checkbox accessibilityLabel must be a non-empty string");
  }
  if (normalized.onCheckedChange !== null && typeof normalized.onCheckedChange !== "function") {
    throw new TypeError("GUI checkbox onCheckedChange must be a function or null");
  }
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a controlled, keyboard-focusable HTML checkbox primitive driven by
 * the neutral GUI checkbox contract. The caller owns checked/indeterminate
 * state; activation only emits the requested next checked value.
 */
export function createGuiCheckbox(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiCheckbox requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  element.type = "button";
  element.className = "gui-checkbox";
  element.setAttribute("role", "checkbox");

  const indicator = document.createElement("span");
  indicator.className = "gui-checkbox__indicator";
  indicator.setAttribute("aria-hidden", "true");
  element.append(indicator);

  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "checkbox";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiChecked = props.checked ? "true" : "false";
    element.dataset.guiIndeterminate = props.indeterminate ? "true" : "false";
    element.dataset.guiState = props.indeterminate ? "indeterminate" : "";
    element.disabled = props.disabled;
    element.setAttribute(
      "aria-checked",
      props.indeterminate ? "mixed" : props.checked ? "true" : "false",
    );
    element.setAttribute("aria-label", props.accessibilityLabel);
    indicator.textContent = props.indeterminate ? "−" : props.checked ? "✓" : "";
  }

  function checkedChange() {
    if (props.disabled) return;
    props.onCheckedChange?.(props.indeterminate ? true : !props.checked);
  }

  element.addEventListener("click", checkedChange);
  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      element.removeEventListener("click", checkedChange);
    },
  };
}
