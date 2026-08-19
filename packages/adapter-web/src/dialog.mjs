// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI dialog ${label}: ${value}`);
}

function requiredBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "boolean") {
    throw new TypeError(`GUI dialog ${key} must be a boolean`);
  }
  return props[key];
}

function optionalBoolean(props, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI dialog ${key} must be a boolean`);
  return props[key];
}

function requiredString(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "string" || props[key].trim() === "") {
    throw new TypeError(`GUI dialog ${key} must be a non-empty string`);
  }
  return props[key];
}

function normalizeProps(props = {}) {
  const normalized = {
    open: requiredBoolean(props, "open"),
    accessibilityLabel: requiredString(props, "accessibilityLabel"),
    dismissible: optionalBoolean(props, "dismissible", true),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onDismissRequest: props.onDismissRequest ?? null,
  };
  if (normalized.onDismissRequest !== null && typeof normalized.onDismissRequest !== "function") {
    throw new TypeError("GUI dialog onDismissRequest must be a function or null");
  }
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a native modal HTML dialog driven by the neutral GUI dialog contract.
 * The open state is controlled by the caller: native dismissal is converted into
 * a dismiss request and does not mutate the controlled state on its own.
 */
export function createGuiDialog(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiDialog requires a DOM Document-like object");
  }

  const element = document.createElement("dialog");
  if (typeof element.showModal !== "function" || typeof element.close !== "function") {
    throw new Error("createGuiDialog requires native HTML dialog support");
  }

  element.className = "gui-dialog";
  element.style.boxSizing = "border-box";
  element.style.borderStyle = "solid";
  element.style.color = "inherit";

  let props = normalizeProps(initialProps);

  function syncOpenState() {
    if (props.open && !element.open) element.showModal();
    else if (!props.open && element.open) element.close();
  }

  function render() {
    element.dataset.guiComponent = "dialog";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDismissible = props.dismissible ? "true" : "false";
    element.setAttribute("aria-label", props.accessibilityLabel);
    syncOpenState();
  }

  function requestDismiss(event) {
    event.preventDefault();
    if (!props.dismissible) return;
    props.onDismissRequest?.();
  }

  element.addEventListener("cancel", requestDismiss);
  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      element.removeEventListener("cancel", requestDismiss);
      if (element.open) element.close();
    },
  };
}
