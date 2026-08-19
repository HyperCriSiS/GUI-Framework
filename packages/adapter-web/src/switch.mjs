// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI switch ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI switch ${key} must be a boolean`);
  return props[key];
}

function normalizeProps(props = {}) {
  const normalized = {
    checked: props.checked,
    accessibilityLabel: props.accessibilityLabel,
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    disabled: optionalBoolean(props, "disabled"),
    onCheckedChange: props.onCheckedChange ?? null,
  };
  if (typeof normalized.checked !== "boolean") {
    throw new TypeError("GUI switch checked must be a boolean");
  }
  if (typeof normalized.accessibilityLabel !== "string" || normalized.accessibilityLabel.trim() === "") {
    throw new TypeError("GUI switch accessibilityLabel must be a non-empty string");
  }
  if (normalized.onCheckedChange !== null && typeof normalized.onCheckedChange !== "function") {
    throw new TypeError("GUI switch onCheckedChange must be a function or null");
  }
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a native keyboard-focusable HTML control driven by the neutral GUI switch contract.
 * The checked value is controlled by the caller; activation only emits the requested next value.
 */
export function createGuiSwitch(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiSwitch requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  element.type = "button";
  element.className = "gui-switch";
  element.setAttribute("role", "switch");

  const thumb = document.createElement("span");
  thumb.className = "gui-switch__thumb";
  thumb.setAttribute("aria-hidden", "true");
  element.append(thumb);

  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "switch";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiChecked = props.checked ? "true" : "false";
    element.disabled = props.disabled;
    element.setAttribute("aria-checked", props.checked ? "true" : "false");
    element.setAttribute("aria-label", props.accessibilityLabel);
  }

  function checkedChange() {
    if (props.disabled) return;
    props.onCheckedChange?.(!props.checked);
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
