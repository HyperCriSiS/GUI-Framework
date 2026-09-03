// SPDX-License-Identifier: AGPL-3.0-or-later

const variants = new Set(["info", "success", "warning", "error"]);
const sizes = new Set(["small", "medium", "large"]);

function assertChoice(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Unknown GUI toast ${label}: ${value}`);
}

function requiredBoolean(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "boolean") {
    throw new TypeError(`GUI toast ${key} must be a boolean`);
  }
  return props[key];
}

function optionalBoolean(props, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "boolean") throw new TypeError(`GUI toast ${key} must be a boolean`);
  return props[key];
}

function requiredString(props, key) {
  if (!Object.prototype.hasOwnProperty.call(props, key) || typeof props[key] !== "string" || props[key].trim() === "") {
    throw new TypeError(`GUI toast ${key} must be a non-empty string`);
  }
  return props[key];
}

function optionalString(props, key, fallback = "") {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  if (typeof props[key] !== "string") throw new TypeError(`GUI toast ${key} must be a string`);
  return props[key];
}

function optionalDuration(props, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(props, key)) return fallback;
  const value = props[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`GUI toast ${key} must be a finite non-negative number`);
  }
  return value;
}

function optionalCallback(props, key) {
  const value = props[key] ?? null;
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`GUI toast ${key} must be a function or null`);
  }
  return value;
}

function normalizeProps(props = {}) {
  const normalized = {
    open: requiredBoolean(props, "open"),
    title: optionalString(props, "title"),
    message: requiredString(props, "message"),
    actionLabel: optionalString(props, "actionLabel"),
    actionValue: optionalString(props, "actionValue"),
    dismissible: optionalBoolean(props, "dismissible", true),
    durationMs: optionalDuration(props, "durationMs", 5000),
    accessibilityLabel: optionalString(props, "accessibilityLabel"),
    variant: props.variant ?? "info",
    size: props.size ?? "medium",
    onOpenChange: optionalCallback(props, "onOpenChange"),
    onActivate: optionalCallback(props, "onActivate"),
  };
  assertChoice(normalized.variant, variants, "variant");
  assertChoice(normalized.size, sizes, "size");
  return normalized;
}

/**
 * Creates a controlled in-app Toast / Notification surface.
 * Auto-dismiss and explicit controls only request state changes through
 * onOpenChange; the caller remains authoritative for the open state.
 */
export function createGuiToast(document, initialProps = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("createGuiToast requires a DOM Document-like object");
  }

  const element = document.createElement("div");
  const contentStack = document.createElement("div");
  const title = document.createElement("div");
  const message = document.createElement("div");
  const action = document.createElement("button");
  const dismiss = document.createElement("button");

  element.className = "gui-toast";
  contentStack.className = "gui-toast__content-stack";
  title.className = "gui-toast__title";
  message.className = "gui-toast__message";
  action.className = "gui-toast__action";
  dismiss.className = "gui-toast__dismiss";
  action.type = "button";
  dismiss.type = "button";
  dismiss.textContent = "×";
  dismiss.setAttribute("aria-label", "Dismiss notification");

  contentStack.append(title, message);
  element.append(contentStack, action, dismiss);

  let props = normalizeProps(initialProps);
  const timerHost = document.defaultView ?? globalThis;
  const setTimer = typeof timerHost.setTimeout === "function" ? timerHost.setTimeout.bind(timerHost) : globalThis.setTimeout.bind(globalThis);
  const clearTimer = typeof timerHost.clearTimeout === "function" ? timerHost.clearTimeout.bind(timerHost) : globalThis.clearTimeout.bind(globalThis);
  const now = () => typeof timerHost.performance?.now === "function" ? timerHost.performance.now() : Date.now();
  let timerId = null;
  let timerStartedAt = 0;
  let remainingMs = props.durationMs;
  let pointerPaused = false;
  let focusPaused = false;

  function clearAutoDismiss() {
    if (timerId !== null) clearTimer(timerId);
    timerId = null;
    timerStartedAt = 0;
  }

  function scheduleAutoDismiss({ reset = false } = {}) {
    clearAutoDismiss();
    if (reset) remainingMs = props.durationMs;
    if (!props.open || props.durationMs === 0 || pointerPaused || focusPaused || remainingMs <= 0) return;
    timerStartedAt = now();
    timerId = setTimer(() => {
      timerId = null;
      timerStartedAt = 0;
      remainingMs = 0;
      props.onOpenChange?.(false);
    }, remainingMs);
  }

  function pauseAutoDismiss(kind) {
    if (kind === "pointer") pointerPaused = true;
    else focusPaused = true;
    if (timerId !== null) {
      remainingMs = Math.max(0, remainingMs - Math.max(0, now() - timerStartedAt));
      clearAutoDismiss();
    }
  }

  function resumeAutoDismiss(kind) {
    if (kind === "pointer") pointerPaused = false;
    else focusPaused = false;
    if (!pointerPaused && !focusPaused) scheduleAutoDismiss();
  }

  function requestClose() {
    clearAutoDismiss();
    props.onOpenChange?.(false);
  }

  function activateAction() {
    props.onActivate?.(props.actionValue);
    requestClose();
  }

  function onFocusOut(event) {
    if (event.relatedTarget && typeof element.contains === "function" && element.contains(event.relatedTarget)) return;
    resumeAutoDismiss("focus");
  }

  function render(previousProps = null) {
    element.dataset.guiComponent = "toast";
    element.dataset.guiVariant = props.variant;
    element.dataset.guiSize = props.size;
    element.dataset.guiDismissible = props.dismissible ? "true" : "false";
    element.dataset.guiDurationMs = String(props.durationMs);
    element.hidden = !props.open;
    element.setAttribute("aria-hidden", props.open ? "false" : "true");
    element.setAttribute("aria-atomic", "true");
    if (props.variant === "error") {
      element.setAttribute("role", "alert");
      element.setAttribute("aria-live", "assertive");
    } else {
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
    }
    if (props.accessibilityLabel.trim() === "") element.removeAttribute("aria-label");
    else element.setAttribute("aria-label", props.accessibilityLabel);

    title.textContent = props.title;
    title.hidden = props.title.trim() === "";
    message.textContent = props.message;
    action.textContent = props.actionLabel;
    action.hidden = props.actionLabel.trim() === "";
    dismiss.hidden = !props.dismissible;

    const shouldResetTimer = previousProps === null ||
      (!previousProps.open && props.open) ||
      previousProps.durationMs !== props.durationMs;
    if (!props.open) {
      remainingMs = props.durationMs;
      clearAutoDismiss();
    } else if (shouldResetTimer) {
      scheduleAutoDismiss({ reset: true });
    }
  }

  function onMouseEnter() { pauseAutoDismiss("pointer"); }
  function onMouseLeave() { resumeAutoDismiss("pointer"); }
  function onFocusIn() { pauseAutoDismiss("focus"); }

  action.addEventListener("click", activateAction);
  dismiss.addEventListener("click", requestClose);
  element.addEventListener("mouseenter", onMouseEnter);
  element.addEventListener("mouseleave", onMouseLeave);
  element.addEventListener("focusin", onFocusIn);
  element.addEventListener("focusout", onFocusOut);
  render();

  return {
    element,
    titleElement: title,
    messageElement: message,
    actionElement: action,
    dismissElement: dismiss,
    update(nextProps = {}) {
      const previousProps = props;
      props = normalizeProps({ ...props, ...nextProps });
      render(previousProps);
    },
    destroy() {
      clearAutoDismiss();
      action.removeEventListener("click", activateAction);
      dismiss.removeEventListener("click", requestClose);
      element.removeEventListener("mouseenter", onMouseEnter);
      element.removeEventListener("mouseleave", onMouseLeave);
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
    },
  };
}
