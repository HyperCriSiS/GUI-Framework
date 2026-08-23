// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI radio ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI radio ${key} must be a boolean`);
  return props[key];
}

function requiredString(props, key) {
  const value = props[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`GUI radio ${key} must be a non-empty string`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    selected: props.selected,
    accessibilityLabel: requiredString(props, "accessibilityLabel"),
    groupName: requiredString(props, "groupName"),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    disabled: optionalBoolean(props, "disabled"),
    onSelectedChange: props.onSelectedChange ?? null,
  };
  if (typeof normalized.selected !== "boolean") throw new TypeError("GUI radio selected must be a boolean");
  if (normalized.onSelectedChange !== null && typeof normalized.onSelectedChange !== "function") {
    throw new TypeError("GUI radio onSelectedChange must be a function or null");
  }
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

export function createGuiRadio(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiRadio requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  element.type = "button";
  element.className = "gui-radio";
  element.setAttribute("role", "radio");

  const indicator = document.createElement("span");
  indicator.className = "gui-radio__indicator";
  indicator.setAttribute("aria-hidden", "true");
  element.append(indicator);

  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "radio";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiSelected = props.selected ? "true" : "false";
    element.dataset.guiState = props.selected ? "selected" : "";
    element.dataset.guiRadioGroup = props.groupName;
    element.disabled = props.disabled;
    element.setAttribute("aria-checked", props.selected ? "true" : "false");
    element.setAttribute("aria-label", props.accessibilityLabel);
    indicator.textContent = props.selected ? "●" : "";
  }

  function selectedChange() {
    if (props.disabled || props.selected) return;
    props.onSelectedChange?.(true);
  }

  element.addEventListener("click", selectedChange);
  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      element.removeEventListener("click", selectedChange);
    },
  };
}
