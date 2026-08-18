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

function kotlinDefault(property) {
  if (Object.prototype.hasOwnProperty.call(property, "default")) {
    if (property.type === "number") return Number(property.default).toString();
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

function verifyRegistry(ir) {
  if (!Array.isArray(ir.themes) || ir.themes.length === 0) throw new Error("Compiled IR contains no themes");
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) throw new Error("Compiled IR contains no palettes/components");
  const ids = Object.keys(ir.palettes[0].components ?? {}).sort();
  if (ids.length === 0) throw new Error("Compiled IR contains no components");
  const reference = JSON.stringify(ir.palettes[0].components);
  for (const palette of ir.palettes.slice(1)) {
    if (JSON.stringify(palette.components) !== reference) {
      throw new Error(`Component contracts differ for palette ${palette.id}; Kotlin contracts must remain palette-independent`);
    }
  }
  return ids;
}

function generate(ir) {
  const componentIds = verifyRegistry(ir);
  const components = ir.palettes[0].components;
  const lines = [
    "// Generated from the language-neutral GUI Framework specification.",
    "// Do not edit directly.",
    "@file:Suppress(\"MemberVisibilityCanBePrivate\")",
    "",
    "package gui.framework.generated.internal",
    ""
  ];

  emitEnum(lines, "GuiThemeId", ir.themes.map((theme) => theme.id));
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

const [inputPath = "build/spec-ir.json", outputPath = "build/compose/GuiContracts.kt"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const source = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), source, "utf8");
console.log(`Generated Kotlin contracts at ${outputPath}`);
