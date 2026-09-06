// SPDX-License-Identifier: AGPL-3.0-or-later

import { createBrowserExtensionGuiHost } from "./gui-framework/integration.mjs";
import { createGuiButton } from "./gui-framework/adapter/button.mjs";

const root = document.querySelector("#app");
if (!root) throw new Error("Browser extension reference root is missing");

const host = createBrowserExtensionGuiHost(root, {
  surface: "popup",
  theme: "basic",
  palette: "reference-dark",
});

let activations = 0;
const heading = document.createElement("h1");
heading.textContent = "GUI Framework";
const status = document.createElement("p");
status.id = "activation-status";
status.setAttribute("role", "status");
status.textContent = "Activations: 0";

const action = createGuiButton(document, {
  label: "Activate reference",
  onActivate() {
    activations += 1;
    status.textContent = `Activations: ${activations}`;
  },
});

root.append(heading, action.element, status);

globalThis.__guiBrowserExtensionReference = Object.freeze({
  host,
  action,
  getActivations: () => activations,
});
