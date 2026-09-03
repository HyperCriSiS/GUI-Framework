// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["linear", "circular"]);
const sizes = new Set(["small", "medium", "large"]);
const svgNamespace = "http://www.w3.org/2000/svg";

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI progress ${label}: ${value}`);
}

function optionalBoolean(props, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI progress ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI progress ${key} must be a string`);
  return props[key];
}

function optionalNumber(props, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  const value = props[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`GUI progress ${key} must be a finite number`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    value: optionalNumber(props, "value", 0),
    min: optionalNumber(props, "min", 0),
    max: optionalNumber(props, "max", 100),
    indeterminate: optionalBoolean(props, "indeterminate", false),
    disabled: optionalBoolean(props, "disabled", false),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    label: optionalString(props, "label"),
    variant: props.variant ?? "linear",
    size: props.size ?? "medium",
  };

  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  if (!(normalized.max > normalized.min)) {
    throw new RangeError("GUI progress max must be greater than min");
  }
  if (!normalized.indeterminate && (normalized.value < normalized.min || normalized.value > normalized.max)) {
    throw new RangeError("GUI progress value must be between min and max when determinate");
  }
  return normalized;
}

function createSvgElement(document, tagName) {
  if (typeof document.createElementNS === "function") return document.createElementNS(svgNamespace, tagName);
  return document.createElement(tagName);
}

/**
 * Creates a renderer-neutral Web progress surface with determinate and
 * indeterminate linear/circular presentations. The caller owns all values;
 * this adapter emits no synthetic progress changes.
 */
export function createGuiProgress(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiProgress requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  const labelElement = document.createElement("div");
  element.className = "gui-progress";
  labelElement.className = "gui-progress__label";

  let props = normalizeProps(initialProps);
  let renderedVariant = null;
  let visualElement = null;
  let trackElement = null;
  let indicatorElement = null;

  function buildVisual() {
    if (props.variant === "linear") {
      visualElement = document.createElement("div");
      trackElement = document.createElement("div");
      indicatorElement = document.createElement("div");
      visualElement.className = "gui-progress__visual";
      trackElement.className = "gui-progress__track";
      indicatorElement.className = "gui-progress__indicator";
      trackElement.append(indicatorElement);
      visualElement.append(trackElement);
    } else {
      visualElement = createSvgElement(document, "svg");
      trackElement = createSvgElement(document, "circle");
      indicatorElement = createSvgElement(document, "circle");
      visualElement.setAttribute("viewBox", "0 0 100 100");
      visualElement.setAttribute("aria-hidden", "true");
      visualElement.setAttribute("focusable", "false");
      visualElement.setAttribute("class", "gui-progress__visual gui-progress__circle");
      trackElement.setAttribute("class", "gui-progress__track");
      indicatorElement.setAttribute("class", "gui-progress__indicator");
      for (const circle of [trackElement, indicatorElement]) {
        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", "50");
        circle.setAttribute("r", "46");
        circle.setAttribute("pathLength", "100");
      }
      visualElement.append(trackElement, indicatorElement);
    }
    element.replaceChildren(visualElement, labelElement);
    renderedVariant = props.variant;
  }

  function render() {
    if (renderedVariant !== props.variant) buildVisual();

    element.dataset.guiComponent = "progress";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDisabled = props.disabled ? "true" : "false";
    const states = [];
    if (props.indeterminate) states.push("indeterminate");
    if (props.disabled) states.push("disabled");
    element.dataset.guiState = states.join(" ");

    element.setAttribute("role", "progressbar");
    if (props.disabled) element.setAttribute("aria-disabled", "true");
    else element.removeAttribute("aria-disabled");

    const accessibleName = props.accessibilityLabel.trim() || props.label.trim();
    if (accessibleName === "") element.removeAttribute("aria-label");
    else element.setAttribute("aria-label", accessibleName);

    labelElement.textContent = props.label;
    labelElement.hidden = props.label.trim() === "";

    if (props.indeterminate) {
      element.removeAttribute("aria-valuemin");
      element.removeAttribute("aria-valuemax");
      element.removeAttribute("aria-valuenow");
      element.style.removeProperty?.("--gui-progress-fraction");
      if (props.variant === "linear") {
        indicatorElement.style.removeProperty?.("inline-size");
      } else {
        indicatorElement.setAttribute("stroke-dasharray", "25 75");
        indicatorElement.setAttribute("stroke-dashoffset", "0");
      }
      return;
    }

    element.setAttribute("aria-valuemin", String(props.min));
    element.setAttribute("aria-valuemax", String(props.max));
    element.setAttribute("aria-valuenow", String(props.value));
    const fraction = (props.value - props.min) / (props.max - props.min);
    element.style.setProperty?.("--gui-progress-fraction", String(fraction));
    if (props.variant === "linear") {
      indicatorElement.style.setProperty?.("inline-size", `${fraction * 100}%`);
    } else {
      indicatorElement.setAttribute("stroke-dasharray", "100 100");
      indicatorElement.setAttribute("stroke-dashoffset", String(100 - fraction * 100));
    }
  }

  render();

  return {
    element,
    labelElement,
    get visualElement() { return visualElement; },
    get trackElement() { return trackElement; },
    get indicatorElement() { return indicatorElement; },
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}
