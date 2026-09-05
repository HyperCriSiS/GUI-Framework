// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["vertical", "horizontal", "both"]);
const sizes = new Set(["small", "medium", "large"]);

function requireDocument(document) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiScrollContainer requires a DOM Document-like object");
  }
}
function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI scroll container ${key} must be a string`);
  return props[key];
}
function optionalBoolean(props, key, fallback = true) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI scroll container ${key} must be a boolean`);
  return props[key];
}
function choice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI scroll container ${label}: ${value}`);
  return value;
}
function normalizeProps(props = {}) {
  return {
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    keyboardFocusable: optionalBoolean(props, "keyboardFocusable", true),
    variant: choice(props.variant ?? "vertical", variants, "variant"),
    size: choice(props.size ?? "medium", sizes, "size"),
  };
}

/**
 * Native scroll viewport. Scroll offsets remain owned by the platform/host:
 * the adapter never mirrors, resets or animates scrollTop/scrollLeft.
 */
export function createGuiScrollContainer(document, initialProps = {}) {
  requireDocument(document);
  const element = document.createElement("div");
  element.className = "gui-scroll-container";
  const contentElement = document.createElement("div");
  contentElement.className = "gui-scroll-container__content";
  element.append(contentElement);
  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "scroll-container";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    if (props.accessibilityLabel.trim()) {
      element.setAttribute("role", "region");
      element.setAttribute("aria-label", props.accessibilityLabel);
    } else {
      element.removeAttribute("role");
      element.removeAttribute("aria-label");
    }
    if (props.keyboardFocusable) element.setAttribute("tabindex", "0");
    else element.removeAttribute("tabindex");
  }
  render();

  return {
    element,
    contentElement,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}
