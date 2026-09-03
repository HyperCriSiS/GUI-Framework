// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["horizontal", "vertical"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI slider ${label}: ${value}`);
}

function optionalBoolean(props, key, fallback = false) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI slider ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI slider ${key} must be a string`);
  return props[key];
}

function finiteNumber(props, key, { required = false, fallback } = {}) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) {
    if (required) throw new TypeError(`GUI slider ${key} must be a finite number`);
    return fallback;
  }
  const value = props[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`GUI slider ${key} must be a finite number`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    value: finiteNumber(props, "value", { required: true }),
    min: finiteNumber(props, "min", { fallback: 0 }),
    max: finiteNumber(props, "max", { fallback: 100 }),
    step: finiteNumber(props, "step", { fallback: 1 }),
    accessibilityLabel: props.accessibilityLabel,
    accessibilityValueText: optionalString(props, "accessibilityValueText"),
    disabled: optionalBoolean(props, "disabled"),
    variant: props.variant ?? "horizontal",
    size: props.size ?? "medium",
    onValueChange: props.onValueChange ?? null,
  };

  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  if (typeof normalized.accessibilityLabel !== "string" || normalized.accessibilityLabel.trim() === "") {
    throw new TypeError("GUI slider accessibilityLabel must be a non-empty string");
  }
  if (!(normalized.max > normalized.min)) {
    throw new RangeError("GUI slider max must be greater than min");
  }
  if (!(normalized.step > 0)) {
    throw new RangeError("GUI slider step must be greater than zero");
  }
  if (normalized.value < normalized.min || normalized.value > normalized.max) {
    throw new RangeError("GUI slider value must be between min and max");
  }
  if (normalized.onValueChange !== null && typeof normalized.onValueChange !== "function") {
    throw new TypeError("GUI slider onValueChange must be a function or null");
  }
  return normalized;
}

/**
 * Creates a native HTML range input as the only semantic and interactive
 * slider surface. Track/fill/thumb siblings mirror the controlled value for
 * framework visuals while the browser keeps pointer and keyboard behavior.
 */
export function createGuiSlider(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiSlider requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  const trackElement = document.createElement("div");
  const fillElement = document.createElement("div");
  const thumbElement = document.createElement("div");
  const inputElement = document.createElement("input");

  element.className = "gui-slider";
  trackElement.className = "gui-slider__track";
  fillElement.className = "gui-slider__fill";
  thumbElement.className = "gui-slider__thumb";
  inputElement.className = "gui-slider__input";
  inputElement.type = "range";

  for (const visual of [trackElement, fillElement, thumbElement]) {
    visual.setAttribute("aria-hidden", "true");
  }
  trackElement.append(fillElement, thumbElement);
  element.append(trackElement, inputElement);

  let props = normalizeProps(initialProps);
  let focused = false;
  let pressed = false;

  function renderState() {
    const states = [];
    if (focused) states.push("focus");
    if (pressed) states.push("pressed");
    if (props.disabled) states.push("disabled");
    element.dataset.guiState = states.join(" ");
  }

  function render() {
    element.dataset.guiComponent = "slider";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDisabled = props.disabled ? "true" : "false";

    inputElement.min = String(props.min);
    inputElement.max = String(props.max);
    inputElement.step = String(props.step);
    inputElement.value = String(props.value);
    inputElement.disabled = props.disabled;
    inputElement.setAttribute("aria-label", props.accessibilityLabel);
    inputElement.setAttribute("aria-orientation", props.variant === "vertical" ? "vertical" : "horizontal");
    if (props.accessibilityValueText === "") inputElement.removeAttribute("aria-valuetext");
    else inputElement.setAttribute("aria-valuetext", props.accessibilityValueText);

    const fraction = (props.value - props.min) / (props.max - props.min);
    element.style.setProperty?.("--gui-slider-fraction", String(fraction));
    renderState();
  }

  function requestValueChange() {
    if (props.disabled) {
      render();
      return;
    }
    const requested = Number(inputElement.value);
    if (Number.isFinite(requested)) props.onValueChange?.(requested);
    render();
  }

  function focus() {
    focused = true;
    renderState();
  }

  function blur() {
    focused = false;
    pressed = false;
    renderState();
  }

  function pointerDown() {
    if (props.disabled) return;
    pressed = true;
    renderState();
  }

  function pointerEnd() {
    pressed = false;
    renderState();
  }

  inputElement.addEventListener("input", requestValueChange);
  inputElement.addEventListener("focus", focus);
  inputElement.addEventListener("blur", blur);
  inputElement.addEventListener("pointerdown", pointerDown);
  inputElement.addEventListener("pointerup", pointerEnd);
  inputElement.addEventListener("pointercancel", pointerEnd);
  render();

  return {
    element,
    inputElement,
    trackElement,
    fillElement,
    thumbElement,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      inputElement.removeEventListener("input", requestValueChange);
      inputElement.removeEventListener("focus", focus);
      inputElement.removeEventListener("blur", blur);
      inputElement.removeEventListener("pointerdown", pointerDown);
      inputElement.removeEventListener("pointerup", pointerEnd);
      inputElement.removeEventListener("pointercancel", pointerEnd);
    },
  };
}
