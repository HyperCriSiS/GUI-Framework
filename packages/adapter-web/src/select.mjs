// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);
let nextSelectId = 1;

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI select ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI select ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI select ${key} must be a string`);
  return props[key];
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI select ${key} must be a function or null`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    value: props.value,
    placeholder: optionalString(props, "placeholder"),
    query: optionalString(props, "query"),
    editable: optionalBoolean(props, "editable"),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    expanded: optionalBoolean(props, "expanded"),
    disabled: optionalBoolean(props, "disabled"),
    error: optionalBoolean(props, "error"),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onValueChange: optionalCallback(props, "onValueChange"),
    onQueryChange: optionalCallback(props, "onQueryChange"),
    onExpandedChange: optionalCallback(props, "onExpandedChange"),
  };
  if (typeof normalized.value !== "string") throw new TypeError("GUI select value must be a string");
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

function normalizeOptionProps(props = {}) {
  const value = props.value;
  const label = props.label;
  if (typeof value !== "string") throw new TypeError("GUI select option value must be a string");
  if (typeof label !== "string" || label.trim() === "") {
    throw new TypeError("GUI select option label must be a non-empty string");
  }
  return { value, label, disabled: optionalBoolean(props, "disabled") };
}

function optionChildren(popupElement) {
  return [...popupElement.children].filter((child) => child?.dataset?.guiSelectOption === "true");
}

function optionDisabled(option) {
  return option.dataset.guiSelectDisabled === "true";
}

function optionValue(option) {
  return option.dataset.guiSelectValue ?? "";
}

function closestOption(target, popupElement) {
  let current = target;
  while (current && current !== popupElement) {
    if (current.dataset?.guiSelectOption === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}

/**
 * Creates a native DOM option child for a GUI Select / ComboBox listbox.
 * The Select adapter owns selection semantics; callers own option nodes and labels.
 */
export function createGuiSelectOption(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiSelectOption requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  element.className = "gui-select__option";
  element.setAttribute("role", "option");
  if (!element.id) element.id = `gui-select-option-${nextSelectId++}`;

  let props = normalizeOptionProps(initialProps);

  function render() {
    element.dataset.guiSelectOption = "true";
    element.dataset.guiSelectValue = props.value;
    element.dataset.guiSelectDisabled = props.disabled ? "true" : "false";
    element.textContent = props.label;
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
  }

  render();
  return {
    element,
    update(nextProps = {}) {
      props = normalizeOptionProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}

/**
 * Creates a controlled ARIA combobox from native DOM primitives.
 * `editable=false` behaves as a Select via a read-only text input; `editable=true`
 * exposes normal text editing and queryChange. The popup remains controlled by
 * the neutral expanded property, while option children remain caller-owned.
 */
export function createGuiSelect(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiSelect requires a DOM Document-like object");
  }

  const element = document.createElement("input");
  element.type = "text";
  element.className = "gui-select";
  element.setAttribute("role", "combobox");
  element.setAttribute("aria-haspopup", "listbox");
  element.setAttribute("autocomplete", "off");

  const popupElement = document.createElement("div");
  popupElement.className = "gui-select__popup";
  popupElement.setAttribute("role", "listbox");
  if (!popupElement.id) popupElement.id = `gui-select-popup-${nextSelectId++}`;
  element.setAttribute("aria-controls", popupElement.id);

  let props = normalizeProps(initialProps);
  let activeIndex = -1;
  let composing = false;
  let lastInputQuery = props.query;

  function enabledOptions() {
    return optionChildren(popupElement).filter((option) => !optionDisabled(option));
  }

  function syncOptions() {
    const options = optionChildren(popupElement);
    for (const option of options) {
      option.setAttribute("aria-selected", optionValue(option) === props.value ? "true" : "false");
      option.dataset.guiActive = "false";
    }

    const enabled = enabledOptions();
    if (enabled.length === 0) {
      activeIndex = -1;
      element.removeAttribute("aria-activedescendant");
      return;
    }

    if (activeIndex < 0 || activeIndex >= enabled.length) {
      const selectedIndex = enabled.findIndex((option) => optionValue(option) === props.value);
      activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    }

    if (props.expanded) {
      const active = enabled[activeIndex];
      active.dataset.guiActive = "true";
      element.setAttribute("aria-activedescendant", active.id);
    } else {
      element.removeAttribute("aria-activedescendant");
    }
  }

  function render() {
    element.dataset.guiComponent = "select";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiEditable = props.editable ? "true" : "false";
    element.dataset.guiState = props.expanded ? "expanded" : "";
    if (!props.editable || !composing) element.value = props.editable ? props.query : props.value;
    element.placeholder = props.placeholder;
    element.disabled = props.disabled;
    element.readOnly = !props.editable;
    element.setAttribute("aria-expanded", props.expanded ? "true" : "false");
    element.setAttribute("aria-autocomplete", props.editable ? "list" : "none");

    if (props.accessibilityLabel.trim() !== "") element.setAttribute("aria-label", props.accessibilityLabel);
    else element.removeAttribute("aria-label");
    if (props.error) element.setAttribute("aria-invalid", "true");
    else element.removeAttribute("aria-invalid");

    popupElement.hidden = !props.expanded;
    popupElement.dataset.guiExpanded = props.expanded ? "true" : "false";
    syncOptions();
  }

  function requestExpanded(nextExpanded) {
    if (props.disabled || nextExpanded === props.expanded) return;
    props.onExpandedChange?.(nextExpanded);
  }

  function commitOption(option) {
    if (!option || optionDisabled(option) || props.disabled) return;
    props.onValueChange?.(optionValue(option));
    if (props.expanded) props.onExpandedChange?.(false);
  }

  function moveActive(delta, edge = null) {
    const enabled = enabledOptions();
    if (enabled.length === 0) return;
    if (edge === "first") activeIndex = 0;
    else if (edge === "last") activeIndex = enabled.length - 1;
    else activeIndex = (Math.max(activeIndex, 0) + delta + enabled.length) % enabled.length;

    for (const option of enabled) option.dataset.guiActive = "false";
    const active = enabled[activeIndex];
    active.dataset.guiActive = "true";
    element.setAttribute("aria-activedescendant", active.id);
  }

  function input(event) {
    if (props.disabled || !props.editable) return;
    if (event.isComposing === true) composing = true;
    lastInputQuery = event.currentTarget.value;
    props.onQueryChange?.(lastInputQuery);
    if (!props.expanded) props.onExpandedChange?.(true);
  }

  function compositionStart() {
    if (props.disabled || !props.editable) return;
    composing = true;
  }

  function compositionEnd(event) {
    if (props.disabled || !props.editable) {
      composing = false;
      return;
    }
    composing = false;
    const committedQuery = event.currentTarget.value;
    queueMicrotask(() => {
      if (props.disabled || !props.editable || composing) return;
      if (element.value !== committedQuery || lastInputQuery === committedQuery) return;
      lastInputQuery = committedQuery;
      props.onQueryChange?.(committedQuery);
      if (!props.expanded) props.onExpandedChange?.(true);
    });
  }

  function click() {
    if (props.disabled) return;
    requestExpanded(props.editable ? true : !props.expanded);
  }

  function keydown(event) {
    if (props.disabled) return;
    if (props.editable && (composing || event.isComposing === true || event.keyCode === 229)) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault?.();
      if (!props.expanded) requestExpanded(true);
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" && props.expanded) {
      event.preventDefault?.(); moveActive(0, "first"); return;
    }
    if (event.key === "End" && props.expanded) {
      event.preventDefault?.(); moveActive(0, "last"); return;
    }
    if (event.key === "Enter") {
      event.preventDefault?.();
      if (!props.expanded) requestExpanded(true);
      else commitOption(enabledOptions()[activeIndex] ?? null);
      return;
    }
    if (event.key === "Escape" && props.expanded) {
      event.preventDefault?.(); requestExpanded(false);
    }
  }

  function popupClick(event) {
    commitOption(closestOption(event.target, popupElement));
  }

  element.addEventListener("compositionstart", compositionStart);
  element.addEventListener("compositionend", compositionEnd);
  element.addEventListener("input", input);
  element.addEventListener("click", click);
  element.addEventListener("keydown", keydown);
  popupElement.addEventListener("click", popupClick);
  render();

  return {
    element,
    popupElement,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    refreshOptions() {
      syncOptions();
    },
    destroy() {
      element.removeEventListener("compositionstart", compositionStart);
      element.removeEventListener("compositionend", compositionEnd);
      element.removeEventListener("input", input);
      element.removeEventListener("click", click);
      element.removeEventListener("keydown", keydown);
      popupElement.removeEventListener("click", popupClick);
    },
  };
}
