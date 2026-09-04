// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["horizontal", "vertical"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI navigation ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI navigation ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI navigation ${key} must be a string`);
  return props[key];
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI navigation ${key} must be a function or null`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    value: props.value,
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    disabled: optionalBoolean(props, "disabled"),
    variant: props.variant ?? "horizontal",
    size: props.size ?? "medium",
    onValueChange: optionalCallback(props, "onValueChange"),
  };
  if (typeof normalized.value !== "string") throw new TypeError("GUI navigation value must be a string");
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

function normalizeItemProps(props = {}) {
  const value = props.value;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("GUI navigation item value must be a non-empty string");
  }
  const label = optionalString(props, "label");
  const accessibilityLabel = optionalString(props, "accessibilityLabel");
  const icon = optionalString(props, "icon");
  if (label.trim() === "" && accessibilityLabel.trim() === "") {
    throw new TypeError("GUI navigation item requires a label or accessibilityLabel");
  }
  return {
    value,
    label,
    accessibilityLabel,
    icon,
    disabled: optionalBoolean(props, "disabled"),
  };
}

function itemChildren(listElement) {
  return [...listElement.children].filter((child) => child?.dataset?.guiNavigationItem === "true");
}

function itemValue(item) {
  return item.dataset.guiNavigationValue ?? "";
}

function itemOwnDisabled(item) {
  return item.dataset.guiNavigationDisabled === "true";
}

function closestItem(target, listElement) {
  let current = target;
  while (current && current !== listElement) {
    if (current.dataset?.guiNavigationItem === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}

/**
 * Creates a caller-owned native navigation button. The parent navigation
 * adapter owns controlled selection and group-level disabled state.
 */
export function createGuiNavigationItem(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiNavigationItem requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  element.type = "button";
  element.className = "gui-navigation__item";

  const iconElement = document.createElement("span");
  iconElement.className = "gui-navigation__icon";
  iconElement.setAttribute("aria-hidden", "true");

  const labelElement = document.createElement("span");
  labelElement.className = "gui-navigation__label";

  const indicatorElement = document.createElement("span");
  indicatorElement.className = "gui-navigation__indicator";
  indicatorElement.setAttribute("aria-hidden", "true");

  element.append(iconElement);
  element.append(labelElement);
  element.append(indicatorElement);

  let props = normalizeItemProps(initialProps);

  function render() {
    element.dataset.guiNavigationItem = "true";
    element.dataset.guiNavigationValue = props.value;
    element.dataset.guiNavigationDisabled = props.disabled ? "true" : "false";
    iconElement.textContent = props.icon;
    iconElement.hidden = props.icon === "";
    labelElement.textContent = props.label;
    labelElement.hidden = props.label === "";
    if (props.accessibilityLabel.trim() !== "") element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
  }

  render();

  return {
    element,
    iconElement,
    labelElement,
    indicatorElement,
    update(nextProps = {}) {
      props = normalizeItemProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}

/**
 * Creates controlled Navigation from native DOM primitives. The root is a
 * native <nav> landmark and items remain ordinary buttons/tab stops. Pointer
 * and native keyboard activation request valueChange; selection changes only
 * after the host updates the controlled value.
 */
export function createGuiNavigation(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiNavigation requires a DOM Document-like object");
  }

  const element = document.createElement("nav");
  element.className = "gui-navigation";

  const listElement = document.createElement("div");
  listElement.className = "gui-navigation__list";
  element.append(listElement);

  let props = normalizeProps(initialProps);

  function effectiveDisabled(item) {
    return props.disabled || itemOwnDisabled(item);
  }

  function syncItems() {
    for (const item of itemChildren(listElement)) {
      const selected = itemValue(item) === props.value;
      const disabled = effectiveDisabled(item);
      item.disabled = disabled;
      item.dataset.guiState = selected ? "selected" : "";
      item.setAttribute("aria-disabled", disabled ? "true" : "false");
      if (selected) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    }
  }

  function render() {
    element.dataset.guiComponent = "navigation";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDisabled = props.disabled ? "true" : "false";
    if (props.accessibilityLabel.trim() !== "") element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    syncItems();
  }

  function click(event) {
    const item = closestItem(event.target, listElement);
    if (!item || effectiveDisabled(item)) return;
    const nextValue = itemValue(item);
    if (nextValue !== props.value) props.onValueChange?.(nextValue);
  }

  listElement.addEventListener("click", click);
  render();

  return {
    element,
    listElement,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    refreshItems() {
      syncItems();
    },
    destroy() {
      listElement.removeEventListener("click", click);
    },
  };
}
