// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["standard"]);
const sizes = new Set(["small", "medium", "large"]);
const placements = new Set(["top", "bottom", "left", "right"]);
const oppositePlacement = { top: "bottom", bottom: "top", left: "right", right: "left" };
const POSITION_GAP_PX = 8;
const VIEWPORT_MARGIN_PX = 4;
let tooltipId = 0;

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI tooltip ${label}: ${value}`);
}

function requiredBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "boolean") {
    throw new TypeError(`GUI tooltip ${key} must be a boolean`);
  }
  return props[key];
}

function requiredText(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "string" || props[key].trim() === "") {
    throw new TypeError(`GUI tooltip ${key} must be a non-empty string`);
  }
  return props[key];
}

function requiredTrigger(props) {
  const element = props.triggerElement;
  if (!element || typeof element.addEventListener !== "function" || typeof element.setAttribute !== "function") {
    throw new TypeError("GUI tooltip triggerElement must be a DOM Element-like object");
  }
  return element;
}

function normalizeProps(props = {}) {
  const normalized = {
    open: requiredBoolean(props, "open"),
    triggerElement: requiredTrigger(props),
    content: requiredText(props, "content"),
    placement: props.placement ?? "top",
    variant: props.variant ?? "standard",
    size: props.size ?? "medium",
    onOpenChange: props.onOpenChange ?? null,
  };
  if (normalized.onOpenChange !== null && typeof normalized.onOpenChange !== "function") {
    throw new TypeError("GUI tooltip onOpenChange must be a function or null");
  }
  assertChoice(normalized.placement, placements, "placement");
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
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

function attributeTokens(element, name) {
  return String(element.getAttribute(name) ?? "").split(/\s+/).filter(Boolean);
}

function addAttributeToken(element, name, token) {
  const tokens = attributeTokens(element, name);
  if (!tokens.includes(token)) tokens.push(token);
  if (tokens.length > 0) element.setAttribute(name, tokens.join(" "));
}

function removeAttributeToken(element, name, token) {
  const tokens = attributeTokens(element, name).filter((value) => value !== token);
  if (tokens.length > 0) element.setAttribute(name, tokens.join(" "));
  else element.removeAttribute(name);
}

function rectSize(rect, dimension) {
  const direct = Number(rect?.[dimension]);
  if (Number.isFinite(direct)) return direct;
  const start = dimension === "width" ? Number(rect?.left) : Number(rect?.top);
  const end = dimension === "width" ? Number(rect?.right) : Number(rect?.bottom);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
}

function coordinates(placement, triggerRect, popupWidth, popupHeight) {
  const triggerWidth = rectSize(triggerRect, "width");
  const triggerHeight = rectSize(triggerRect, "height");
  const centerX = Number(triggerRect.left) + triggerWidth / 2;
  const centerY = Number(triggerRect.top) + triggerHeight / 2;
  switch (placement) {
    case "bottom":
      return { left: centerX - popupWidth / 2, top: Number(triggerRect.bottom) + POSITION_GAP_PX };
    case "left":
      return { left: Number(triggerRect.left) - popupWidth - POSITION_GAP_PX, top: centerY - popupHeight / 2 };
    case "right":
      return { left: Number(triggerRect.right) + POSITION_GAP_PX, top: centerY - popupHeight / 2 };
    default:
      return { left: centerX - popupWidth / 2, top: Number(triggerRect.top) - popupHeight - POSITION_GAP_PX };
  }
}

function primaryAxisOverflow(placement, position, popupWidth, popupHeight, viewportWidth, viewportHeight) {
  if (placement === "top" || placement === "bottom") {
    const before = Math.max(0, VIEWPORT_MARGIN_PX - position.top);
    const after = Math.max(0, position.top + popupHeight - (viewportHeight - VIEWPORT_MARGIN_PX));
    return before + after;
  }
  const before = Math.max(0, VIEWPORT_MARGIN_PX - position.left);
  const after = Math.max(0, position.left + popupWidth - (viewportWidth - VIEWPORT_MARGIN_PX));
  return before + after;
}

function clamp(value, minimum, maximum) {
  if (maximum < minimum) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Creates a controlled, non-interactive tooltip for an existing host trigger.
 * Hover/focus/Escape only request open-state changes; the caller must update
 * `open` to render the requested state. The popup remains a portal-ready root
 * so the host can mount it inside the active theme scope without moving or
 * wrapping the semantic trigger element.
 */
export function createGuiTooltip(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiTooltip requires a DOM Document-like object");
  }

  let props = normalizeProps(initialProps);
  const triggerElement = props.triggerElement;
  const element = document.createElement("span");
  const popupElement = document.createElement("span");
  const contentElement = document.createElement("span");
  const popupId = `gui-tooltip-${++tooltipId}`;
  const windowObject = document.defaultView ?? null;
  let hovered = false;
  let focused = false;
  let destroyed = false;
  let repositionFrame = null;

  element.className = "gui-tooltip";
  popupElement.className = "gui-tooltip__popup";
  contentElement.className = "gui-tooltip__content";
  popupElement.id = popupId;
  popupElement.setAttribute("role", "tooltip");
  popupElement.append(contentElement);
  element.append(popupElement);
  const triggerHadTooltipClass = classTokens(triggerElement).includes("gui-tooltip__trigger");
  addClassToken(triggerElement, "gui-tooltip__trigger");

  popupElement.style.position = "fixed";
  popupElement.style.left = "0px";
  popupElement.style.top = "0px";
  popupElement.style.pointerEvents = "none";

  function requestOpen(nextOpen) {
    if (nextOpen === props.open) return;
    props.onOpenChange?.(nextOpen);
  }

  function cancelScheduledReposition() {
    if (repositionFrame === null) return;
    windowObject?.cancelAnimationFrame?.(repositionFrame);
    repositionFrame = null;
  }

  function scheduleReposition() {
    cancelScheduledReposition();
    if (typeof windowObject?.requestAnimationFrame !== "function") return;
    repositionFrame = windowObject.requestAnimationFrame(() => {
      repositionFrame = null;
      reposition();
    });
  }

  function reposition() {
    if (destroyed || !props.open || popupElement.hidden) return;
    if (typeof triggerElement.getBoundingClientRect !== "function" || typeof popupElement.getBoundingClientRect !== "function") return;
    const triggerRect = triggerElement.getBoundingClientRect();
    const popupRect = popupElement.getBoundingClientRect();
    const popupWidth = rectSize(popupRect, "width");
    const popupHeight = rectSize(popupRect, "height");
    const viewportWidth = Number(windowObject?.innerWidth ?? document.documentElement?.clientWidth);
    const viewportHeight = Number(windowObject?.innerHeight ?? document.documentElement?.clientHeight);
    if (![triggerRect.left, triggerRect.top, triggerRect.right, triggerRect.bottom, viewportWidth, viewportHeight].every(Number.isFinite)) return;

    let resolvedPlacement = props.placement;
    let position = coordinates(resolvedPlacement, triggerRect, popupWidth, popupHeight);
    const preferredOverflow = primaryAxisOverflow(
      resolvedPlacement,
      position,
      popupWidth,
      popupHeight,
      viewportWidth,
      viewportHeight,
    );
    if (preferredOverflow > 0) {
      const opposite = oppositePlacement[resolvedPlacement];
      const oppositePosition = coordinates(opposite, triggerRect, popupWidth, popupHeight);
      const oppositeOverflow = primaryAxisOverflow(
        opposite,
        oppositePosition,
        popupWidth,
        popupHeight,
        viewportWidth,
        viewportHeight,
      );
      if (oppositeOverflow < preferredOverflow) {
        resolvedPlacement = opposite;
        position = oppositePosition;
      }
    }

    position.left = clamp(position.left, VIEWPORT_MARGIN_PX, viewportWidth - VIEWPORT_MARGIN_PX - popupWidth);
    position.top = clamp(position.top, VIEWPORT_MARGIN_PX, viewportHeight - VIEWPORT_MARGIN_PX - popupHeight);
    popupElement.dataset.guiResolvedPlacement = resolvedPlacement;
    popupElement.style.left = `${Math.round(position.left)}px`;
    popupElement.style.top = `${Math.round(position.top)}px`;
  }

  function render() {
    element.dataset.guiComponent = "tooltip";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiPlacement = props.placement;
    contentElement.textContent = props.content;
    popupElement.hidden = !props.open;
    popupElement.setAttribute("aria-hidden", props.open ? "false" : "true");
    if (props.open) {
      addAttributeToken(triggerElement, "aria-describedby", popupId);
      reposition();
      scheduleReposition();
    } else {
      cancelScheduledReposition();
      removeAttributeToken(triggerElement, "aria-describedby", popupId);
      delete popupElement.dataset.guiResolvedPlacement;
    }
  }

  function onMouseEnter() {
    if (hovered) return;
    hovered = true;
    requestOpen(true);
  }

  function onMouseLeave() {
    if (!hovered) return;
    hovered = false;
    if (!focused) requestOpen(false);
  }

  function onFocusIn() {
    if (focused) return;
    focused = true;
    requestOpen(true);
  }

  function onFocusOut(event) {
    const nextTarget = event?.relatedTarget ?? null;
    if (nextTarget && typeof triggerElement.contains === "function" && triggerElement.contains(nextTarget)) return;
    if (!focused) return;
    focused = false;
    if (!hovered) requestOpen(false);
  }

  function onKeyDown(event) {
    if (event?.key !== "Escape" || !props.open) return;
    event.preventDefault?.();
    requestOpen(false);
  }

  triggerElement.addEventListener("mouseenter", onMouseEnter);
  triggerElement.addEventListener("mouseleave", onMouseLeave);
  triggerElement.addEventListener("focusin", onFocusIn);
  triggerElement.addEventListener("focusout", onFocusOut);
  triggerElement.addEventListener("keydown", onKeyDown);
  windowObject?.addEventListener?.("resize", reposition);
  windowObject?.addEventListener?.("scroll", reposition, true);
  render();

  return {
    element,
    popupElement,
    contentElement,
    triggerElement,
    update(nextProps = {}) {
      if (Object.prototype.hasOwnProperty.call(nextProps, "triggerElement") && nextProps.triggerElement !== triggerElement) {
        throw new Error("GUI tooltip triggerElement cannot be replaced; create a new tooltip instead");
      }
      props = normalizeProps({ ...props, ...nextProps, triggerElement });
      render();
    },
    refreshPosition: reposition,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelScheduledReposition();
      triggerElement.removeEventListener("mouseenter", onMouseEnter);
      triggerElement.removeEventListener("mouseleave", onMouseLeave);
      triggerElement.removeEventListener("focusin", onFocusIn);
      triggerElement.removeEventListener("focusout", onFocusOut);
      triggerElement.removeEventListener("keydown", onKeyDown);
      windowObject?.removeEventListener?.("resize", reposition);
      windowObject?.removeEventListener?.("scroll", reposition, true);
      removeAttributeToken(triggerElement, "aria-describedby", popupId);
      if (!triggerHadTooltipClass) removeClassToken(triggerElement, "gui-tooltip__trigger");
      element.remove?.();
    },
  };
}
