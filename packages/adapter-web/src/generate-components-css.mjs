// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { analyzeThemeAvailability } from "../../compiler/src/theme-resolution.mjs";
import { parseColorHex } from "../../compiler/src/color.mjs";
const effects = new Set(["fill", "foreground", "radius", "paddingHorizontal", "paddingVertical", "gap", "minWidth", "minHeight", "fontSize", "fontWeight", "lineHeight", "opacity", "border", "outline", "shadow", "blur", "backdropBlur", "glow", "transition"]);
const timeUnits = new Set(["ms", "s"]);
const timingFunctionNames = new Set(["ease", "linear", "ease-in", "ease-out", "ease-in-out", "step-start", "step-end"]);
function cssName(path) { return `--gui-${path.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`; }
function tokenPath(reference, label) {
  if (typeof reference !== "string" || !reference.startsWith("{") || !reference.endsWith("}")) throw new Error(`${label} must be a token reference`);
  return reference.slice(1, -1);
}
function compiledValue(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("type" in value) || !("value" in value)) throw new Error(`${label} must be a compiled visual value`);
  if (value.type === "color") return `var(${cssName(tokenPath(value.reference, label))})`;
  if (value.type === "dimension") return `var(${cssName(tokenPath(value.reference, label))})`;
  if (value.type === "number" || value.type === "fontWeight" || value.type === "duration" || value.type === "cubicBezier") return `var(${cssName(tokenPath(value.reference, label))})`;
  if (value.type === "shadow") return `var(${cssName(tokenPath(value.reference, label))})`;
  throw new Error(`Unsupported compiled visual type ${value.type} at ${label}`);
}
function transitionDeclarations(value, label) {
  if (!value || value.type !== "transition" || !value.value) throw new Error(`${label} must be a compiled transition`);
  const duration = compiledValue(value.value.duration, `${label}.duration`); const easing = compiledValue(value.value.easing, `${label}.easing`);
  return [`transition-duration: ${duration};`, `transition-timing-function: ${easing};`];
}
function styleDeclarations(style, label) {
  const out = [];
  for (const [key, value] of Object.entries(style ?? {})) {
    if (!effects.has(key)) throw new Error(`Unsupported visual property ${key} at ${label}`);
    switch (key) {
      case "fill": out.push(`background: ${compiledValue(value, `${label}.fill`)};`); break;
      case "foreground": out.push(`color: ${compiledValue(value, `${label}.foreground`)};`); break;
      case "radius": out.push(`border-radius: ${compiledValue(value, `${label}.radius`)};`); break;
      case "paddingHorizontal": { const v=compiledValue(value,`${label}.paddingHorizontal`); out.push(`padding-left: ${v};`,`padding-right: ${v};`); break; }
      case "paddingVertical": { const v=compiledValue(value,`${label}.paddingVertical`); out.push(`padding-top: ${v};`,`padding-bottom: ${v};`); break; }
      case "gap": out.push(`gap: ${compiledValue(value, `${label}.gap`)};`); break;
      case "minWidth": out.push(`min-width: ${compiledValue(value, `${label}.minWidth`)};`); break;
      case "minHeight": out.push(`min-height: ${compiledValue(value, `${label}.minHeight`)};`); break;
      case "fontSize": out.push(`font-size: ${compiledValue(value, `${label}.fontSize`)};`); break;
      case "fontWeight": out.push(`font-weight: ${compiledValue(value, `${label}.fontWeight`)};`); break;
      case "lineHeight": out.push(`line-height: ${compiledValue(value, `${label}.lineHeight`)};`); break;
      case "opacity": out.push(`opacity: ${compiledValue(value, `${label}.opacity`)};`); break;
      case "border": out.push(`border: ${compiledValue(value.width, `${label}.border.width`)} solid ${compiledValue(value.color, `${label}.border.color`)};`); break;
      case "outline": out.push(`outline: ${compiledValue(value.width, `${label}.outline.width`)} solid ${compiledValue(value.color, `${label}.outline.color`)};`, `outline-offset: ${compiledValue(value.offset, `${label}.outline.offset`)};`); break;
      case "shadow": out.push(`box-shadow: ${compiledValue(value, `${label}.shadow`)};`); break;
      case "blur": out.push(`filter: blur(${compiledValue(value, `${label}.blur`)});`); break;
      case "backdropBlur": { const v=compiledValue(value,`${label}.backdropBlur`); out.push(`-webkit-backdrop-filter: blur(${v});`,`backdrop-filter: blur(${v});`); break; }
      case "glow": out.push(`box-shadow: 0 0 ${compiledValue(value, `${label}.glow`)} currentColor;`); break;
      case "transition": out.push(...transitionDeclarations(value, `${label}.transition`)); break;
    }
  }
  return out;
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
    case "indeterminate": return `${rootSelector}:where([aria-checked="mixed"], [data-gui-indeterminate="true"])`;
    case "selected": return `${rootSelector}:where([aria-selected="true"])`;
    case "disabled": return `${rootSelector}:where(:disabled)`;
    case "loading": return `${rootSelector}:where([data-gui-loading="true"])`;
    case "error": return `${rootSelector}:where([aria-invalid="true"])`;
    default: return `${rootSelector}:where([data-gui-state~="${state}"])`;
  }
}
function statePartSelector(rootSelector, componentId, state, partId) {
  if (componentId !== "tabs") return partSelector(stateSelector(rootSelector, state), componentId, partId);
  const tabSelector = partSelector(rootSelector, componentId, "tab");
  const interactiveSelector = state === "hover" ? `${tabSelector}:where(:hover:not(:disabled))`
    : state === "focus" ? `${tabSelector}:where(:focus-visible)`
      : state === "pressed" ? `${tabSelector}:where(:active:not(:disabled))`
        : state === "selected" ? `${tabSelector}:where([aria-selected="true"])`
          : state === "disabled" ? `${tabSelector}:where(:disabled)` : stateSelector(tabSelector, state);
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
    for (const declaration of declarations) lines.push(`  ${declaration}`);
    lines.push("}", "");
  }
}
function emitPartMap(lines, selector, componentId, partMap, label) {
  for (const [partId, style] of Object.entries(partMap ?? {})) {
    const declarations = styleDeclarations(style, `${label}.${partId}`);
    if (declarations.length === 0) continue;
    lines.push(`${partSelector(selector, componentId, partId)} {`);
    for (const declaration of declarations) lines.push(`  ${declaration}`);
    lines.push("}", "");
  }
}
function emitScopedVisual(lines, root, componentId, component, visual, label) {
  emitPartMap(lines, root, componentId, visual?.base, `${label}.base`);
  for (const size of component.sizes ?? []) emitPartMap(lines, `${root}:where([data-gui-size="${size}"])`, componentId, visual?.sizes?.[size], `${label}.sizes.${size}`);
  for (const state of component.states ?? []) emitStatePartMap(lines, root, componentId, state, visual?.states?.[state], `${label}.states.${state}`);
  for (const variant of component.variants ?? []) {
    const scoped=visual?.variants?.[variant]; if(!scoped) continue;
    const variantRoot = `${root}:where([data-gui-variant="${variant}"])`;
    emitPartMap(lines, variantRoot, componentId, scoped.base, `${label}.variants.${variant}.base`);
    for (const size of component.sizes ?? []) emitPartMap(lines, `${variantRoot}:where([data-gui-size="${size}"])`, componentId, scoped.sizes?.[size], `${label}.variants.${variant}.sizes.${size}`);
    for (const state of component.states ?? []) emitStatePartMap(lines, variantRoot, componentId, state, scoped.states?.[state], `${label}.variants.${variant}.states.${state}`);
  }
  for (const state of component.states ?? []) {
    for (const variant of component.variants ?? []) {
      const scoped=visual?.variants?.[variant]; if(!scoped) continue;
      const variantRoot = `${root}:where([data-gui-variant="${variant}"])`;
      emitStatePartMap(lines, variantRoot, componentId, state, scoped.states?.[state], `${label}.variants.${variant}.states.${state}`);
    }
  }
}
function emitVisual(lines, prefix, componentId, component, visual, label) {
  const root = `${prefix} .gui-${componentId}`;
  emitScopedVisual(lines, root, componentId, component, visual, label);
  for (const fallback of visual?.fallbacks ?? []) {
    const fallbackId = fallback.id;
    emitScopedVisual(lines, `${root}:where([data-gui-fallback="${fallbackId}"])`, componentId, component, fallback.recipe, `${label}.fallbacks.${fallbackId}.recipe`);
  }
}
function referenceShape(value) {
  if (Array.isArray(value)) return value.map(referenceShape);
  if (!value || typeof value !== "object") return value;
  if ("reference" in value && "type" in value && "value" in value) return { reference: value.reference, type: value.type };
  return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key, nested]) => [key, referenceShape(nested)]));
}
function assertPaletteIndependentVisuals(ir) {
  const reference = ir.palettes?.[0]; if (!reference) throw new Error("Compiled IR has no palette outputs");
  const referenceComponents = Object.keys(reference.components ?? {}).sort();
  for (const palette of ir.palettes.slice(1)) {
    const ids = Object.keys(palette.components ?? {}).sort();
    if (JSON.stringify(ids) !== JSON.stringify(referenceComponents)) throw new Error(`Component registry differs for palette ${palette.id}`);
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
  lines.push("@media (prefers-reduced-motion: reduce) {", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-button,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-checkbox,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-input,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-select,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-tabs,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-switch {`, "    transition-duration: 0ms !important;", "    transition-delay: 0ms !important;", "  }", "}", "");
  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/components.css"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const css = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), css, "utf8");
console.log(`Generated Web component CSS at ${outputPath}`);
