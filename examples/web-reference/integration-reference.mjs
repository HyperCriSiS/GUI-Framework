// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createWebApplicationGuiHost } from "../../packages/integration-web-application/src/index.mjs";

const root = document.querySelector("#web-integration-root");
if (!root) throw new Error("Web application integration root is missing");

const host = createWebApplicationGuiHost(root, {
  theme: "basic",
  palette: "reference-dark",
  surface: "application",
  availableCapabilities: [],
});

let activations = 0;
const title = document.createElement("h1");
title.textContent = "GUI Framework Web application";
const status = document.createElement("p");
status.setAttribute("role", "status");
status.textContent = "Activations: 0";
const action = createGuiButton(document, {
  label: "Activate Web integration",
  onActivate() {
    activations += 1;
    status.textContent = `Activations: ${activations}`;
  },
});
root.append(title, action.element, status);

const ir = await fetch("../../build/spec-ir.json").then((response) => {
  if (!response.ok) throw new Error(`Failed to load compiled GUI IR: ${response.status}`);
  return response.json();
});
const capabilitySelection = host.configureComponentCapabilities(action.element, ir);

globalThis.__guiWebApplicationReference = Object.freeze({
  host,
  action,
  capabilitySelection,
  getActivations: () => activations,
});
