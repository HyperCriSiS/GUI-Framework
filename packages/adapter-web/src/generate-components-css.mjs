// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { analyzeThemeAvailability } from "../../compiler/src/theme-availability.mjs";

function cssVar(reference) { return `--gui-${reference.slice(1, -1).replaceAll(".", "-")}`; }
function requireReference(leaf, label) { if (!leaf || typeof leaf.reference !== "string") throw new Error(`Missing token reference for ${label}`); return `var(${cssVar(leaf.reference)})`; }
function assertNeutralLeaf(style, key, label) {
  const leaf = style?.[key]; if (!leaf) return null;
  if (typeof leaf.reference !== "string") throw new Error(`${label}.${key} must remain token-backed`);
  return requireReference(leaf, `${label}.${key}`);
}
function styleDeclarations(style, label) {
  if (!style) return [];
  const out = [];
  const simple = [["fill","background-color"],["foreground","color"],["fontSize","font-size"],["fontWeight","font-weight"],["lineHeight","line-height"],["minWidth","min-width"],["minHeight","min-height"],["paddingHorizontal","padding-inline"],["paddingVertical","padding-block"],["gap","gap"],["radius","border-radius"],["opacity","opacity"]];
  for (const [key, css] of simple) { const value = assertNeutralLeaf(style,key,label); if (value) out.push(`${css}: ${value}`); }
  if (style.border) {
    const color = requireReference(style.border.color, `${label}.border.color`), width = requireReference(style.border.width, `${label}.border.width`);
    out.push(`border-color: ${color}`, `border-width: ${width}`);
  }
  if (style.outline) {
    const color = requireReference(style.outline.color, `${label}.outline.color`), width = requireReference(style.outline.width, `${label}.outline.width`), offset = requireReference(style.outline.offset, `${label}.outline.offset`);
    out.push(`outline-color: ${color}`, `outline-width: ${width}`, `outline-offset: ${offset}`, "outline-style: solid");
  }
  if (style.transition) {
    const transition = requireReference(style.transition, `${label}.transition`);
    out.push(`transition: ${transition}`, "transition-property: background-color, border-color, color, opacity, box-shadow, outline-color");
  }
  if (style.shadow) out.push(`box-shadow: ${requireReference(style.shadow, `${label}.shadow`)}`);
  if (style.backdropBlur) {
    const blur = requireReference(style.backdropBlur, `${label}.backdropBlur`);
    out.push(`-webkit-backdrop-filter: blur(${blur})`, `backdrop-filter: blur(${blur})`);
  }
  const allowed = new Set(["fill","foreground","fontSize","fontWeight","lineHeight","minWidth","minHeight","paddingHorizontal","paddingVertical","gap","radius","opacity","border","outline","transition","shadow","backdropBlur"]);
  for (const key of Object.keys(style)) if (!allowed.has(key)) throw new Error(`Unsupported Web visual property ${label}.${key}`);
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
    case "disabled": return `${rootSelector}:where(:disabled)`;
    case "loading": return `${rootSelector}:where([data-gui-loading="true"])`;
    case "error": return `${rootSelector}:where([aria-invalid="true"])`;
    default: return `${rootSelector}:where([data-gui-state~="${state}"])`;
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
    emitPartMap(lines, stateSelector(root, state), componentId, visual?.states?.[state], `${label}.states.${state}`);
    for (const variant of component.variants ?? []) {
      const variantRoot = `${root}:where([data-gui-variant="${variant}"])`;
      emitPartMap(lines, stateSelector(variantRoot, state), componentId, visual?.variants?.[variant]?.states?.[state], `${label}.variants.${variant}.states.${state}`);
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
  lines.push("@media (prefers-reduced-motion: reduce) {", `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-button,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-checkbox,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-input,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-select,`, `  :where(${availableThemeIds.map((id) => `[data-gui-theme="${id}"]`).join(", ")}) .gui-switch {`, "    transition-duration: 0ms !important;", "    transition-delay: 0ms !important;", "  }", "}", "");
  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/components.css"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const css = generate(ir);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, css, "utf8");
console.log(`Generated Web component CSS at ${outputPath}`);
