// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

function cssName(path) {
  return `--gui-${path.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

function scalarWithUnit(value, label) {
  if (!value || typeof value !== "object" || typeof value.value !== "number" || typeof value.unit !== "string") {
    throw new Error(`${label}: expected a numeric value with unit`);
  }
  return `${value.value}${value.unit}`;
}

function colorValue(value, label) {
  if (!value || typeof value !== "object") throw new Error(`${label}: expected color object`);
  const alpha = value.alpha ?? 1;
  if (typeof alpha !== "number" || alpha < 0 || alpha > 1) throw new Error(`${label}: color alpha must be in the range 0..1`);
  if (alpha === 1 && typeof value.hex === "string") return value.hex;
  if (value.colorSpace === "srgb" && Array.isArray(value.components) && value.components.length === 3) {
    const channels = value.components.map((component) => Math.round(component * 255));
    return alpha === 1 ? `rgb(${channels.join(" ")})` : `rgb(${channels.join(" ")} / ${alpha})`;
  }
  throw new Error(`${label}: Web adapter does not yet support this color representation`);
}

function shadowLayerValue(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: expected shadow layer object`);
  const inset = value.inset === true ? "inset " : "";
  return `${inset}${scalarWithUnit(value.offsetX, `${label}.offsetX`)} ` +
    `${scalarWithUnit(value.offsetY, `${label}.offsetY`)} ` +
    `${scalarWithUnit(value.blur, `${label}.blur`)} ` +
    `${scalarWithUnit(value.spread, `${label}.spread`)} ` +
    colorValue(value.color, `${label}.color`);
}

function shadowValue(value, label) {
  const layers = Array.isArray(value) ? value : [value];
  if (layers.length === 0) throw new Error(`${label}: shadow must contain at least one layer`);
  return layers.map((layer, index) => shadowLayerValue(layer, `${label}[${index}]`)).join(", ");
}

function cssTokenValue(token, label) {
  switch (token.type) {
    case "color": return colorValue(token.value, label);
    case "dimension":
    case "duration": return scalarWithUnit(token.value, label);
    case "number":
      if (typeof token.value !== "number") throw new Error(`${label}: expected number`);
      return String(token.value);
    case "cubicBezier":
      if (!Array.isArray(token.value) || token.value.length !== 4) throw new Error(`${label}: expected cubicBezier array`);
      return `cubic-bezier(${token.value.join(", ")})`;
    case "shadow": return shadowValue(token.value, label);
    case "transition": {
      const value = token.value;
      if (!value || typeof value !== "object") throw new Error(`${label}: expected transition object`);
      const duration = scalarWithUnit(value.duration, `${label}.duration`);
      const delay = scalarWithUnit(value.delay, `${label}.delay`);
      if (!Array.isArray(value.timingFunction) || value.timingFunction.length !== 4) throw new Error(`${label}.timingFunction: expected cubicBezier array`);
      return `${duration} cubic-bezier(${value.timingFunction.join(", ")}) ${delay}`;
    }
    default: throw new Error(`${label}: token type ${token.type} has no Web CSS mapping yet`);
  }
}

function declarations(tokens, predicate) {
  return Object.entries(tokens).filter(([path]) => predicate(path)).sort(([a], [b]) => a.localeCompare(b)).map(([path, token]) => `  ${cssName(path)}: ${cssTokenValue(token, path)};`);
}

function assertSamePrimitiveSet(palettes) {
  if (palettes.length < 2) return;
  const reference = Object.entries(palettes[0].tokens).filter(([path]) => !path.startsWith("semantic.")).map(([path, token]) => [path, token.type, JSON.stringify(token.value)]);
  for (const palette of palettes.slice(1)) {
    const current = Object.entries(palette.tokens).filter(([path]) => !path.startsWith("semantic.")).map(([path, token]) => [path, token.type, JSON.stringify(token.value)]);
    if (JSON.stringify(reference) !== JSON.stringify(current)) throw new Error(`Primitive token set differs for palette ${palette.id}; primitives must remain palette-independent`);
  }
}

function generate(ir) {
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) throw new Error("Compiled IR contains no palettes");
  assertSamePrimitiveSet(ir.palettes);
  const output = ["/* Generated from the language-neutral GUI Framework specification. */", "/* Do not edit directly. */", "", ":root {", ...declarations(ir.palettes[0].tokens, (path) => !path.startsWith("semantic.")), "}", ""];
  for (const palette of ir.palettes) {
    output.push(`[data-gui-palette="${palette.id}"] {`);
    output.push(...declarations(palette.tokens, (path) => path.startsWith("semantic.")));
    output.push("}", "");
  }
  return `${output.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/tokens.css"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const css = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), css, "utf8");
console.log(`Generated Web CSS tokens at ${outputPath}`);
