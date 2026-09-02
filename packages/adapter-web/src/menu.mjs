// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);
const POSITION_GAP_PX = 4;
const VIEWPORT_MARGIN_PX = 4;
let nextMenuId = 1;

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI menu ${label}: ${value}`);
}

function optionalBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return false;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI menu ${key} must be a boolean`);
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI menu ${key} must be a string`);
  return props[key];
}

function requiredBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "boolean") {
    throw new TypeError(`GUI menu ${key} must be a boolean`);
  }
  return props[key];
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI menu ${key} must be a function or null`);
  }
  return value;
}

function optionalTrigger(props) {
  const element = props.triggerElement ?? null;
  if (element !== null && (
    typeof element.addEventListener !== "function"
    || typeof element.setAttribute !== "function"
  )) {
    throw new TypeError("GUI menu triggerElement must be a DOM Element-like object or null");
  }
  return element;
}

function normalizeProps(props = {}) {
  const normalized = {
    open: requiredBoolean(props, "open"),
    triggerElement: optionalTrigger(props),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    disabled: optionalBoolean(props, "disabled"),
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onOpenChange: optionalCallback(props, "onOpenChange"),
    onActivate: optionalCallback(props, "onActivate"),
  };
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

function normalizeItemProps(props = {}) {
  const value = props.value;
  const label = props.label;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("GUI menu item value must be a non-empty string");
  }
  if (typeof label !== "string" || label.trim() === "") {
    throw new TypeError("GUI menu item label must be a non-empty string");
  }
  return {
    value,
    label,
    shortcut: optionalString(props, "shortcut"),
    disabled: optionalBoolean(props, "disabled"),
  };
}

function classTokens(element) {
  return String(element.className ?? "").split(/\s+/).filter(Boolean);
}

function addClassToken(element, token) {
  const tokens = classTokens(element);
  if (!tokens.includes(token)) tokens.push(token);
  element.className = tokens.join(" ");
}

function removeClassToken(element, token) {
  element.className = classTokens(element).filter((value) => value !== token).join(" ");
}

function menuChildren(popupElement) {
  return [...popupElement.children].filter((child) => child?.dataset?.guiMenuItem === "true");
}

function itemOwnDisabled(item) {
  return item.dataset.guiMenuDisabled === "true";
}

function itemDisabled(item) {
  return item.disabled === true || item.getAttribute?.("aria-disabled") === "true";
}

function itemValue(item) {
  return item.dataset.guiMenuValue ?? "";
}

function closestItem(target, popupElement) {
  let current = target;
  while (current && current !== popupElement) {
    if (current.dataset?.guiMenuItem === "true") return current;
    current = current.parentNode ?? null;
  }
  return null;
}

function finiteCoordinate(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`GUI menu ${label} must be a finite number`);
  return number;
}

function rectSize(rect, dimension) {
  const direct = Number(rect?.[dimension]);
  if (Number.isFinite(direct)) return direct;
  const start = dimension === "width" ? Number(rect?.left) : Number(rect?.top);
  const end = dimension === "width" ? Number(rect?.right) : Number(rect?.bottom);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
}

function clamp(value, minimum, maximum) {
  if (maximum < minimum) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function storedAttribute(element, name) {
  return element ? element.getAttribute(name) : null;
}

function restoreAttribute(element, name, value) {
  if (!element) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/** Creates a native action item for a GUI Menu popup. */
export function createGuiMenuItem(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiMenuItem requires a DOM Document-like object");
  }

  const element = document.createElement("button");
  const labelElement = document.createElement("span");
  const shortcutElement = document.createElement("span");
  element.type = "button";
  element.className = "gui-menu__item";
  element.setAttribute("role", "menuitem");
  element.tabIndex = -1;
  labelElement.className = "gui-menu__label";
  shortcutElement.className = "gui-menu__shortcut";
  element.append(labelElement);
  element.append(shortcutElement);

  let props = normalizeItemProps(initialProps);

  function render() {
    element.dataset.guiMenuItem = "true";
    element.dataset.guiMenuValue = props.value;
    element.dataset.guiMenuDisabled = props.disabled ? "true" : "false";
    element.disabled = props.disabled;
    element.setAttribute("aria-disabled", props.disabled ? "true" : "false");
    labelElement.textContent = props.label;
    shortcutElement.textContent = props.shortcut;
    shortcutElement.hidden = props.shortcut === "";
  }

  render();
  return {
    element,
    labelElement,
    shortcutElement,
    update(nextProps = {}) {
      props = normalizeItemProps({ ...props, ...nextProps });
      render();
    },
    destroy() {},
  };
}

/** Creates a semantic separator for a GUI Menu popup. */
export function createGuiMenuSeparator(document) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiMenuSeparator requires a DOM Document-like object");
  }
  const element = document.createElement("div");
  element.className = "gui-menu__separator";
  element.setAttribute("role", "separator");
  return { element, destroy() {} };
}

/**
 * Creates a controlled action menu using native DOM focusable primitives.
 * Trigger clicks and context-menu gestures only request state changes; callers
 * remain the source of truth for `open`. A trigger is optional so hosts can use
 * `openAt(x, y)` for native context-menu invocation without inventing a trigger.
 */
export function createGuiMenu(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiMenu requires a DOM Document-like object");
  }

  let props = normalizeProps(initialProps);
  const triggerElement = props.triggerElement;
  const element = document.createElement("span");
  const popupElement = document.createElement("div");
  const popupId = `gui-menu-${nextMenuId++}`;
  const windowObject = document.defaultView ?? null;
  let activeIndex = -1;
  let contextPoint = null;
  let restoreFocusOnClose = false;
  let focusFrame = null;
  let destroyed = false;
  let wasOpen = props.open;

  element.className = "gui-menu";
  popupElement.className = "gui-menu__popup";
  popupElement.id = popupId;
  popupElement.setAttribute("role", "menu");
  popupElement.tabIndex = -1;
  element.append(popupElement);

  popupElement.style.position = "fixed";
  popupElement.style.left = "0px";
  popupElement.style.top = "0px";

  const triggerHadMenuClass = triggerElement ? classTokens(triggerElement).includes("gui-menu__trigger") : false;
  const triggerAttributes = triggerElement ? {
    haspopup: storedAttribute(triggerElement, "aria-haspopup"),
    expanded: storedAttribute(triggerElement, "aria-expanded"),
    controls: storedAttribute(triggerElement, "aria-controls"),
  } : null;
  if (triggerElement) addClassToken(triggerElement, "gui-menu__trigger");

  function enabledItems() {
    return menuChildren(popupElement).filter((item) => !itemDisabled(item));
  }

  function cancelScheduledFocus() {
    if (focusFrame === null) return;
    windowObject?.cancelAnimationFrame?.(focusFrame);
    focusFrame = null;
  }

  function focusActive() {
    const enabled = enabledItems();
    if (enabled.length === 0) return;
    if (activeIndex < 0 || activeIndex >= enabled.length) activeIndex = 0;
    enabled[activeIndex].focus?.();
  }

  function scheduleFocusActive() {
    cancelScheduledFocus();
    if (typeof windowObject?.requestAnimationFrame === "function") {
      focusFrame = windowObject.requestAnimationFrame(() => {
        focusFrame = null;
        focusActive();
      });
    } else {
      focusActive();
    }
  }

  function syncItems() {
    const all = menuChildren(popupElement);
    for (const item of all) {
      const disabled = props.disabled || itemOwnDisabled(item);
      item.disabled = disabled;
      item.setAttribute("aria-disabled", disabled ? "true" : "false");
      item.tabIndex = -1;
      item.dataset.guiActive = "false";
    }
    const enabled = enabledItems();
    if (enabled.length === 0) {
      activeIndex = -1;
      return;
    }
    if (activeIndex < 0 || activeIndex >= enabled.length) activeIndex = 0;
    const active = enabled[activeIndex];
    active.tabIndex = 0;
    active.dataset.guiActive = "true";
  }

  function moveActive(delta, edge = null) {
    const enabled = enabledItems();
    if (enabled.length === 0) return;
    if (edge === "first") activeIndex = 0;
    else if (edge === "last") activeIndex = enabled.length - 1;
    else activeIndex = (Math.max(activeIndex, 0) + delta + enabled.length) % enabled.length;
    syncItems();
    focusActive();
  }

  function requestOpen(nextOpen) {
    if (props.disabled || nextOpen === props.open) return;
    props.onOpenChange?.(nextOpen);
  }

  function positionFromTrigger(popupWidth, popupHeight) {
    if (!triggerElement || typeof triggerElement.getBoundingClientRect !== "function") {
      return { left: VIEWPORT_MARGIN_PX, top: VIEWPORT_MARGIN_PX, placement: "viewport" };
    }
    const rect = triggerElement.getBoundingClientRect();
    const viewportWidth = Number(windowObject?.innerWidth ?? document.documentElement?.clientWidth);
    const viewportHeight = Number(windowObject?.innerHeight ?? document.documentElement?.clientHeight);
    if (![rect.left, rect.top, rect.right, rect.bottom, viewportWidth, viewportHeight].every(Number.isFinite)) {
      return { left: VIEWPORT_MARGIN_PX, top: VIEWPORT_MARGIN_PX, placement: "viewport" };
    }
    const below = Number(rect.bottom) + POSITION_GAP_PX;
    const above = Number(rect.top) - popupHeight - POSITION_GAP_PX;
    const fitsBelow = below + popupHeight <= viewportHeight - VIEWPORT_MARGIN_PX;
    const fitsAbove = above >= VIEWPORT_MARGIN_PX;
    const placement = fitsBelow || !fitsAbove ? "bottom" : "top";
    return {
      left: Number(rect.left),
      top: placement === "bottom" ? below : above,
      placement,
    };
  }

  function positionFromContext(popupWidth, popupHeight, viewportWidth, viewportHeight) {
    let left = contextPoint.x;
    let top = contextPoint.y;
    if (left + popupWidth > viewportWidth - VIEWPORT_MARGIN_PX) left -= popupWidth;
    if (top + popupHeight > viewportHeight - VIEWPORT_MARGIN_PX) top -= popupHeight;
    return { left, top, placement: "context" };
  }

  function reposition() {
    if (destroyed || !props.open || popupElement.hidden || typeof popupElement.getBoundingClientRect !== "function") return;
    const popupRect = popupElement.getBoundingClientRect();
    const popupWidth = rectSize(popupRect, "width");
    const popupHeight = rectSize(popupRect, "height");
    const viewportWidth = Number(windowObject?.innerWidth ?? document.documentElement?.clientWidth);
    const viewportHeight = Number(windowObject?.innerHeight ?? document.documentElement?.clientHeight);
    if (![viewportWidth, viewportHeight].every(Number.isFinite)) return;

    const position = contextPoint
      ? positionFromContext(popupWidth, popupHeight, viewportWidth, viewportHeight)
      : positionFromTrigger(popupWidth, popupHeight);
    const left = clamp(position.left, VIEWPORT_MARGIN_PX, viewportWidth - VIEWPORT_MARGIN_PX - popupWidth);
    const top = clamp(position.top, VIEWPORT_MARGIN_PX, viewportHeight - VIEWPORT_MARGIN_PX - popupHeight);
    popupElement.dataset.guiResolvedPlacement = position.placement;
    popupElement.style.left = `${left}px`;
    popupElement.style.top = `${top}px`;
  }

  function render() {
    element.dataset.guiComponent = "menu";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiState = props.open ? "expanded" : "";
    element.dataset.guiDisabled = props.disabled ? "true" : "false";
    popupElement.hidden = !props.open;
    popupElement.setAttribute("aria-hidden", props.open ? "false" : "true");
    if (props.accessibilityLabel.trim() !== "") popupElement.setAttribute("aria-label", props.accessibilityLabel);
    else popupElement.removeAttribute("aria-label");

    if (triggerElement) {
      triggerElement.setAttribute("aria-haspopup", "menu");
      triggerElement.setAttribute("aria-expanded", props.open ? "true" : "false");
      triggerElement.setAttribute("aria-controls", popupId);
    }

    syncItems();
    if (props.open) {
      reposition();
      if (!wasOpen) scheduleFocusActive();
    } else {
      cancelScheduledFocus();
      delete popupElement.dataset.guiResolvedPlacement;
      if (wasOpen && restoreFocusOnClose) triggerElement?.focus?.();
      if (wasOpen) contextPoint = null;
      restoreFocusOnClose = false;
    }
    wasOpen = props.open;
  }

  function activate(item) {
    if (!item || itemDisabled(item) || props.disabled) return;
    props.onActivate?.(itemValue(item));
    restoreFocusOnClose = Boolean(triggerElement);
    if (props.open) props.onOpenChange?.(false);
  }

  function triggerClick() {
    if (props.disabled) return;
    contextPoint = null;
    restoreFocusOnClose = false;
    requestOpen(!props.open);
  }

  function triggerContextMenu(event) {
    if (props.disabled) return;
    event.preventDefault?.();
    contextPoint = {
      x: finiteCoordinate(event.clientX, "context x"),
      y: finiteCoordinate(event.clientY, "context y"),
    };
    restoreFocusOnClose = Boolean(triggerElement);
    if (!props.open) requestOpen(true);
    else reposition();
  }

  function popupClick(event) {
    activate(closestItem(event.target, popupElement));
  }

  function popupMouseMove(event) {
    const item = closestItem(event.target, popupElement);
    if (!item || itemDisabled(item)) return;
    const enabled = enabledItems();
    const nextIndex = enabled.indexOf(item);
    if (nextIndex < 0 || nextIndex === activeIndex) return;
    activeIndex = nextIndex;
    syncItems();
  }

  function popupKeyDown(event) {
    if (props.disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault?.();
      moveActive(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault?.();
      moveActive(0, event.key === "Home" ? "first" : "last");
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault?.();
      const focused = closestItem(event.target, popupElement);
      activate(focused ?? enabledItems()[activeIndex] ?? null);
      return;
    }
    if (event.key === "Escape" && props.open) {
      event.preventDefault?.();
      restoreFocusOnClose = Boolean(triggerElement);
      requestOpen(false);
    }
  }

  triggerElement?.addEventListener("click", triggerClick);
  triggerElement?.addEventListener("contextmenu", triggerContextMenu);
  popupElement.addEventListener("click", popupClick);
  popupElement.addEventListener("mousemove", popupMouseMove);
  popupElement.addEventListener("keydown", popupKeyDown);
  windowObject?.addEventListener?.("resize", reposition);
  windowObject?.addEventListener?.("scroll", reposition, true);
  render();

  return {
    element,
    popupElement,
    triggerElement,
    update(nextProps = {}) {
      if (Object.prototype.hasOwnProperty.call(nextProps, "triggerElement") && nextProps.triggerElement !== triggerElement) {
        throw new Error("GUI menu triggerElement cannot be replaced; create a new menu instead");
      }
      props = normalizeProps({ ...props, ...nextProps, triggerElement });
      render();
    },
    refreshItems() {
      syncItems();
      if (props.open) reposition();
    },
    refreshPosition: reposition,
    openAt(x, y) {
      if (props.disabled) return;
      contextPoint = { x: finiteCoordinate(x, "context x"), y: finiteCoordinate(y, "context y") };
      restoreFocusOnClose = false;
      if (!props.open) requestOpen(true);
      else reposition();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelScheduledFocus();
      triggerElement?.removeEventListener("click", triggerClick);
      triggerElement?.removeEventListener("contextmenu", triggerContextMenu);
      popupElement.removeEventListener("click", popupClick);
      popupElement.removeEventListener("mousemove", popupMouseMove);
      popupElement.removeEventListener("keydown", popupKeyDown);
      windowObject?.removeEventListener?.("resize", reposition);
      windowObject?.removeEventListener?.("scroll", reposition, true);
      if (triggerElement) {
        restoreAttribute(triggerElement, "aria-haspopup", triggerAttributes.haspopup);
        restoreAttribute(triggerElement, "aria-expanded", triggerAttributes.expanded);
        restoreAttribute(triggerElement, "aria-controls", triggerAttributes.controls);
        if (!triggerHadMenuClass) removeClassToken(triggerElement, "gui-menu__trigger");
      }
      element.remove?.();
    },
  };
}
