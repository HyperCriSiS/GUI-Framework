// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { analyzeThemeAvailability } from "../../compiler/src/theme-availability.mjs";

function cssName(path) { return `--gui-${path.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`; }
function tokenPath(reference, label) {
  if (typeof reference !== "string" || !/^\{[^{}.]+(?:\.[^{}.]+)*\}$/.test(reference)) throw new Error(`${label}: expected a compiled token reference`);
  return reference.slice(1, -1);
}
function compiledValue(value, label) {
  if (!value || typeof value !== "object" || typeof value.type !== "string" || typeof value.reference !== "string") throw new Error(`${label}: expected compiled visual value`);
  switch (value.type) {
    case "color": case "dimension": case "duration": case "number": case "shadow": return `var(${cssName(tokenPath(value.reference, label))})`;
    default: throw new Error(`${label}: unsupported visual token type ${value.type}`);
  }
}
function transitionDeclarations(value, label) {
  if (!value || value.type !== "transition" || !value.value) throw new Error(`${label}: expected compiled transition`);
  return [`transition: var(${cssName(tokenPath(value.reference, label))})`, "transition-property: background-color, border-color, color, opacity, box-shadow, outline-color"];
}
function styleDeclarations(style, label) {
  const output = [];
  for (const [property, value] of Object.entries(style ?? {})) {
    switch (property) {
      case "fill": output.push(`background-color: ${compiledValue(value, `${label}.fill`)}`); break;
      case "foreground": output.push(`color: ${compiledValue(value, `${label}.foreground`)}`); break;
      case "opacity": output.push(`opacity: ${compiledValue(value, `${label}.opacity`)}`); break;
      case "radius": output.push(`border-radius: ${compiledValue(value, `${label}.radius`)}`); break;
      case "paddingHorizontal": output.push(`padding-inline: ${compiledValue(value, `${label}.paddingHorizontal`)}`); break;
      case "paddingVertical": output.push(`padding-block: ${compiledValue(value, `${label}.paddingVertical`)}`); break;
      case "gap": output.push(`gap: ${compiledValue(value, `${label}.gap`)}`); break;
      case "minWidth": output.push(`min-width: ${compiledValue(value, `${label}.minWidth`)}`); break;
      case "minHeight": output.push(`min-height: ${compiledValue(value, `${label}.minHeight`)}`); break;
      case "fontSize": output.push(`font-size: ${compiledValue(value, `${label}.fontSize`)}`); break;
      case "fontWeight": output.push(`font-weight: ${compiledValue(value, `${label}.fontWeight`)}`); break;
      case "lineHeight": output.push(`line-height: ${compiledValue(value, `${label}.lineHeight`)}`); break;
      case "border":
        output.push(`border-color: ${compiledValue(value.color, `${label}.border.color`)}`);
        output.push(`border-width: ${compiledValue(value.width, `${label}.border.width`)}`);
        break;
      case "outline":
        output.push(`outline-color: ${compiledValue(value.color, `${label}.outline.color`)}`);
        output.push(`outline-width: ${compiledValue(value.width, `${label}.outline.width`)}`);
        output.push(`outline-offset: ${compiledValue(value.offset, `${label}.outline.offset`)}`);
        output.push("outline-style: solid");
        break;
      case "transition": output.push(...transitionDeclarations(value, `${label}.transition`)); break;
      case "shadow": output.push(`box-shadow: ${compiledValue(value, `${label}.shadow`)}`); break;
      case "backdropBlur": {
        const blurValue = compiledValue(value, `${label}.backdropBlur`);
        output.push(`-webkit-backdrop-filter: blur(${blurValue})`);
        output.push(`backdrop-filter: blur(${blurValue})`);
        break;
      }
      case "blur": case "glow": throw new Error(`${label}: visual property ${property} is not yet mapped by the Web reference adapter`);
      default: throw new Error(`${label}: unsupported visual property ${property}`);
    }
  }
  return output;
}
function kebabPart(partId) { return partId.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`); }
function partSelector(rootSelector, componentId, partId) {
  if (partId === "root") return rootSelector;
  if ((componentId === "input" || componentId === "select") && partId === "placeholder") return `${rootSelector}::placeholder`;
  return `${rootSelector} .gui-${componentId}__${kebabPart(partId)}`;
}
function stateSelector(rootSelector, state) {
  switch (state) {
    case "default": return rootSelector;
    case "hover": return `${rootSelector}:where(:hover:not(:disabled))`;
    case "focus": return `${rootSelector}:where(:focus-visible)`;
    case "pressed": return `${rootSelector}:where(:active:not(:disabled))`;
    case "checked": return `${rootSelector}:where([aria-checked="true"])`;
    case "disabled": return `${rootSelector}:where(:disabled)`;
    case "loading": return `${rootSelector}:where([data-gui-loading="true"])`;
    case "error": return `${rootSelector}:where([aria-invalid="true"])`;
    default: return `${rootSelector}:where([data-gui-state~="${state}"])`;
  }
}
function statePartSelector(rootSelector, componentId, state, partId) {
  if (componentId === "menu" && ["hover", "focus", "pressed", "disabled"].includes(state)) {
    const itemSelector = partSelector(rootSelector, componentId, "item");
    const interactiveSelector = stateSelector(itemSelector, state);
    if (partId === "item") return interactiveSelector;
    if (partId === "label" || partId === "shortcut") return `${interactiveSelector} .gui-menu__${kebabPart(partId)}`;
  }
  if (componentId === "toast" && ["hover", "focus", "pressed"].includes(state) && partId === "action") {
    return stateSelector(partSelector(rootSelector, componentId, "action"), state);
  }
  if (componentId !== "tabs") return partSelector(stateSelector(rootSelector, state), componentId, partId);
  const tabSelector = partSelector(rootSelector, componentId, "tab");
  const interactiveSelector = state === "selected"
    ? `${tabSelector}:where([aria-selected="true"])`
    : stateSelector(tabSelector, state);
  if (partId === "tab") return interactiveSelector;
  if (partId === "indicator") return `${interactiveSelector} .gui-tabs__indicator`;
  if (partId === "root" && state === "disabled") return interactiveSelector;
  return partSelector(stateSelector(rootSelector, state), componentId, partId);
}
function emitStatePartMap(lines, rootSelector, componentId, state, partMap, label) {
  for (const [partId, style] of Object.entries(partMap ?? {})) {
    const declarations = styleDeclarations(style, `${label}.${partId}`);
    if (declarations.length === 0) continue;
    lines.push(`${statePartSelector(rootSelector, componentId, state, partId)} {`);
    lines.push(...declarations.map((declaration) => `  ${declaration};`));
    lines.push("}", "");
  }
}
function emitPartMap(lines, selector, componentId, partMap, label) {
  for (const [partId, style] of Object.entries(partMap ?? {})) {
    const declarations = styleDeclarations(style, `${label}.${partId}`);
    if (declarations.length === 0) continue;
    lines.push(`${partSelector(selector, componentId, partId)} {`);
    lines.push(...declarations.map((declaration) => `  ${declaration};`));
    lines.push("}", "");
  }
}
function emitScopedVisual(lines, root, componentId, component, visual, label) {
  emitPartMap(lines, root, componentId, visual?.base, `${label}.base`);
  for (const size of component.sizes ?? []) emitPartMap(lines, `${root}:where([data-gui-size="${size}"])`, componentId, visual?.sizes?.[size], `${label}.sizes.${size}`);
  for (const variant of component.variants ?? []) {
    const scoped = visual?.variants?.[variant]; if (!scoped) continue;
    const variantRoot = `${root}:where([data-gui-variant="${variant}"])`;
    emitPartMap(lines, variantRoot, componentId, scoped.base, `${label}.variants.${variant}.base`);
    for (const size of component.sizes ?? []) emitPartMap(lines, `${variantRoot}:where([data-gui-size="${size}"])`, componentId, scoped.sizes?.[size], `${label}.variants.${variant}.sizes.${size}`);
  }
  for (const state of component.states ?? []) {
    if (state === "default") continue;
    emitStatePartMap(lines, root, componentId, state, visual?.states?.[state], `${label}.states.${state}`);
    for (const variant of component.variants ?? []) {
      const variantRoot = `${root}:where([data-gui-variant="${variant}"])`;
      emitStatePartMap(lines, variantRoot, componentId, state, visual?.variants?.[variant]?.states?.[state], `${label}.variants.${variant}.states.${state}`);
    }
  }
}
function emitVisual(lines, prefix, componentId, component, visual, label) {
  const root = `${prefix} .gui-${componentId}`;
  emitScopedVisual(lines, root, componentId, component, visual, label);
  for (const [fallbackId, fallback] of Object.entries(visual?.fallbacks ?? {})) {
    emitScopedVisual(lines, `${root}:where([data-gui-fallback="${fallbackId}"])`, componentId, component, fallback.recipe, `${label}.fallbacks.${fallbackId}.recipe`);
  }
}
function referenceShape(value) {
  if (Array.isArray(value)) return value.map(referenceShape);
  if (!value || typeof value !== "object") return value;
  if (typeof value.reference === "string" && typeof value.type === "string") return { reference: value.reference, type: value.type };
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "trace" && key !== "themeTrace" && key !== "value").map(([key, child]) => [key, referenceShape(child)]));
}
function assertPaletteIndependentVisuals(ir) {
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) throw new Error("Compiled IR contains no palettes");
  const reference = ir.palettes[0]; const referenceComponents = Object.keys(reference.components ?? {}).sort();
  for (const palette of ir.palettes.slice(1)) {
    const componentIds = Object.keys(palette.components ?? {}).sort();
    if (JSON.stringify(componentIds) !== JSON.stringify(referenceComponents)) throw new Error(`Component registry differs for palette ${palette.id}`);
    for (const theme of ir.themes ?? []) {
      const expected = referenceShape(reference.themes?.[theme.id]?.components ?? {});
      const actual = referenceShape(palette.themes?.[theme.id]?.components ?? {});
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Theme visual token references differ for palette ${palette.id} and theme ${theme.id}`);
    }
  }
  return { reference, componentIds: referenceComponents };
}
function emitFoundation(lines, themeIds) {
  const scope = `:where(${themeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")})`;
  lines.push(
    `${scope} .gui-button {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  border-style: solid;", "  border-width: 0;", "  background: transparent;", "  color: inherit;", "  font-family: inherit;", "  cursor: pointer;", "  user-select: none;", "  text-decoration: none;", "  vertical-align: middle;", "}", "",
    `${scope} .gui-button:disabled { cursor: default; }`, `${scope} .gui-button:focus { outline: none; }`, "",
    `${scope} .gui-checkbox {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-grid;", "  place-items: center;", "  border-style: solid;", "  border-width: 0;", "  padding: 0;", "  background: transparent;", "  color: inherit;", "  font-family: inherit;", "  cursor: pointer;", "  user-select: none;", "  vertical-align: middle;", "  outline: none;", "}", "",
    `${scope} .gui-checkbox:disabled { cursor: default; }`, `${scope} .gui-checkbox__indicator {`, "  display: grid;", "  place-items: center;", "  inline-size: 100%;", "  block-size: 100%;", "  pointer-events: none;", "}", "",
    `${scope} .gui-input {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-block;", "  border-style: solid;", "  border-width: 0;", "  background: transparent;", "  color: inherit;", "  font-family: inherit;", "  vertical-align: middle;", "  outline: none;", "}", "",
    `${scope} .gui-input::placeholder { opacity: 1; }`, `${scope} .gui-input:disabled { cursor: default; }`, "",
    `${scope} .gui-select {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-block;", "  border-style: solid;", "  border-width: 0;", "  background: transparent;", "  color: inherit;", "  font-family: inherit;", "  vertical-align: middle;", "  outline: none;", "}", "",
    `${scope} .gui-select::placeholder { opacity: 1; }`, `${scope} .gui-select:where([data-gui-editable="false"]) { cursor: pointer; }`, `${scope} .gui-select:disabled { cursor: default; }`, `${scope} .gui-select__popup[hidden] { display: none; }`, "",
    `${scope} .gui-tabs { box-sizing: border-box; }`, `${scope} .gui-tabs__tab-list {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: stretch;", "  border-style: solid;", "  border-width: 0;", "}", "",
    `${scope} .gui-tabs__tab {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-flex;", "  flex-direction: column;", "  align-items: center;", "  justify-content: center;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  cursor: pointer;", "  user-select: none;", "  outline: none;", "}", "",
    `${scope} .gui-tabs__tab:disabled { cursor: default; }`, `${scope} .gui-tabs__indicator {`, "  display: block;", "  inline-size: 100%;", "  visibility: hidden;", "  pointer-events: none;", "}", `${scope} .gui-tabs__tab[aria-selected="true"] .gui-tabs__indicator { visibility: visible; }`, "",
    `${scope} .gui-tabs__panel { box-sizing: border-box; }`, `${scope} .gui-tabs__panel[hidden] { display: none; }`, "",
    `${scope} .gui-tooltip { box-sizing: border-box; pointer-events: none; }`, `${scope} .gui-tooltip__popup {`, "  box-sizing: border-box;", "  position: fixed;", "  max-inline-size: calc(100vw - 8px);", "  border-style: solid;", "  border-width: 0;", "  overflow-wrap: anywhere;", "  pointer-events: none;", "}", "",
    `${scope} .gui-tooltip__popup[hidden] { display: none; }`, `${scope} .gui-tooltip__content { display: block; }`, "",
    `${scope} .gui-menu { box-sizing: border-box; pointer-events: none; }`, `${scope} .gui-menu__popup {`, "  box-sizing: border-box;", "  position: fixed;", "  max-inline-size: calc(100vw - 8px);", "  max-block-size: calc(100vh - 8px);", "  overflow: auto;", "  border-style: solid;", "  border-width: 0;", "  outline: none;", "  pointer-events: auto;", "}", "",
    `${scope} .gui-menu__popup[hidden] { display: none; }`, `${scope} .gui-menu__item {`, "  appearance: none;", "  box-sizing: border-box;", "  display: flex;", "  inline-size: 100%;", "  align-items: center;", "  justify-content: space-between;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  text-align: start;", "  cursor: pointer;", "  user-select: none;", "  outline: none;", "}", "",
    `${scope} .gui-menu__item:disabled { cursor: default; }`, `${scope} .gui-menu__label { min-inline-size: 0; }`, `${scope} .gui-menu__shortcut { margin-inline-start: auto; white-space: nowrap; }`, `${scope} .gui-menu__shortcut[hidden] { display: none; }`, `${scope} .gui-menu__separator { box-sizing: border-box; inline-size: 100%; }`, "",
    `${scope} .gui-toast {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: center;", "  max-inline-size: calc(100vw - 16px);", "  border-style: solid;", "  border-width: 0;", "  overflow-wrap: anywhere;", "}", "",
    `${scope} .gui-toast[hidden] { display: none; }`, `${scope} .gui-toast__content-stack { display: flex; flex: 1 1 auto; min-inline-size: 0; flex-direction: column; }`, `${scope} .gui-toast__title[hidden],`, `${scope} .gui-toast__action[hidden],`, `${scope} .gui-toast__dismiss[hidden] { display: none; }`, "",
    `${scope} .gui-toast__action,`, `${scope} .gui-toast__dismiss {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-flex;", "  flex: 0 0 auto;", "  align-items: center;", "  justify-content: center;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  cursor: pointer;", "}", "",
    `${scope} .gui-toast__action:focus { outline: none; }`, "",
    `${scope} .gui-switch {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-flex;", "  align-items: center;", "  justify-content: flex-start;", "  border-style: solid;", "  border-width: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  cursor: pointer;", "  user-select: none;", "  vertical-align: middle;", "  outline: none;", "}", "",
    `${scope} .gui-switch[aria-checked="true"] { justify-content: flex-end; }`, `${scope} .gui-switch:disabled { cursor: default; }`, `${scope} .gui-switch__thumb {`, "  display: block;", "  flex: 0 0 auto;", "  pointer-events: none;", "}", ""
  );
}
function generate(ir) {
  const { availableThemeIds } = analyzeThemeAvailability(ir);
  if (availableThemeIds.length === 0) throw new Error("Compiled IR contains no fully visualized themes");
  const { reference, componentIds } = assertPaletteIndependentVisuals(ir);
  const lines = ["/* Generated from the language-neutral GUI Framework specification. */", "/* Do not edit directly. */", ""];
  emitFoundation(lines, availableThemeIds);
  for (const theme of (ir.themes ?? []).filter(({ id }) => availableThemeIds.includes(id))) {
    const themeComponents = reference.themes?.[theme.id]?.components ?? {};
    for (const componentId of componentIds) {
      const visual = themeComponents[componentId]; const component = reference.components?.[componentId];
      if (!visual || !component) continue;
      emitVisual(lines, `[data-gui-theme="${theme.id}"]`, componentId, component, visual, `${theme.id}.${componentId}`);
    }
  }
  lines.push("@media (prefers-reduced-motion: reduce) {", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-button,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-checkbox,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-input,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-select,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-tabs,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-menu,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-toast,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-switch {`, "    transition-duration: 0ms !important;", "    transition-delay: 0ms !important;", "  }", "}", "");
  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/components.css"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const css = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), css, "utf8");
console.log(`Generated Web component CSS at ${outputPath}`);
