// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

function pascalCase(value) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function literal(value) {
  return JSON.stringify(value);
}

function readonlyTuple(values) {
  return `[${values.map(literal).join(", ")}] as const`;
}

function generate(ir) {
  if (!Array.isArray(ir.themes) || ir.themes.length === 0) {
    throw new Error("Compiled IR contains no themes");
  }
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) {
    throw new Error("Compiled IR contains no palettes/components");
  }

  const referenceComponents = ir.palettes[0].components ?? {};
  const componentIds = Object.keys(referenceComponents).sort();
  if (componentIds.length === 0) throw new Error("Compiled IR contains no components");

  for (const palette of ir.palettes.slice(1)) {
    const ids = Object.keys(palette.components ?? {}).sort();
    if (JSON.stringify(ids) !== JSON.stringify(componentIds)) {
      throw new Error(`Component registry differs for palette ${palette.id}`);
    }
  }

  const lines = [
    "// Generated from the language-neutral GUI Framework specification.",
    "// Do not edit directly.",
    "",
    `export const guiThemeIds = ${readonlyTuple(ir.themes.map((theme) => theme.id))};`,
    "export type GuiThemeId = (typeof guiThemeIds)[number];",
    "",
    `export const guiComponentIds = ${readonlyTuple(componentIds)};`,
    "export type GuiComponentId = (typeof guiComponentIds)[number];",
    ""
  ];

  for (const id of componentIds) {
    const contract = referenceComponents[id];
    const name = pascalCase(id);
    lines.push(`export const gui${name}Contract = {`);
    lines.push(`  anatomy: ${JSON.stringify(contract.anatomy, null, 2).replace(/\n/g, "\n  ")} as const,`);
    lines.push(`  variants: ${readonlyTuple(contract.variants)},`);
    lines.push(`  sizes: ${readonlyTuple(contract.sizes)},`);
    lines.push(`  states: ${readonlyTuple(contract.states)},`);
    lines.push(`  semantics: ${JSON.stringify(contract.semantics, null, 2).replace(/\n/g, "\n  ")} as const,`);
    lines.push(`  capabilities: ${JSON.stringify(contract.capabilities, null, 2).replace(/\n/g, "\n  ")} as const`);
    lines.push("} as const;", "");
    lines.push(`export type Gui${name}Variant = (typeof gui${name}Contract.variants)[number];`);
    lines.push(`export type Gui${name}Size = (typeof gui${name}Contract.sizes)[number];`);
    lines.push(`export type Gui${name}State = (typeof gui${name}Contract.states)[number];`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/contracts.ts"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const source = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), source, "utf8");
console.log(`Generated Web TypeScript contracts at ${outputPath}`);
