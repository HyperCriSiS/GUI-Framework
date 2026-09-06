// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { analyzeThemeAvailability } from "../../compiler/src/theme-availability.mjs";

function pascalCase(value) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function screamingSnake(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function kotlinString(value) {
  return JSON.stringify(value);
}

function kotlinType(type) {
  if (type === "boolean") return "Boolean";
  if (type === "string") return "String";
  if (type === "number") return "Double";
  throw new Error(`Unsupported Kotlin property type: ${type}`);
}

function kotlinDouble(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid finite Kotlin Double default: ${value}`);
  return Number.isInteger(number) ? `${number}.0` : number.toString();
}

function kotlinDefault(property) {
  if (Object.prototype.hasOwnProperty.call(property, "default")) {
    if (property.type === "number") return kotlinDouble(property.default);
    if (property.type === "string") return kotlinString(property.default);
    if (property.type === "boolean") return String(property.default);
  }
  if (!property.required) return property.type === "boolean" ? "false" : "null";
  return undefined;
}

function kotlinPropertyType(property) {
  const base = kotlinType(property.type);
  return !property.required && property.type !== "boolean" && !Object.prototype.hasOwnProperty.call(property, "default")
    ? `${base}?`
    : base;
}

function emitEnum(lines, name, values) {
  lines.push(`enum class ${name}(val wireValue: String) {`);
  values.forEach((value, index) => {
    const suffix = index === values.length - 1 ? ";" : ",";
    lines.push(`    ${screamingSnake(value)}(${kotlinString(value)})${suffix}`);
  });
  lines.push("}", "");
}

function paletteIndependentContract(component) {
  return {
    anatomy: component.anatomy,
    content: component.content,
    properties: component.properties,
    events: component.events,
    variants: component.variants,
    sizes: component.sizes,
    states: component.states,
    semantics: component.semantics,
    capabilities: component.capabilities
  };
}

function verifyRegistry(ir) {
  if (!Array.isArray(ir.themes) || ir.themes.length === 0) throw new Error("Compiled IR contains no themes");
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) throw new Error("Compiled IR contains no palettes/components");

  const ids = Object.keys(ir.palettes[0].components ?? {}).sort();
  if (ids.length === 0) throw new Error("Compiled IR contains no components");

  const referenceContracts = Object.fromEntries(
    ids.map((id) => [id, paletteIndependentContract(ir.palettes[0].components[id])])
  );

  for (const palette of ir.palettes.slice(1)) {
    const paletteIds = Object.keys(palette.components ?? {}).sort();
    if (JSON.stringify(paletteIds) !== JSON.stringify(ids)) {
      throw new Error(`Component registry differs for palette ${palette.id}`);
    }

    for (const id of ids) {
      const current = paletteIndependentContract(palette.components[id]);
      if (JSON.stringify(current) !== JSON.stringify(referenceContracts[id])) {
        throw new Error(`Palette-independent contract for component ${id} differs for palette ${palette.id}`);
      }
    }
  }

  return ids;
}

function contractTypeNames(ir) {
  const componentIds = Object.keys(ir.palettes?.[0]?.components ?? {}).sort();
  const names = [
    "GuiRegisteredThemeId",
    "GuiThemeId",
    "GuiComponentId",
    "GuiContentSlot",
    "GuiEventContract",
    "GuiComponentSemantics",
    "GuiComponentCapabilities",
  ];
  for (const id of componentIds) {
    const name = pascalCase(id);
    names.push(
      `Gui${name}Variant`,
      `Gui${name}Size`,
      `Gui${name}State`,
      `Gui${name}Properties`,
      `Gui${name}Contract`,
    );
  }
  return names;
}

function generateCompatibilityAliases(ir) {
  const lines = [
    "// Generated compatibility aliases for the pre-stable contract namespace.",
    "// Do not edit directly. New consumer code must import gui.framework.generated.api.",
    "@file:Suppress(\"unused\")",
    "",
    "package gui.framework.generated.internal",
    "",
  ];
  for (const name of contractTypeNames(ir)) {
    lines.push(`typealias ${name} = gui.framework.generated.api.${name}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function defaultAliasPath(outputPath) {
  const resolvedOutput = resolve(outputPath);
  const fileName = basename(resolvedOutput);
  const aliasName = fileName.startsWith("GuiContracts")
    ? fileName.replace(/^GuiContracts/, "GuiContractAliases")
    : "GuiContractAliases.kt";
  return join(dirname(resolvedOutput), aliasName);
}

function generate(ir) {
  const { registeredThemeIds, availableThemeIds } = analyzeThemeAvailability(ir);
  if (availableThemeIds.length === 0) throw new Error("Compiled IR contains no fully visualized themes");
  const componentIds = verifyRegistry(ir);
  const components = ir.palettes[0].components;
  const lines = [
    "// Generated from the language-neutral GUI Framework specification.",
    "// Do not edit directly.",
    "@file:Suppress(\"MemberVisibilityCanBePrivate\")",
    "",
    "package gui.framework.generated.api",
    ""
  ];

  emitEnum(lines, "GuiRegisteredThemeId", registeredThemeIds);
  emitEnum(lines, "GuiThemeId", availableThemeIds);
  emitEnum(lines, "GuiComponentId", componentIds);

  lines.push("data class GuiContentSlot(", "    val id: String,", "    val kind: String,", "    val required: Boolean", ")", "");
  lines.push("data class GuiEventContract(", "    val id: String,", "    val payload: String", ")", "");
  lines.push("data class GuiComponentSemantics(", "    val role: String,", "    val preferNativePrimitive: Boolean", ")", "");
  lines.push("data class GuiComponentCapabilities(", "    val required: List<String>,", "    val optional: List<String>,", "    val fallbackOrder: List<String>", ")", "");

  for (const id of componentIds) {
    const contract = components[id];
    const name = pascalCase(id);
    emitEnum(lines, `Gui${name}Variant`, contract.variants);
    emitEnum(lines, `Gui${name}Size`, contract.sizes);
    emitEnum(lines, `Gui${name}State`, contract.states);

    lines.push(`data class Gui${name}Properties(`);
    contract.properties.forEach((property, index) => {
      const comma = index === contract.properties.length - 1 ? "" : ",";
      const defaultValue = kotlinDefault(property);
      const defaultSuffix = defaultValue === undefined ? "" : ` = ${defaultValue}`;
      lines.push(`    val ${property.id}: ${kotlinPropertyType(property)}${defaultSuffix}${comma}`);
    });
    lines.push(")", "");

    lines.push(`object Gui${name}Contract {`);
    lines.push(`    val componentId: GuiComponentId = GuiComponentId.${screamingSnake(id)}`);
    lines.push("    val content: List<GuiContentSlot> = listOf(");
    contract.content.forEach((slot, index) => {
      const comma = index === contract.content.length - 1 ? "" : ",";
      lines.push(`        GuiContentSlot(${kotlinString(slot.id)}, ${kotlinString(slot.kind)}, ${slot.required})${comma}`);
    });
    lines.push("    )");
    lines.push("    val events: List<GuiEventContract> = listOf(");
    contract.events.forEach((event, index) => {
      const comma = index === contract.events.length - 1 ? "" : ",";
      lines.push(`        GuiEventContract(${kotlinString(event.id)}, ${kotlinString(event.payload)})${comma}`);
    });
    lines.push("    )");
    lines.push(`    val semantics = GuiComponentSemantics(${kotlinString(contract.semantics.role)}, ${contract.semantics.preferNativePrimitive})`);
    lines.push("    val capabilities = GuiComponentCapabilities(");
    lines.push(`        required = listOf(${contract.capabilities.required.map(kotlinString).join(", ")}),`);
    lines.push(`        optional = listOf(${contract.capabilities.optional.map(kotlinString).join(", ")}),`);
    lines.push(`        fallbackOrder = listOf(${contract.capabilities.fallbackOrder.map(kotlinString).join(", ")})`);
    lines.push("    )");
    lines.push("}", "");
  }

  return `${lines.join("\n")}\n`;
}

const args = process.argv.slice(2);
const inputPath = args[0] ?? "build/spec-ir.json";
const outputPath = args[1] ?? "build/compose/GuiContracts.kt";
// The normal build emits compatibility aliases. Custom one-off generator calls remain
// single-output unless they explicitly request an alias path as the third argument.
const aliasOutputPath = args[2] ?? (args.length < 2 ? defaultAliasPath(outputPath) : null);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const source = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), source, "utf8");
if (aliasOutputPath) {
  const aliases = generateCompatibilityAliases(ir);
  await mkdir(dirname(resolve(aliasOutputPath)), { recursive: true });
  await writeFile(resolve(aliasOutputPath), aliases, "utf8");
}
console.log(`Generated Kotlin contracts at ${outputPath}`);
if (aliasOutputPath) console.log(`Generated Kotlin compatibility aliases at ${aliasOutputPath}`);
