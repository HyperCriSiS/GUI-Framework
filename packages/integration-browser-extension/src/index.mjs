// SPDX-License-Identifier: AGPL-3.0-or-later

export const BROWSER_EXTENSION_SURFACES = Object.freeze([
  "popup",
  "options",
  "side-panel",
  "devtools",
  "content-script",
]);

export const DEFAULT_BROWSER_EXTENSION_STYLESHEET_PATHS = Object.freeze([
  "gui-framework/gui-framework.css",
]);

const managedHostAttributes = Object.freeze([
  "data-gui-host",
  "data-gui-surface",
  "data-gui-theme",
  "data-gui-palette",
]);

function requireAttributeTarget(root) {
  if (!root || typeof root.setAttribute !== "function" || typeof root.getAttribute !== "function" || typeof root.removeAttribute !== "function") {
    throw new TypeError("Browser extension GUI host root must support DOM-style attributes");
  }
}

function optionalIdentifier(name, value) {
  if (value == null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string when provided`);
  }
  return value.trim();
}

function normalizeSurface(value) {
  const surface = optionalIdentifier("surface", value) ?? "popup";
  if (!BROWSER_EXTENSION_SURFACES.includes(surface)) {
    throw new RangeError(`Unsupported browser extension surface: ${surface}`);
  }
  return surface;
}

function normalizeHostState(options = {}, previousState = {}) {
  return Object.freeze({
    surface: normalizeSurface(options.surface ?? previousState.surface),
    theme: optionalIdentifier("theme", options.theme ?? previousState.theme),
    palette: optionalIdentifier("palette", options.palette ?? previousState.palette),
  });
}

function captureAttribute(root, name) {
  return {
    present: typeof root.hasAttribute === "function" ? root.hasAttribute(name) : root.getAttribute(name) != null,
    value: root.getAttribute(name),
  };
}

function applyHostState(root, state) {
  root.setAttribute("data-gui-host", "browser-extension");
  root.setAttribute("data-gui-surface", state.surface);
  if (state.theme == null) root.removeAttribute("data-gui-theme");
  else root.setAttribute("data-gui-theme", state.theme);
  if (state.palette == null) root.removeAttribute("data-gui-palette");
  else root.setAttribute("data-gui-palette", state.palette);
}

export function createBrowserExtensionGuiHost(root, options = {}) {
  requireAttributeTarget(root);
  const previousAttributes = new Map(managedHostAttributes.map((name) => [name, captureAttribute(root, name)]));
  let state = normalizeHostState(options);
  let destroyed = false;
  applyHostState(root, state);

  return Object.freeze({
    getState() {
      return state;
    },
    update(nextOptions = {}) {
      if (destroyed) throw new Error("Browser extension GUI host has been destroyed");
      state = normalizeHostState(nextOptions, state);
      applyHostState(root, state);
      return state;
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

export function resolveBrowserExtensionAssetUrl(runtimeGetURL, path) {
  if (typeof runtimeGetURL !== "function") {
    throw new TypeError("runtimeGetURL must be a browser.runtime.getURL/chrome.runtime.getURL compatible function");
  }
  const normalizedPath = optionalIdentifier("path", path)?.replace(/^\/+/, "");
  if (!normalizedPath) throw new TypeError("path must resolve to a non-empty extension-relative path");
  return runtimeGetURL(normalizedPath);
}

function stylesheetMarker(path) {
  return path.replace(/^\/+/, "");
}

function findInstalledStylesheet(target, path) {
  if (typeof target.querySelectorAll !== "function") return null;
  for (const element of target.querySelectorAll("[data-gui-browser-extension-stylesheet]")) {
    if (element.getAttribute("data-gui-browser-extension-stylesheet") === path) return element;
  }
  return null;
}

export function installBrowserExtensionStyles(document, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("document must provide createElement");
  }
  const target = options.target ?? document.head;
  if (!target || typeof target.append !== "function") {
    throw new TypeError("stylesheet target must provide append");
  }
  const runtimeGetURL = options.runtimeGetURL;
  const stylesheetPaths = options.stylesheetPaths ?? DEFAULT_BROWSER_EXTENSION_STYLESHEET_PATHS;
  if (!Array.isArray(stylesheetPaths) || stylesheetPaths.length === 0) {
    throw new TypeError("stylesheetPaths must be a non-empty array");
  }

  const elements = [];
  const ownedElements = new Set();
  for (const rawPath of stylesheetPaths) {
    const path = stylesheetMarker(optionalIdentifier("stylesheet path", rawPath));
    const existing = findInstalledStylesheet(target, path);
    if (existing) {
      elements.push(existing);
      continue;
    }
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", resolveBrowserExtensionAssetUrl(runtimeGetURL, path));
    link.setAttribute("data-gui-browser-extension-stylesheet", path);
    target.append(link);
    elements.push(link);
    ownedElements.add(link);
  }

  let destroyed = false;
  return Object.freeze({
    elements: Object.freeze(elements.slice()),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const element of ownedElements) element.remove?.();
    },
  });
}
