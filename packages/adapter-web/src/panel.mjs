// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI panel ${label}: ${value}`);
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI panel ${key} must be a string`);
  return props[key];
}

function normalizeProps(props = {}) {
  const normalized = {
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
  };
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a native, non-interactive HTML container driven by the neutral GUI panel contract.
 * Child nodes remain owned by the caller and are never recreated during property updates.
 */
export function createGuiPanel(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiPanel requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  element.className = "gui-panel";

  // Renderer foundation that is independent from theme values. Theme-controlled
  // fill, border width/color, radius and padding continue to come from generated CSS.
  element.style.boxSizing = "border-box";
  element.style.borderStyle = "solid";
  element.style.minWidth = "0";

  let props = normalizeProps(initialProps);

  function render() {
    element.dataset.guiComponent = "panel";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;

    if (props.accessibilityLabel.trim() !== "") {
      element.setAttribute("role", "group");
      element.setAttribute("aria-label", props.accessibilityLabel);
    } else {
      element.removeAttribute("role");
      element.removeAttribute("aria-label");
    }
  }

  render();

  return {
    element,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      // The base panel owns no listeners or child nodes, so there is nothing to tear down.
    },
  };
}
