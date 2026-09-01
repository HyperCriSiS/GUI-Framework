// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { analyzeThemeAvailability } from "../../compiler/src/theme-availability.mjs";

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

function readonlyJson(value, indent = "") {
  return `${JSON.stringify(value, null, 2).replace(/\n/g, `\n${indent}`)} as const`;
}

function capabilityProfile(component, visual) {
  return {
    required: [...(component.capabilities?.required ?? [])],
    optional: [...(component.capabilities?.optional ?? [])],
    fallbackOrder: [...(component.capabilities?.fallbackOrder ?? [])],
    fallbacks: Object.fromEntries(
      Object.entries(visual?.fallbacks ?? {}).map(([id, fallback]) => [
        id,
        { requires: [...(fallback.requires ?? [])] },
      ]),
    ),
  };
}

function generate(ir) {
  const { registeredThemeIds, availableThemeIds, componentIds } = analyzeThemeAvailability(ir);
  if (availableThemeIds.length === 0) throw new Error("Compiled IR contains no fully visualized themes");
  const referenceComponents = ir.palettes[0].components ?? {};

  const lines = [
    "// Generated from the language-neutral GUI Framework specification.",
    "// Do not edit directly.",
    "",
    `export const guiRegisteredThemeIds = ${readonlyTuple(registeredThemeIds)};`,
    "export type GuiRegisteredThemeId = (typeof guiRegisteredThemeIds)[number];",
    "",
    `export const guiThemeIds = ${readonlyTuple(availableThemeIds)};`,
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
    lines.push(`  anatomy: ${readonlyJson(contract.anatomy, "  ")},`);
    lines.push(`  content: ${readonlyJson(contract.content, "  ")},`);
    lines.push(`  properties: ${readonlyJson(contract.properties, "  ")},`);
    lines.push(`  events: ${readonlyJson(contract.events, "  ")},`);
    lines.push(`  variants: ${readonlyTuple(contract.variants)},`);
    lines.push(`  sizes: ${readonlyTuple(contract.sizes)},`);
    lines.push(`  states: ${readonlyTuple(contract.states)},`);
    lines.push(`  semantics: ${readonlyJson(contract.semantics, "  ")},`);
    lines.push(`  capabilities: ${readonlyJson(contract.capabilities, "  ")}`);
    lines.push("} as const;", "");
    lines.push(`export type Gui${name}Variant = (typeof gui${name}Contract.variants)[number];`);
    lines.push(`export type Gui${name}Size = (typeof gui${name}Contract.sizes)[number];`);
    lines.push(`export type Gui${name}State = (typeof gui${name}Contract.states)[number];`);
    lines.push("");
  }

  const capabilityProfiles = {};
  const referencePalette = ir.palettes[0];
  for (const themeId of availableThemeIds) {
    capabilityProfiles[themeId] = {};
    for (const componentId of componentIds) {
      capabilityProfiles[themeId][componentId] = capabilityProfile(
        referenceComponents[componentId],
        referencePalette.themes?.[themeId]?.components?.[componentId],
      );
    }
  }

  for (const palette of ir.palettes.slice(1)) {
    for (const themeId of availableThemeIds) {
      for (const componentId of componentIds) {
        const expected = capabilityProfiles[themeId][componentId];
        const actual = capabilityProfile(
          palette.components?.[componentId],
          palette.themes?.[themeId]?.components?.[componentId],
        );
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(
            `Capability profile differs for palette ${palette.id}, theme ${themeId}, component ${componentId}`,
          );
        }
      }
    }
  }

  lines.push(`export const guiCapabilityProfiles = ${readonlyJson(capabilityProfiles)};`, "");
  lines.push("export type GuiCapabilityProfiles = typeof guiCapabilityProfiles;", "");

  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/web/contracts.ts"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const source = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), source, "utf8");
console.log(`Generated Web TypeScript contracts at ${outputPath}`);
