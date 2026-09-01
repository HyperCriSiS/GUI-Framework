// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["primary", "secondary", "ghost", "danger"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI button ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI button ${key} must be a boolean`);
  return props[key];
}

function normalizeProps(props = {}) {
  const normalized = {
    label: props.label,
    variant: props.variant ?? "primary",
    size: props.size ?? "medium",
    disabled: optionalBoolean(props, "disabled"),
    loading: optionalBoolean(props, "loading"),
    onActivate: props.onActivate ?? null,
  };
  if (typeof normalized.label !== "string" || normalized.label.trim() === "") {
    throw new TypeError("GUI button label must be a non-empty string");
  }
  if (normalized.onActivate !== null && typeof normalized.onActivate !== "function") {
    throw new TypeError("GUI button onActivate must be a function or null");
  }
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a native HTML button controlled by the neutral GUI button contract.
 * Browser-native focus, keyboard activation and disabled behavior are retained.
 */
export function createGuiButton(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiButton requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  const labelElement = document.createElement("span");
  element.type = "button";
  element.className = "gui-button";
  labelElement.className = "gui-button__label";
  element.append(labelElement);

  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "button";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiLoading = props.loading ? "true" : "false";
    element.disabled = props.disabled || props.loading;
    labelElement.textContent = props.label;

    if (props.loading) element.setAttribute("aria-busy", "true");
    else element.removeAttribute("aria-busy");
  }

  function activate() {
    if (props.disabled || props.loading) return;
    props.onActivate?.();
  }

  element.addEventListener("click", activate);
  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      element.removeEventListener("click", activate);
    },
  };
}
