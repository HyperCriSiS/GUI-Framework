// SPDX-License-Identifier: AGPL-3.0-or-later

import { configureWebComponentCapabilities } from "../../adapter-web/src/capabilities.mjs";

export const WEB_APPLICATION_SURFACES = Object.freeze([
  "application",
  "settings",
  "dashboard",
  "embedded",
]);

const MANAGED_HOST_ATTRIBUTES = Object.freeze([
  "data-gui-host",
  "data-gui-surface",
  "data-gui-theme",
  "data-gui-palette",
  "data-gui-capabilities",
]);

function requireAttributeTarget(root) {
  if (
    !root ||
    typeof root.setAttribute !== "function" ||
    typeof root.getAttribute !== "function" ||
    typeof root.removeAttribute !== "function"
  ) {
    throw new TypeError("Web application GUI host root must support DOM-style attributes");
  }
}

function identifier(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeSurface(value) {
  const surface = identifier("surface", value ?? "application");
  if (!WEB_APPLICATION_SURFACES.includes(surface)) {
    throw new RangeError(`Unsupported Web application surface: ${surface}`);
  }
  return surface;
}

function normalizeCapabilities(values = []) {
  if (typeof values === "string") {
    throw new TypeError("availableCapabilities must be an iterable of capability identifiers, not a string");
  }
  if (!values || typeof values[Symbol.iterator] !== "function") {
    throw new TypeError("availableCapabilities must be iterable");
  }
  const capabilities = [];
  for (const rawValue of values) {
    capabilities.push(identifier("capability", rawValue));
  }
  return Object.freeze([...new Set(capabilities)].sort());
}

function normalizeHostState(options = {}, previousState = null) {
  const theme = options.theme ?? previousState?.theme;
  const palette = options.palette ?? previousState?.palette;
  return Object.freeze({
    surface: normalizeSurface(options.surface ?? previousState?.surface ?? "application"),
    theme: identifier("theme", theme),
    palette: identifier("palette", palette),
    availableCapabilities: normalizeCapabilities(
      options.availableCapabilities ?? previousState?.availableCapabilities ?? [],
    ),
  });
}

function captureAttribute(root, name) {
  return {
    present:
      typeof root.hasAttribute === "function"
        ? root.hasAttribute(name)
        : root.getAttribute(name) != null,
    value: root.getAttribute(name),
  };
}

function applyHostState(root, state) {
  root.setAttribute("data-gui-host", "web-application");
  root.setAttribute("data-gui-surface", state.surface);
  root.setAttribute("data-gui-theme", state.theme);
  root.setAttribute("data-gui-palette", state.palette);
  if (state.availableCapabilities.length === 0) {
    root.removeAttribute("data-gui-capabilities");
  } else {
    root.setAttribute("data-gui-capabilities", state.availableCapabilities.join(" "));
  }
}

export function createWebApplicationGuiHost(root, options = {}) {
  requireAttributeTarget(root);
  const previousAttributes = new Map(
    MANAGED_HOST_ATTRIBUTES.map((name) => [name, captureAttribute(root, name)]),
  );
  let state = normalizeHostState(options);
  let destroyed = false;
  applyHostState(root, state);

  function assertActive() {
    if (destroyed) throw new Error("Web application GUI host has been destroyed");
  }

  return Object.freeze({
    getState() {
      return state;
    },
    update(nextOptions = {}) {
      assertActive();
      state = normalizeHostState(nextOptions, state);
      applyHostState(root, state);
      return state;
    },
    configureComponentCapabilities(element, ir) {
      assertActive();
      return configureWebComponentCapabilities(
        element,
        ir,
        {
          paletteId: state.palette,
          themeId: state.theme,
        },
        {
          availableCapabilities: state.availableCapabilities,
        },
      );
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const [name, previous] of previousAttributes) {
        if (previous.present) root.setAttribute(name, previous.value ?? "");
        else root.removeAttribute(name);
      }
    },
  });
}
