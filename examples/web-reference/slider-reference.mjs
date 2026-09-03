// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiSlider } from "../../packages/adapter-web/src/slider.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function mountSliderReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") {
    throw new TypeError("mountSliderReference requires a DOM Document-like object");
  }
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") {
    throw new TypeError("mountSliderReference requires a DOM Element-like root");
  }

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown Slider reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";

  let value = 40;
  let disabled = false;

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Slider"),
    element(document, "h1", "", "Adjust workspace zoom"),
    element(document, "p", "gui-reference__lead", "The native range input owns pointer and keyboard interaction while GUI Framework mirrors the neutral track, fill and thumb visuals."),
  );

  const field = element(document, "div", "gui-reference__field");
  const controls = element(document, "div", "gui-reference__actions");
  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const slider = createGuiSlider(document, {
    value,
    min: 0,
    max: 100,
    step: 5,
    accessibilityLabel: "Workspace zoom",
    accessibilityValueText: "40 percent",
    size: componentSize,
    onValueChange(nextValue) {
      value = nextValue;
      slider.update({
        value,
        accessibilityValueText: `${value} percent`,
      });
      renderStatus();
    },
  });

  const vertical = createGuiSlider(document, {
    value: 25,
    min: 0,
    max: 100,
    step: 5,
    accessibilityLabel: "Vertical balance",
    accessibilityValueText: "25 percent",
    variant: "vertical",
    size: componentSize,
  });

  const toggleDisabledButton = createGuiButton(document, {
    label: "Disable slider",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      disabled = !disabled;
      slider.update({ disabled });
      toggleDisabledButton.update({ label: disabled ? "Enable slider" : "Disable slider" });
      renderStatus();
    },
  });

  const resetButton = createGuiButton(document, {
    label: "Reset zoom",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      value = 40;
      slider.update({
        value,
        accessibilityValueText: "40 percent",
      });
      renderStatus();
    },
  });

  function renderStatus() {
    status.textContent = `Workspace zoom: ${value}% · ${disabled ? "disabled" : "enabled"}`;
  }

  renderStatus();
  controls.append(toggleDisabledButton.element, resetButton.element);
  field.append(
    slider.element,
    element(document, "p", "gui-reference__hint", "Horizontal controlled slider"),
    vertical.element,
    element(document, "p", "gui-reference__hint", "Vertical variant"),
    controls,
    status,
  );
  surface.append(header, field);
  root.append(surface);

  return {
    slider,
    vertical,
    toggleDisabledButton,
    resetButton,
    getState() { return { density, value, disabled }; },
    destroy() {
      slider.destroy();
      vertical.destroy();
      toggleDisabledButton.destroy();
      resetButton.destroy();
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
  const root = document.querySelector?.("#gui-slider-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountSliderReference(document, root, {
      density: query.get("density") ?? "standard",
    });
  }
}
