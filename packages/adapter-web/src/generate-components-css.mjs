// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

function scalarWithUnit(value, label) {
  if (!value || typeof value !== "object" || typeof value.value !== "number" || typeof value.unit !== "string") {
    throw new Error(`${label}: expected a numeric value with unit`);
  }
  return `${value.value}${value.unit}`;
}

function colorValue(value, label) {
  if (!value || typeof value !== "object") throw new Error(`${label}: expected color object`);
  if (typeof value.hex === "string") return value.hex;
  if (value.colorSpace === "srgb" && Array.isArray(value.components) && value.components.length === 3) {
    const channels = value.components.map((component) => Math.round(component * 255));
    const alpha = typeof value.alpha === "number" ? ` / ${value.alpha}` : "";
    return `rgb(${channels.join(" ")}${alpha})`;
  }
  throw new Error(`${label}: Web adapter does not support this color representation`);
}

function compiledValue(value, label) {
  if (!value || typeof value !== "object" || typeof value.type !== "string") {
    throw new Error(`${label}: expected compiled visual value`);
  }
  switch (value.type) {
    case "color": return colorValue(value.value, label);
    case "dimension":
    case "duration": return scalarWithUnit(value.value, label);
    case "number": return String(value.value);
    default: throw new Error(`${label}: unsupported visual token type ${value.type}`);
  }
}

function transitionDeclarations(value, label) {
  if (!value || value.type !== "transition" || !value.value) {
    throw new Error(`${label}: expected compiled transition`);
  }
  const duration = scalarWithUnit(value.value.duration, `${label}.duration`);
  const delay = scalarWithUnit(value.value.delay, `${label}.delay`);
  const timing = value.value.timingFunction;
  if (!Array.isArray(timing) || timing.length !== 4) throw new Error(`${label}: invalid timingFunction`);
  return [
    `transition-duration: ${duration}`,
    `transition-timing-function: cubic-bezier(${timing.join(", ")})`,
    `transition-delay: ${delay}`,
    "transition-property: background-color, border-color, color, opacity, box-shadow, outline-color",
  ];
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
      case "shadow":
      case "blur":
      case "backdropBlur":
      case "glow":
        throw new Error(`${label}: visual property ${property} is not yet mapped by the Web reference adapter`);
      default: throw new Error(`${label}: unsupported visual property ${property}`);
    }
  }
  return output;
}

function kebabPart(partId) {
  return partId.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function partSelector(rootSelector, componentId, partId) {
  if (partId === "root") return rootSelector;
  if (componentId === "input" && partId === "placeholder") return `${rootSelector}::placeholder`;
  return `${rootSelector} .gui-${componentId}__${kebabPart(partId)}`;
}

function stateSelector(rootSelector, state) {
  switch (state) {
    case "default": return rootSelector;
    case "hover": return `${rootSelector}:hover:not(:disabled)`;
    case "focus": return `${rootSelector}:focus-visible`;
    case "pressed": return `${rootSelector}:active:not(:disabled)`;
    case "disabled": return `${rootSelector}:disabled`;
    case "loading": return `${rootSelector}[data-gui-loading="true"]`;
    case "error": return `${rootSelector}[aria-invalid="true"]`;
    default: return `${rootSelector}[data-gui-state~="${state}"]`;
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

function emitVisual(lines, prefix, componentId, component, visual, label) {
  const root = `${prefix} .gui-${componentId}`;
  emitPartMap(lines, root, componentId, visual.base, `${label}.base`);

  for (const size of component.sizes ?? []) {
    emitPartMap(lines, `${root}[data-gui-size="${size}"]`, componentId, visual.sizes?.[size], `${label}.sizes.${size}`);
  }

  for (const variant of component.variants ?? []) {
    const scoped = visual.variants?.[variant];
    if (!scoped) continue;
    const variantRoot = `${root}[data-gui-variant="${variant}"]`;
    emitPartMap(lines, variantRoot, componentId, scoped.base, `${label}.variants.${variant}.base`);
    for (const size of component.sizes ?? []) {
      emitPartMap(lines, `${variantRoot}[data-gui-size="${size}"]`, componentId, scoped.sizes?.[size], `${label}.variants.${variant}.sizes.${size}`);
    }
  }

  for (const state of component.states ?? []) {
    if (state === "default") continue;
    emitPartMap(lines, stateSelector(root, state), componentId, visual.states?.[state], `${label}.states.${state}`);
    for (const variant of component.variants ?? []) {
      const variantRoot = `${root}[data-gui-variant="${variant}"]`;
      emitPartMap(
        lines,
        stateSelector(variantRoot, state),
        componentId,
        visual.variants?.[variant]?.states?.[state],
        `${label}.variants.${variant}.states.${state}`,
      );
    }
  }
}

function emitFoundation(lines) {
  lines.push(
    ".gui-button {",
    "  appearance: none;",
    "  box-sizing: border-box;",
    "  display: inline-flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  border-style: solid;",
    "  border-width: 0;",
    "  background: transparent;",
    "  color: inherit;",
    "  font-family: inherit;",
    "  cursor: pointer;",
    "  user-select: none;",
    "  text-decoration: none;",
    "  vertical-align: middle;",
    "}",
    "",
    ".gui-button:disabled { cursor: default; }",
    ".gui-button:focus { outline: none; }",
    "",
    ".gui-input {",
    "  appearance: none;",
    "  box-sizing: border-box;",
    "  display: inline-block;",
    "  border-style: solid;",
    "  border-width: 0;",
    "  background: transparent;",
    "  color: inherit;",
    "  font-family: inherit;",
    "  vertical-align: middle;",
    "  outline: none;",
    "}",
    "",
    ".gui-input::placeholder { opacity: 1; }",
    ".gui-input:disabled { cursor: default; }",
    "",
  );
}

function generate(ir) {
  const lines = [
    "/* Generated from the language-neutral GUI Framework specification. */",
    "/* Do not edit directly. */",
    "",
  ];
  emitFoundation(lines);

  for (const palette of ir.palettes ?? []) {
    const componentIds = Object.keys(palette.components ?? {}).sort();
    for (const theme of ir.themes ?? []) {
      const themeComponents = palette.themes?.[theme.id]?.components ?? {};
      for (const componentId of componentIds) {
        const visual = themeComponents[componentId];
        const component = palette.components?.[componentId];
        if (!visual || !component) continue;
        const prefix = `[data-gui-palette="${palette.id}"][data-gui-theme="${theme.id}"]`;
        emitVisual(lines, prefix, componentId, component, visual, `${palette.id}.${theme.id}.${componentId}`);
      }
    }
  }

  lines.push(
    "@media (prefers-reduced-motion: reduce) {",
    "  .gui-button, .gui-input {",
    "    transition-duration: 0ms !important;",
    "    transition-delay: 0ms !important;",
    "  }",
    "}",
    "",
  );

  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/components.css"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const css = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), css, "utf8");
console.log(`Generated Web component CSS at ${outputPath}`);
