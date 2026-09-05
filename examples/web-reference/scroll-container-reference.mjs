// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiScrollContainer } from "../../packages/adapter-web/src/scroll-container.mjs";

const densities = new Set(["standard", "compact"]);
export const scrollReferenceItems = Array.from({ length: 12 }, (_, index) => `Activity event ${String(index + 1).padStart(2, "0")}`);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountScrollContainerReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountScrollContainerReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountScrollContainerReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Scroll Container reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";
  let keyboardFocusable = true;

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Scroll Container"),
    element(document, "h1", "", "Activity log"),
    element(document, "p", "gui-reference__lead", "Scroll Container owns viewport semantics and axis behavior while the browser and host retain the actual scroll offsets and content model."),
  );

  const viewport = createGuiScrollContainer(document, {
    accessibilityLabel: "Activity log viewport",
    keyboardFocusable,
    variant: "vertical",
    size: componentSize,
  });
  viewport.element.dataset.referenceScrollViewport = "activity-log";
  viewport.element.style.blockSize = density === "compact" ? "9rem" : "11rem";
  viewport.element.style.inlineSize = "100%";
  viewport.element.style.maxInlineSize = "30rem";
  scrollReferenceItems.forEach((item) => {
    viewport.contentElement.append(element(document, "p", "gui-reference__hint", item));
  });

  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  function renderStatus() {
    status.textContent = `Scroll offset: ${Math.round(viewport.element.scrollTop)} · keyboard focus: ${keyboardFocusable ? "enabled" : "disabled"}`;
  }
  viewport.element.addEventListener("scroll", renderStatus);

  const toggleFocusButton = createGuiButton(document, {
    label: "Disable viewport focus",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      keyboardFocusable = !keyboardFocusable;
      viewport.update({ keyboardFocusable });
      toggleFocusButton.update({ label: keyboardFocusable ? "Disable viewport focus" : "Enable viewport focus" });
      renderStatus();
    },
  });
  const resetButton = createGuiButton(document, {
    label: "Reset scroll position",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      viewport.element.scrollTop = 0;
      renderStatus();
    },
  });

  const controls = element(document, "div", "gui-reference__actions");
  controls.append(toggleFocusButton.element, resetButton.element);
  const field = element(document, "div", "gui-reference__field");
  field.append(
    viewport.element,
    status,
    controls,
    element(document, "p", "gui-reference__hint", "Vertical native viewport · 12 host-owned records · adapter updates preserve browser-owned scrollTop"),
  );
  renderStatus();
  surface.append(header, field);
  root.append(surface);

  return {
    viewport,
    toggleFocusButton,
    resetButton,
    getState() {
      return { density, keyboardFocusable, scrollTop: viewport.element.scrollTop, items: [...scrollReferenceItems] };
    },
    destroy() {
      viewport.element.removeEventListener("scroll", renderStatus);
      toggleFocusButton.destroy();
      resetButton.destroy();
      viewport.destroy();
      root.replaceChildren();
      delete root.dataset.guiTheme;
      delete root.dataset.guiPalette;
      delete root.dataset.guiHostContext;
      delete root.dataset.guiDensity;
      root.className = "";
    },
  };
}

if (typeof document !== "undefined") {
  const root = document.querySelector?.("#gui-scroll-container-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountScrollContainerReference(document, root, { density: query.get("density") ?? "standard" });
  }
}
