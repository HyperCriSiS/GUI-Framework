// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);
const radioGroupsByDocument = new WeakMap();

function groupRegistry(document) {
  let registry = radioGroupsByDocument.get(document);
  if (!registry) {
    registry = new Map();
    radioGroupsByDocument.set(document, registry);
  }
  return registry;
}

function radioGroup(document, groupName) {
  const registry = groupRegistry(document);
  let group = registry.get(groupName);
  if (!group) {
    group = { items: new Set(), active: null };
    registry.set(groupName, group);
  }
  return group;
}

function enabledItems(group) {
  return [...group.items].filter((item) => !item.isDisabled());
}

function syncGroupTabStops(group) {
  const enabled = enabledItems(group);
  const selected = enabled.find((item) => item.isSelected());
  const active = enabled.includes(group.active) ? group.active : null;
  const tabStop = active ?? selected ?? enabled[0] ?? null;
  group.active = tabStop;
  for (const item of group.items) item.element.tabIndex = item === tabStop ? 0 : -1;
}

function unregisterRadio(document, groupName, item) {
  const registry = radioGroupsByDocument.get(document);
  const group = registry?.get(groupName);
  if (!group) return;
  group.items.delete(item);
  if (group.active === item) group.active = null;
  if (group.items.size === 0) {
    registry.delete(groupName);
    return;
  }
  syncGroupTabStops(group);
}

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
  let registeredGroupName = props.groupName;
  const groupItem = {
    element,
    isDisabled: () => props.disabled,
    isSelected: () => props.selected,
    requestSelection: () => selectedChange(),
  };
  radioGroup(document, registeredGroupName).items.add(groupItem);

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
    const group = radioGroup(document, registeredGroupName);
    if (props.selected && !props.disabled) group.active = groupItem;
    syncGroupTabStops(group);
  }

  function selectedChange() {
    if (props.disabled || props.selected) return;
    const group = radioGroup(document, registeredGroupName);
    group.active = groupItem;
    syncGroupTabStops(group);
    props.onSelectedChange?.(true);
  }

  function keydown(event) {
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction || props.disabled) return;
    const group = radioGroup(document, registeredGroupName);
    const enabled = enabledItems(group);
    if (enabled.length < 2) return;
    const currentIndex = enabled.indexOf(groupItem);
    if (currentIndex < 0) return;
    const target = enabled[(currentIndex + direction + enabled.length) % enabled.length];
    event.preventDefault?.();
    group.active = target;
    syncGroupTabStops(group);
    target.element.focus?.();
    target.requestSelection();
  }

  element.addEventListener("click", selectedChange);
  element.addEventListener("keydown", keydown);
  render();

  return {
    element,
    update(nextProps = {}) {
      const next = normalizeProps({ ...props, ...nextProps });
      if (next.groupName !== registeredGroupName) {
        unregisterRadio(document, registeredGroupName, groupItem);
        registeredGroupName = next.groupName;
        radioGroup(document, registeredGroupName).items.add(groupItem);
      }
      props = next;
      render();
    },
    destroy() {
      element.removeEventListener("click", selectedChange);
      element.removeEventListener("keydown", keydown);
      unregisterRadio(document, registeredGroupName, groupItem);
    },
  };
}
