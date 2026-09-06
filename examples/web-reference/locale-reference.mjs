// SPDX-License-Identifier: AGPL-3.0-or-later

import { createGuiButton } from "../../packages/adapter-web/src/button.mjs";
import { createGuiInput } from "../../packages/adapter-web/src/input.mjs";
import { createGuiNavigation, createGuiNavigationItem } from "../../packages/adapter-web/src/navigation.mjs";
import { createGuiTable, createGuiTableRow, createGuiTableHeaderCell, createGuiTableCell } from "../../packages/adapter-web/src/table.mjs";
import { textLocaleFixtures } from "../text-locale-fixtures.mjs";

const densities = new Set(["standard", "compact"]);

function element(document, tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function appendNavigationItems(document, navigation) {
  const itemProps = [
    { value: "workspace", label: textLocaleFixtures.longText, icon: "⌂", accessibilityLabel: "RTL workspace destination" },
    { value: "token", label: textLocaleFixtures.unbrokenText, icon: "#", accessibilityLabel: "RTL unbroken token destination" },
    { value: "unicode", label: textLocaleFixtures.unicodeText, icon: "◈", accessibilityLabel: "RTL Unicode destination" },
  ];
  const items = itemProps.map((props) => createGuiNavigationItem(document, props));
  navigation.listElement.append(...items.map((item) => item.element));
  navigation.refreshItems();
  return items;
}

function populateTable(document, table) {
  const headerRow = createGuiTableRow(document);
  const headers = [
    createGuiTableHeaderCell(document, { text: "المشروع Project" }),
    createGuiTableHeaderCell(document, { text: "القيمة Value" }),
  ];
  headerRow.element.append(...headers.map((header) => header.element));
  table.headerElement.append(headerRow.element);

  const rows = [textLocaleFixtures.mixedBidiText, textLocaleFixtures.unbrokenText, textLocaleFixtures.unicodeText].map((text, index) => {
    const row = createGuiTableRow(document);
    const cells = [
      createGuiTableCell(document, { text: `صف ${index + 1} · Row ${index + 1}` }),
      createGuiTableCell(document, { text }),
    ];
    row.element.append(...cells.map((cell) => cell.element));
    table.bodyElement.append(row.element);
    return { row, cells };
  });
  return { headerRow, headers, rows };
}

export function mountTextLocaleReference(document, root, options = {}) {
  if (!document || typeof document.createElement !== "function") throw new TypeError("mountTextLocaleReference requires a DOM Document-like object");
  if (!root || typeof root.append !== "function" || typeof root.replaceChildren !== "function") throw new TypeError("mountTextLocaleReference requires a DOM Element-like root");

  const density = options.density ?? "standard";
  if (!densities.has(density)) throw new Error(`Unknown text/locale reference density: ${density}`);
  const componentSize = density === "compact" ? "small" : "medium";
  let direction = textLocaleFixtures.direction;

  root.replaceChildren();
  root.className = "gui-reference-host";
  root.dataset.guiTheme = "basic";
  root.dataset.guiPalette = "reference-dark";
  root.dataset.guiHostContext = "page";
  root.dataset.guiDensity = density;
  root.setAttribute("dir", direction);
  root.setAttribute("lang", textLocaleFixtures.language);

  const surface = element(document, "div", "gui-reference");
  const header = element(document, "header", "gui-reference__header");
  header.append(
    element(document, "p", "gui-reference__eyebrow", "Basic theme · Text / Locale robustness"),
    element(document, "h1", "", textLocaleFixtures.longText),
    element(document, "p", "gui-reference__lead", textLocaleFixtures.mixedBidiText),
    element(document, "p", "gui-reference__lead", textLocaleFixtures.unicodeText),
  );

  const field = element(document, "div", "gui-reference__field");
  const longButton = createGuiButton(document, {
    label: textLocaleFixtures.unbrokenText,
    size: componentSize,
  });
  longButton.element.dataset.referenceLocaleUnbroken = "true";
  longButton.element.style.inlineSize = "100%";

  const unicodeInput = createGuiInput(document, {
    value: `${textLocaleFixtures.unicodeText} · ${textLocaleFixtures.mixedBidiText}`,
    onValueChange() {},
    accessibilityLabel: "Unicode mixed-direction input",
    size: componentSize,
  });
  unicodeInput.element.style.inlineSize = "100%";

  const navigation = createGuiNavigation(document, {
    value: "workspace",
    accessibilityLabel: "RTL locale navigation",
    variant: "vertical",
    size: componentSize,
    onValueChange() {},
  });
  const navigationItems = appendNavigationItems(document, navigation);

  const table = createGuiTable(document, {
    caption: textLocaleFixtures.mixedBidiText,
    accessibilityLabel: "RTL locale table",
    variant: "gridlined",
    size: componentSize,
  });
  const tableParts = populateTable(document, table);

  const status = element(document, "p", "gui-reference__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const toggleDirectionButton = createGuiButton(document, {
    label: "Switch host direction to LTR",
    variant: "secondary",
    size: componentSize,
    onActivate() {
      direction = direction === "rtl" ? "ltr" : "rtl";
      root.setAttribute("dir", direction);
      root.setAttribute("lang", direction === "rtl" ? "ar" : "en");
      toggleDirectionButton.update({ label: direction === "rtl" ? "Switch host direction to LTR" : "Switch host direction to RTL" });
      renderStatus();
    },
  });

  function renderStatus() {
    status.textContent = `Direction: ${direction} · language: ${root.getAttribute("lang")} · Unicode preserved`;
  }
  renderStatus();

  field.append(
    element(document, "p", "gui-reference__hint", textLocaleFixtures.longText),
    longButton.element,
    unicodeInput.element,
    navigation.element,
    table.element,
    toggleDirectionButton.element,
    status,
  );
  surface.append(header, field);
  root.append(surface);

  return {
    longButton,
    unicodeInput,
    navigation,
    navigationItems,
    table,
    tableParts,
    toggleDirectionButton,
    getState() { return { density, direction, fixtures: textLocaleFixtures }; },
    destroy() {
      longButton.destroy();
      unicodeInput.destroy();
      navigation.destroy();
      for (const item of navigationItems) item.destroy();
      table.destroy();
      toggleDirectionButton.destroy();
      root.replaceChildren();
      root.removeAttribute("dir");
      root.removeAttribute("lang");
      root.className = "";
    },
  };
}

if (typeof document !== "undefined") {
  const root = document.querySelector?.("#gui-text-locale-reference-root");
  if (root) {
    const query = new URLSearchParams(globalThis.location?.search ?? "");
    mountTextLocaleReference(document, root, { density: query.get("density") ?? "standard" });
  }
}
