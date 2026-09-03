// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function tokenName(path) {
  return `--gui-${path.replaceAll(".", "-")}`;
}

function tokenRef(value) {
  const match = /^\{([^{}]+)\}$/.exec(value);
  return match ? `var(${tokenName(match[1])})` : value;
}

function cssValue(value) {
  if (typeof value === "string") return tokenRef(value);
  if (typeof value === "number") return String(value);
  return null;
}

function emitProperty(lines, property, value, indent = "  ") {
  const resolved = cssValue(value);
  if (resolved !== null) lines.push(`${indent}${property}: ${resolved};`);
}

function emitVisual(lines, visual) {
  if (!visual || typeof visual !== "object") return;
  emitProperty(lines, "background", visual.background);
  emitProperty(lines, "color", visual.foreground);
  emitProperty(lines, "border-radius", visual.radius);
  emitProperty(lines, "opacity", visual.opacity);
  emitProperty(lines, "min-width", visual.minWidth);
  emitProperty(lines, "min-height", visual.minHeight);
  emitProperty(lines, "padding", visual.padding);
  emitProperty(lines, "gap", visual.gap);
  if (visual.border) {
    emitProperty(lines, "border-color", visual.border.color);
    emitProperty(lines, "border-width", visual.border.width);
  }
  if (visual.outline) {
    emitProperty(lines, "outline-color", visual.outline.color);
    emitProperty(lines, "outline-width", visual.outline.width);
    emitProperty(lines, "outline-offset", visual.outline.offset);
  }
  if (visual.shadow?.value) emitProperty(lines, "box-shadow", visual.shadow.value);
  if (visual.backdropBlur) emitProperty(lines, "backdrop-filter", `blur(${cssValue(visual.backdropBlur)})`);
  if (visual.transition) emitProperty(lines, "transition", visual.transition);
}

function stateSelector(base, state) {
  if (state === "hover") return `${base}:where(:hover, [data-gui-state~="hover"])`;
  if (state === "focus") return `${base}:where(:focus-visible, [data-gui-state~="focus"])`;
  if (state === "pressed") return `${base}:where(:active, [data-gui-state~="pressed"])`;
  if (state === "disabled") return `${base}:where(:disabled, [aria-disabled="true"], [data-gui-state~="disabled"])`;
  if (state === "checked") return `${base}:where(:checked, [aria-checked="true"], [data-gui-state~="checked"])`;
  if (state === "selected") return `${base}:where([aria-selected="true"], [data-gui-state~="selected"])`;
  if (state === "indeterminate") return `${base}:where([data-gui-state~="indeterminate"])`;
  return `${base}:where([data-gui-state~="${state}"])`;
}

function partSelector(rootSelector, componentId, partId) {
  if (partId === "root") return rootSelector;
  return `${rootSelector} .gui-${componentId}__${partId}`;
}

function visualSelector(rootSelector, componentId, partId, state) {
  if (componentId === "checkbox" && state === "checked") {
    return partSelector(`${rootSelector}:where([aria-checked="true"])`, componentId, partId);
  }
  if (componentId === "radio" && state === "checked") {
    return partSelector(`${rootSelector}:where([aria-checked="true"])`, componentId, partId);
  }
  if (componentId === "tabs" && state === "selected") {
    const tabSelector = partSelector(rootSelector, componentId, partId);
    return `${tabSelector}:where([aria-selected="true"], [data-gui-state~="selected"])`;
  }
  if (componentId === "progress" && state === "indeterminate") {
    return partSelector(`${rootSelector}:where([data-gui-state~="indeterminate"])`, componentId, partId);
  }
  if (componentId === "progress" && state === "disabled") {
    return partSelector(`${rootSelector}:where([aria-disabled="true"])`, componentId, partId);
  }
  if (componentId === "slider" && ["focus", "pressed", "disabled"].includes(state)) {
    return partSelector(`${rootSelector}:where([data-gui-state~="${state}"])`, componentId, partId);
  }
  if (componentId === "menu" && ["hover", "focus", "pressed", "disabled"].includes(state)) {
    const itemSelector = partSelector(rootSelector, componentId, "item");
    const interactiveSelector = stateSelector(itemSelector, state);
    return partId === "item" ? interactiveSelector : `${interactiveSelector} .gui-${componentId}__${partId}`;
  }
  return stateSelector(partSelector(rootSelector, componentId, partId), state);
}

function emitRecipe(lines, themeId, componentId, recipe) {
  if (!recipe) return;
  const scope = `:where([data-gui-theme="${themeId}"])`;
  const rootSelector = `${scope} .gui-${componentId}`;
  const base = recipe.base ?? {};
  for (const [partId, visual] of Object.entries(base)) {
    lines.push(`${partSelector(rootSelector, componentId, partId)} {`);
    emitVisual(lines, visual);
    lines.push("}", "");
  }
  for (const [size, parts] of Object.entries(recipe.sizes ?? {})) {
    const sizedRoot = `${rootSelector}:where([data-gui-size="${size}"])`;
    for (const [partId, visual] of Object.entries(parts)) {
      lines.push(`${partSelector(sizedRoot, componentId, partId)} {`);
      emitVisual(lines, visual);
      lines.push("}", "");
    }
  }
  for (const [state, parts] of Object.entries(recipe.states ?? {})) {
    for (const [partId, visual] of Object.entries(parts)) {
      lines.push(`${visualSelector(rootSelector, componentId, partId, state)} {`);
      emitVisual(lines, visual);
      lines.push("}", "");
    }
  }
  for (const [variant, parts] of Object.entries(recipe.variants ?? {})) {
    const variantRoot = `${rootSelector}:where([data-gui-variant="${variant}"])`;
    for (const [partId, visual] of Object.entries(parts)) {
      lines.push(`${partSelector(variantRoot, componentId, partId)} {`);
      emitVisual(lines, visual);
      lines.push("}", "");
    }
  }
}

export function generateComponentsCss(ir) {
  const themeIds = Object.keys(ir.themes ?? {});
  const availableThemeIds = themeIds.filter((id) => ir.themes[id]?.availability !== "unavailable");
  const componentIds = Object.keys(ir.components ?? {});
  const lines = ["/* Generated by GUI Framework Web adapter. Do not edit directly. */", ""];
  for (const themeId of availableThemeIds) {
    const theme = ir.themes[themeId];
    for (const componentId of componentIds) {
      emitRecipe(lines, themeId, componentId, theme.visuals?.[componentId]);
    }
  }
  const scopes = availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ");
  lines.push(`:where(${scopes}) .gui-button {`, "  box-sizing: border-box;", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  border-style: solid;", "  border-width: 0;", "  font: inherit;", "  text-decoration: none;", "  cursor: pointer;", "}", "");
  lines.push(`:where(${scopes}) .gui-input {`, "  box-sizing: border-box;", "  border-style: solid;", "  border-width: 0;", "  font: inherit;", "}", "");
  lines.push(`:where(${scopes}) .gui-switch {`, "  box-sizing: border-box;", "  position: relative;", "  display: inline-flex;", "  align-items: center;", "  border-style: solid;", "  border-width: 0;", "  cursor: pointer;", "  user-select: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-switch__thumb {`, "  box-sizing: border-box;", "  position: absolute;", "  border-style: solid;", "  border-width: 0;", "  pointer-events: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-checkbox,`, `:where(${scopes}) .gui-radio {`, "  box-sizing: border-box;", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  border-style: solid;", "  border-width: 0;", "  cursor: pointer;", "  user-select: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-checkbox__indicator,`, `:where(${scopes}) .gui-radio__indicator {`, "  box-sizing: border-box;", "  pointer-events: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-select {`, "  box-sizing: border-box;", "  position: relative;", "  display: inline-flex;", "  align-items: center;", "  min-inline-size: 0;", "  border-style: solid;", "  border-width: 0;", "}", "");
  lines.push(`:where(${scopes}) .gui-select__control {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: center;", "  min-inline-size: 0;", "  flex: 1 1 auto;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  outline: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-select__popup {`, "  box-sizing: border-box;", "  position: absolute;", "  z-index: 20;", "  inset-inline: 0;", "  inset-block-start: calc(100% + 4px);", "  border-style: solid;", "  border-width: 0;", "}", "");
  lines.push(`:where(${scopes}) .gui-select__option {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: center;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  cursor: pointer;", "}", "");
  lines.push(`:where(${scopes}) .gui-tabs {`, "  box-sizing: border-box;", "}", "");
  lines.push(`:where(${scopes}) .gui-tabs__list {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: stretch;", "}", "");
  lines.push(`:where(${scopes}) .gui-tabs__tab {`, "  box-sizing: border-box;", "  display: inline-flex;", "  align-items: center;", "  justify-content: center;", "  border-style: solid;", "  border-width: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  cursor: pointer;", "}", "");
  lines.push(`:where(${scopes}) .gui-tabs__panel {`, "  box-sizing: border-box;", "}", "");
  lines.push(`:where(${scopes}) .gui-tooltip {`, "  box-sizing: border-box;", "  position: fixed;", "  z-index: 1000;", "  max-inline-size: min(320px, calc(100vw - 16px));", "  border-style: solid;", "  border-width: 0;", "  overflow-wrap: anywhere;", "  pointer-events: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-menu {`, "  box-sizing: border-box;", "  position: fixed;", "  z-index: 900;", "  min-inline-size: min(220px, calc(100vw - 16px));", "  max-inline-size: calc(100vw - 16px);", "  border-style: solid;", "  border-width: 0;", "}", "");
  lines.push(`:where(${scopes}) .gui-menu__item {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: center;", "  inline-size: 100%;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  text-align: start;", "  cursor: pointer;", "}", "");
  lines.push(`:where(${scopes}) .gui-progress {`, "  box-sizing: border-box;", "  display: inline-grid;", "  align-items: center;", "}", "");
  lines.push(`:where(${scopes}) .gui-progress__visual {`, "  box-sizing: border-box;", "  position: relative;", "  overflow: hidden;", "}", "");
  lines.push(`:where(${scopes}) .gui-progress__track,`, `:where(${scopes}) .gui-progress__indicator {`, "  box-sizing: border-box;", "  position: absolute;", "  inset: 0;", "  border-style: solid;", "  border-width: 0;", "  pointer-events: none;", "}", "");
  lines.push(`:where(${scopes}) .gui-progress:where([data-gui-variant="linear"]) .gui-progress__indicator {`, "  inset-inline-end: auto;", "  inline-size: calc(var(--gui-progress-fraction, 0) * 100%);", "}", "");
  lines.push(`:where(${scopes}) .gui-progress:where([data-gui-variant="linear"]):where([data-gui-state~="indeterminate"]) .gui-progress__indicator { inline-size: 40% !important; animation: gui-progress-linear-indeterminate var(--gui-component-progress-indeterminate-duration) linear infinite; }`, "");
  lines.push(`:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]) { justify-items: center; }`, `:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]) .gui-progress__visual { min-inline-size: inherit; min-block-size: inherit; aspect-ratio: 1; overflow: visible; }`, `:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]) .gui-progress__track,`, `:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]) .gui-progress__indicator { fill: none; border-style: none; transform-origin: center; }`, `:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]) .gui-progress__track { stroke: var(--gui-progress-track-color, currentColor); stroke-width: var(--gui-progress-track-stroke, 1px); }`, `:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]) .gui-progress__indicator { stroke: var(--gui-progress-indicator-color, currentColor); stroke-width: var(--gui-progress-indicator-stroke, 1px); stroke-linecap: round; transform: rotate(-90deg); }`, "");
  lines.push(`:where(${scopes}) .gui-progress:where([data-gui-variant="circular"]):where([data-gui-state~="indeterminate"]) .gui-progress__indicator { animation: gui-progress-circular-indeterminate var(--gui-component-progress-indeterminate-duration) linear infinite; }`, "");
  lines.push(`:where(${scopes}) .gui-slider {`, "  box-sizing: border-box;", "  display: inline-grid;", "  position: relative;", "  place-items: center;", "  vertical-align: middle;", "}", "");
  lines.push(`:where(${scopes}) .gui-slider__track,`, `:where(${scopes}) .gui-slider__fill,`, `:where(${scopes}) .gui-slider__thumb,`, `:where(${scopes}) .gui-slider__input { box-sizing: border-box; }`, "");
  lines.push(`:where(${scopes}) .gui-slider__track { position: relative; border-style: solid; border-width: 0; overflow: visible; pointer-events: none; }`, `:where(${scopes}) .gui-slider__fill { position: absolute; pointer-events: none; }`, `:where(${scopes}) .gui-slider__thumb { position: absolute; border-style: solid; border-width: 0; pointer-events: none; }`, "");
  lines.push(`:where(${scopes}) .gui-slider__input { appearance: none; position: absolute; inset: 0; inline-size: 100%; block-size: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 1; }`, `:where(${scopes}) .gui-slider__input:disabled { cursor: default; }`, "");
  lines.push(`:where(${scopes}) .gui-slider:where([data-gui-variant="horizontal"]) .gui-slider__fill { inset-block: 0; inset-inline-start: 0; inline-size: calc(var(--gui-slider-fraction, 0) * 100%); }`, `:where(${scopes}) .gui-slider:where([data-gui-variant="horizontal"]) .gui-slider__thumb { inset-block-start: 50%; inset-inline-start: calc(var(--gui-slider-fraction, 0) * 100%); transform: translate(-50%, -50%); }`, "");
  lines.push(`:where(${scopes}) .gui-slider:where([data-gui-variant="vertical"]) .gui-slider__fill { inset-inline: 0; inset-block-end: 0; block-size: calc(var(--gui-slider-fraction, 0) * 100%); }`, `:where(${scopes}) .gui-slider:where([data-gui-variant="vertical"]) .gui-slider__thumb { inset-inline-start: 50%; inset-block-end: calc(var(--gui-slider-fraction, 0) * 100%); transform: translate(-50%, 50%); }`, `:where(${scopes}) .gui-slider:where([data-gui-variant="vertical"]) .gui-slider__input { writing-mode: vertical-lr; direction: rtl; }`, "");
  lines.push(`:where(${scopes}) .gui-toast {`, "  box-sizing: border-box;", "  display: flex;", "  align-items: center;", "  max-inline-size: calc(100vw - 16px);", "  border-style: solid;", "  border-width: 0;", "  overflow-wrap: anywhere;", "}", "");
  lines.push(`:where(${scopes}) .gui-toast[hidden] { display: none; }`, `:where(${scopes}) .gui-toast__content-stack { display: flex; flex: 1 1 auto; min-inline-size: 0; flex-direction: column; }`, `:where(${scopes}) .gui-toast__title[hidden],`, `:where(${scopes}) .gui-toast__action[hidden],`, `:where(${scopes}) .gui-toast__dismiss[hidden] { display: none; }`, "");
  lines.push(`:where(${scopes}) .gui-toast__action,`, `:where(${scopes}) .gui-toast__dismiss {`, "  appearance: none;", "  box-sizing: border-box;", "  display: inline-flex;", "  flex: 0 0 auto;", "  align-items: center;", "  justify-content: center;", "  border: 0;", "  background: transparent;", "  color: inherit;", "  font: inherit;", "  cursor: pointer;", "}", "");
  for (const themeId of availableThemeIds) {
    const theme = ir.themes[themeId];
    const switchTrack = theme.visuals?.switch?.base?.track;
    const switchThumb = theme.visuals?.switch?.base?.thumb;
    if (switchTrack && switchThumb) {
      const root = `:where([data-gui-theme="${themeId}"]) .gui-switch`;
      lines.push(`${root} .gui-switch__thumb {`, `  width: ${cssValue(switchThumb.minWidth)};`, `  height: ${cssValue(switchThumb.minHeight)};`, "  left: 0;", "  top: 50%;", "  transform: translateY(-50%);", "}", "");
      lines.push(`${root}:where([aria-checked="true"]) .gui-switch__thumb {`, `  left: calc(100% - ${cssValue(switchThumb.minWidth)});`, "}", "");
    }
    const progress = theme.visuals?.progress;
    const track = progress?.base?.track;
    const indicator = progress?.base?.indicator;
    if (track?.border?.color) lines.push(`:where([data-gui-theme="${themeId}"]) .gui-progress { --gui-progress-track-color: ${cssValue(track.border.color)}; }`);
    if (track?.border?.width) lines.push(`:where([data-gui-theme="${themeId}"]) .gui-progress { --gui-progress-track-stroke: ${cssValue(track.border.width)}; }`);
    if (indicator?.border?.color) lines.push(`:where([data-gui-theme="${themeId}"]) .gui-progress { --gui-progress-indicator-color: ${cssValue(indicator.border.color)}; }`);
    if (indicator?.border?.width) lines.push(`:where([data-gui-theme="${themeId}"]) .gui-progress { --gui-progress-indicator-stroke: ${cssValue(indicator.border.width)}; }`);
    if (track || indicator) lines.push("");
  }
  lines.push("@keyframes gui-progress-linear-indeterminate {", "  from { transform: translateX(-100%); }", "  to { transform: translateX(350%); }", "}", "", "@keyframes gui-progress-circular-indeterminate {", "  from { transform: rotate(-90deg); }", "  to { transform: rotate(270deg); }", "}", "");
  lines.push("@media (prefers-reduced-motion: reduce) {", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-button,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-checkbox,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-input,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-select,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-tabs,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-menu,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-toast,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-progress,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-slider,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-switch {`, "    transition-duration: 0ms !important;", "    transition-delay: 0ms !important;", "  }", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-progress__indicator {`, "    animation: none !important;", "  }", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-progress:where([data-gui-variant="linear"]):where([data-gui-state~="indeterminate"]) .gui-progress__indicator {`, "    transform: translateX(75%);", "  }", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-progress:where([data-gui-variant="circular"]):where([data-gui-state~="indeterminate"]) .gui-progress__indicator {`, "    transform: rotate(-90deg);", "  }", "}", "");
  return `${lines.join("\n")}\n`;
}

if (process.argv[1]?.endsWith("generate-components-css.mjs")) {
  const input = process.argv[2] ?? "build/spec-ir.json";
  const output = process.argv[3] ?? "build/web/components.css";
  const ir = JSON.parse(await readFile(input, "utf8"));
  const css = generateComponentsCss(ir);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, css);
}
