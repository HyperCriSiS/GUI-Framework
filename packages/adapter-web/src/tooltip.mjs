// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);
const placements = new Set(["top", "right", "bottom", "left"]);
let nextTooltipId = 1;

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI tooltip ${label}: ${value}`);
}

function requiredBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "boolean") {
    throw new TypeError(`GUI tooltip ${key} must be a boolean`);
  }
  return props[key];
}

function requiredString(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "string" || props[key].trim() === "") {
    throw new TypeError(`GUI tooltip ${key} must be a non-empty string`);
  }
  return props[key];
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI tooltip ${key} must be a function or null`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    open: requiredBoolean(props, "open"),
    content: requiredString(props, "content"),
    placement: props.placement ?? "top",
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onOpenChange: optionalCallback(props, "onOpenChange"),
  };
  assertChoice(normalized.placement, placements, "placement");
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a controlled tooltip around a caller-owned trigger subtree.
 * Hover/focus/Escape only request state changes; the host remains the source of truth.
 */
export function createGuiTooltip(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiTooltip requires a DOM Document-like object");
  }

  const element = document.createElement("span");
  element.className = "gui-tooltip";
  element.style.position = "relative";
  element.style.display = "inline-flex";

  const triggerElement = document.createElement("span");
  triggerElement.className = "gui-tooltip__trigger";

  const popupElement = document.createElement("span");
  popupElement.className = "gui-tooltip__popup";
  popupElement.style.position = "absolute";
  popupElement.style.zIndex = "1000";
  popupElement.style.pointerEvents = "none";
  popupElement.setAttribute("role", "tooltip");
  popupElement.id = `gui-tooltip-${nextTooltipId++}`;

  const contentElement = document.createElement("span");
  contentElement.className = "gui-tooltip__content";
  popupElement.append(contentElement);
  element.append(triggerElement);
  element.append(popupElement);

  let props = normalizeProps(initialProps);
  let pointerInside = false;
  let focusInside = false;

  function requestOpen(nextOpen) {
    if (nextOpen === props.open) return;
    props.onOpenChange?.(nextOpen);
  }

  function containsFocus() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    if (activeElement === triggerElement) return true;
    return typeof triggerElement.contains === "function" && triggerElement.contains(activeElement);
  }

  function render() {
    element.dataset.guiComponent = "tooltip";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiPlacement = props.placement;
    element.dataset.guiOpen = props.open ? "true" : "false";
    popupElement.dataset.guiPlacement = props.placement;
    popupElement.style.top = "";
    popupElement.style.right = "";
    popupElement.style.bottom = "";
    popupElement.style.left = "";
    popupElement.style.transform = "";
    switch (props.placement) {
      case "top":
        popupElement.style.left = "50%";
        popupElement.style.bottom = "calc(100% + 6px)";
        popupElement.style.transform = "translateX(-50%)";
        break;
      case "right":
        popupElement.style.left = "calc(100% + 6px)";
        popupElement.style.top = "50%";
        popupElement.style.transform = "translateY(-50%)";
        break;
      case "bottom":
        popupElement.style.left = "50%";
        popupElement.style.top = "calc(100% + 6px)";
        popupElement.style.transform = "translateX(-50%)";
        break;
      case "left":
        popupElement.style.right = "calc(100% + 6px)";
        popupElement.style.top = "50%";
        popupElement.style.transform = "translateY(-50%)";
        break;
    }
    popupElement.hidden = !props.open;
    contentElement.textContent = props.content;
    if (props.open) triggerElement.setAttribute("aria-describedby", popupElement.id);
    else triggerElement.removeAttribute("aria-describedby");
  }

  function onPointerEnter() {
    pointerInside = true;
    requestOpen(true);
  }

  function onPointerLeave() {
    pointerInside = false;
    if (!focusInside) requestOpen(false);
  }

  function onFocusIn() {
    focusInside = true;
    requestOpen(true);
  }

  function onFocusOut() {
    focusInside = containsFocus();
    if (!focusInside && !pointerInside) requestOpen(false);
  }

  function onKeyDown(event) {
    if (event.key !== "Escape" || !props.open) return;
    event.preventDefault();
    requestOpen(false);
  }

  triggerElement.addEventListener("pointerenter", onPointerEnter);
  triggerElement.addEventListener("pointerleave", onPointerLeave);
  triggerElement.addEventListener("focusin", onFocusIn);
  triggerElement.addEventListener("focusout", onFocusOut);
  triggerElement.addEventListener("keydown", onKeyDown);
  render();

  return {
    element,
    triggerElement,
    popupElement,
    contentElement,
    update(nextProps = {}) {
      props = normalizeProps({ ...props, ...nextProps });
      render();
    },
    destroy() {
      triggerElement.removeEventListener("pointerenter", onPointerEnter);
      triggerElement.removeEventListener("pointerleave", onPointerLeave);
      triggerElement.removeEventListener("focusin", onFocusIn);
      triggerElement.removeEventListener("focusout", onFocusOut);
      triggerElement.removeEventListener("keydown", onKeyDown);
    },
  };
}
