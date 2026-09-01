// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);
let nextTabsId = 1;

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI tabs ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI tabs ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI tabs ${key} must be a string`);
  return props[key];
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI tabs ${key} must be a function or null`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    value: props.value,
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    disabled: optionalBoolean(props, "disabled"),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onValueChange: optionalCallback(props, "onValueChange"),
  };
  if (typeof normalized.value !== "string") throw new TypeError("GUI tabs value must be a string");
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

function normalizeTabProps(props = {}) {
  const value = props.value;
  const label = props.label;
  if (typeof value !== "string") throw new TypeError("GUI tab value must be a string");
  if (typeof label !== "string" || label.trim() === "") {
    throw new TypeError("GUI tab label must be a non-empty string");
  }
  return { value, label, disabled: optionalBoolean(props, "disabled") };
}

function tabChildren(tabListElement) {
  return [...tabListElement.children].filter((child) => child?.dataset?.guiTabsTab === "true");
}

function tabValue(tab) {
  return tab.dataset.guiTabsValue ?? "";
}

function tabOwnDisabled(tab) {
  return tab.dataset.guiTabsDisabled === "true";
}

function closestTab(target, tabListElement) {
  let current = target;
  while (current && current !== tabListElement) {
    if (current.dataset?.guiTabsTab === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}

/**
 * Creates a caller-owned native tab button for GuiTabs.
 * Selection and roving focus are synchronized by the parent Tabs adapter.
 */
export function createGuiTab(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiTab requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  element.type = "button";
  element.className = "gui-tabs__tab";
  element.setAttribute("role", "tab");
  if (!element.id) element.id = `gui-tabs-tab-${nextTabsId++}`;

  const labelElement = document.createElement("span");
  const indicatorElement = document.createElement("span");
  indicatorElement.className = "gui-tabs__indicator";
  indicatorElement.setAttribute("aria-hidden", "true");
  element.append(labelElement);
  element.append(indicatorElement);

  let props = normalizeTabProps(initialProps);

  function render() {
    element.dataset.guiTabsTab = "true";
    element.dataset.guiTabsValue = props.value;
    element.dataset.guiTabsDisabled = props.disabled ? "true" : "false";
    labelElement.textContent = props.label;
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
  }

  render();

  return {
    element,
    indicatorElement,
    update(nextProps = {}) {
      props = normalizeTabProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}

/**
 * Creates controlled horizontal Tabs from native DOM primitives.
 * ArrowLeft/ArrowRight/Home/End move a roving focus stop without changing the
 * controlled value. Enter, Space, and pointer activation request valueChange.
 * This manual-activation model keeps expensive/remote panels from changing
 * merely because keyboard focus moved.
 */
export function createGuiTabs(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiTabs requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  element.className = "gui-tabs";

  const tabListElement = document.createElement("div");
  tabListElement.className = "gui-tabs__tab-list";
  tabListElement.setAttribute("role", "tablist");
  tabListElement.setAttribute("aria-orientation", "horizontal");

  const panelElement = document.createElement("div");
  panelElement.className = "gui-tabs__panel";
  panelElement.setAttribute("role", "tabpanel");
  if (!panelElement.id) panelElement.id = `gui-tabs-panel-${nextTabsId++}`;

  element.append(tabListElement);
  element.append(panelElement);

  let props = normalizeProps(initialProps);
  let activeValue = null;

  function effectiveDisabled(tab) {
    return props.disabled || tabOwnDisabled(tab);
  }

  function enabledTabs() {
    return tabChildren(tabListElement).filter((tab) => !effectiveDisabled(tab));
  }

  function syncTabs() {
    const tabs = tabChildren(tabListElement);
    const enabled = tabs.filter((tab) => !effectiveDisabled(tab));
    const selected = tabs.find((tab) => tabValue(tab) === props.value) ?? null;
    const active = enabled.find((tab) => tabValue(tab) === activeValue) ?? null;
    const selectedEnabled = selected && !effectiveDisabled(selected) ? selected : null;
    const tabStop = active ?? selectedEnabled ?? enabled[0] ?? null;
    activeValue = tabStop ? tabValue(tabStop) : null;

    for (const tab of tabs) {
      const isSelected = tab === selected;
      const isDisabled = effectiveDisabled(tab);
      tab.disabled = isDisabled;
      tab.tabIndex = tab === tabStop ? 0 : -1;
      tab.dataset.guiState = isSelected ? "selected" : "";
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
      tab.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      tab.setAttribute("aria-controls", panelElement.id);
    }

    if (selected) {
      panelElement.hidden = false;
      panelElement.setAttribute("aria-labelledby", selected.id);
      panelElement.dataset.guiTabsValue = tabValue(selected);
    } else {
      panelElement.hidden = true;
      panelElement.removeAttribute("aria-labelledby");
      delete panelElement.dataset.guiTabsValue;
    }
  }

  function render() {
    element.dataset.guiComponent = "tabs";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDisabled = props.disabled ? "true" : "false";
    if (props.accessibilityLabel.trim() !== "") tabListElement.setAttribute("aria-label", props.accessibilityLabel);
    else tabListElement.removeAttribute("aria-label");
    syncTabs();
  }

  function requestValue(tab) {
    if (!tab || effectiveDisabled(tab)) return;
    activeValue = tabValue(tab);
    syncTabs();
    if (activeValue !== props.value) props.onValueChange?.(activeValue);
  }

  function moveFocus(fromTab, direction = 0, edge = null) {
    const enabled = enabledTabs();
    if (enabled.length === 0) return null;
    let index = enabled.indexOf(fromTab);
    if (edge === "first") index = 0;
    else if (edge === "last") index = enabled.length - 1;
    else index = ((index < 0 ? 0 : index) + direction + enabled.length) % enabled.length;
    const target = enabled[index];
    activeValue = tabValue(target);
    syncTabs();
    target.focus?.();
    return target;
  }

  function click(event) {
    const tab = closestTab(event.target, tabListElement);
    if (!tab || effectiveDisabled(tab)) return;
    requestValue(tab);
  }

  function keydown(event) {
    const tab = closestTab(event.target, tabListElement);
    if (!tab || effectiveDisabled(tab)) return;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault?.();
      moveFocus(tab, event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault?.();
      moveFocus(tab, 0, event.key === "Home" ? "first" : "last");
      return;
    }
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault?.();
      requestValue(tab);
    }
  }

  tabListElement.addEventListener("click", click);
  tabListElement.addEventListener("keydown", keydown);
  render();

  return {
    element,
    tabListElement,
    panelElement,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    refreshTabs() {
      syncTabs();
    },
    destroy() {
      tabListElement.removeEventListener("click", click);
      tabListElement.removeEventListener("keydown", keydown);
    },
  };
}
