// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

function kotlinString(value) {
  return JSON.stringify(value);
}

function kotlinDouble(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected finite number, got ${JSON.stringify(value)}`);
  }
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

function kotlinList(values) {
  return `listOf(${values.map(kotlinDouble).join(", ")})`;
}

function colorValueExpr(value, label) {
  if (!value || typeof value !== "object" || !Array.isArray(value.components) || value.components.length !== 3) {
    throw new Error(`${label}: expected resolved color value with three components`);
  }
  if (value.components.some((component) => typeof component !== "number" || !Number.isFinite(component) || component < 0 || component > 1)) {
    throw new Error(`${label}: expected color components in the range 0..1`);
  }
  if (value.alpha !== undefined && (typeof value.alpha !== "number" || !Number.isFinite(value.alpha) || value.alpha < 0 || value.alpha > 1)) {
    throw new Error(`${label}: expected color alpha in the range 0..1`);
  }
  const hex = typeof value.hex === "string" ? kotlinString(value.hex) : "null";
  const alpha = value.alpha === undefined ? "" : `, ${kotlinDouble(value.alpha)}`;
  return `GuiColorValue(${kotlinString(value.colorSpace)}, ${kotlinList(value.components)}, ${hex}${alpha})`;
}

function dimensionValueExpr(value, label) {
  if (!value || typeof value !== "object") {
    throw new Error(`${label}: expected resolved dimension value`);
  }
  return `GuiDimensionValue(${kotlinDouble(value.value)}, ${kotlinString(value.unit)})`;
}

function shadowValueExpr(value, label) {
  if (!value || typeof value !== "object") {
    throw new Error(`${label}: expected resolved shadow value`);
  }
  return `GuiShadowValue(` +
    `color = ${colorValueExpr(value.color, `${label}.color`)}, ` +
    `offsetX = ${dimensionValueExpr(value.offsetX, `${label}.offsetX`)}, ` +
    `offsetY = ${dimensionValueExpr(value.offsetY, `${label}.offsetY`)}, ` +
    `blur = ${dimensionValueExpr(value.blur, `${label}.blur`)}, ` +
    `spread = ${dimensionValueExpr(value.spread, `${label}.spread`)}, ` +
    `inset = ${value.inset === true ? "true" : "false"}` +
    `)`;
}

function tokenValue(token, label) {
  switch (token.type) {
    case "color":
      return colorValueExpr(token.value, label);
    case "dimension":
      return dimensionValueExpr(token.value, label);
    case "shadow":
      return shadowValueExpr(token.value, label);
    case "duration":
      return `GuiDurationValue(${kotlinDouble(token.value.value)}, ${kotlinString(token.value.unit)})`;
    case "number":
      return `GuiNumberValue(${kotlinDouble(token.value)})`;
    case "cubicBezier":
      if (!Array.isArray(token.value) || token.value.length !== 4) {
        throw new Error(`${label}: expected resolved cubicBezier value`);
      }
      return `GuiCubicBezierValue(${token.value.map(kotlinDouble).join(", ")})`;
    case "transition": {
      const value = token.value;
      if (!value || typeof value !== "object" || !Array.isArray(value.timingFunction)) {
        throw new Error(`${label}: expected resolved transition value`);
      }
      return `GuiTransitionValue(` +
        `duration = GuiDurationValue(${kotlinDouble(value.duration.value)}, ${kotlinString(value.duration.unit)}), ` +
        `delay = GuiDurationValue(${kotlinDouble(value.delay.value)}, ${kotlinString(value.delay.unit)}), ` +
        `timingFunction = GuiCubicBezierValue(${value.timingFunction.map(kotlinDouble).join(", ")})` +
        `)`;
    }
    default:
      throw new Error(`${label}: Kotlin adapter has no mapping for token type ${token.type}`);
  }
}

function primitiveTokens(palette) {
  return Object.fromEntries(
    Object.entries(palette.tokens)
      .filter(([path]) => !path.startsWith("semantic."))
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function semanticTokens(palette) {
  return Object.fromEntries(
    Object.entries(palette.tokens)
      .filter(([path]) => path.startsWith("semantic."))
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function assertPrimitiveParity(palettes) {
  const reference = JSON.stringify(primitiveTokens(palettes[0]));
  for (const palette of palettes.slice(1)) {
    if (JSON.stringify(primitiveTokens(palette)) !== reference) {
      throw new Error(`Primitive token set differs for palette ${palette.id}`);
    }
  }
}

function mapLiteral(tokens, indent = "        ") {
  const entries = Object.entries(tokens);
  if (entries.length === 0) return "emptyMap()";
  const lines = entries.map(([path, token], index) => {
    const suffix = index === entries.length - 1 ? "" : ",";
    return `${indent}${kotlinString(path)} to ${tokenValue(token, path)}${suffix}`;
  });
  return `mapOf(\n${lines.join("\n")}\n    )`;
}

function generate(ir) {
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) {
    throw new Error("Compiled IR contains no palettes");
  }
  assertPrimitiveParity(ir.palettes);

  const lines = [
    "// Generated from the language-neutral GUI Framework specification.",
    "// Do not edit directly.",
    "",
    "package gui.framework.generated.internal",
    "",
    "sealed interface GuiTokenValue",
    "",
    "data class GuiColorValue(",
    "    val colorSpace: String,",
    "    val components: List<Double>,",
    "    val hex: String?,",
    "    val alpha: Double = 1.0,",
    ") : GuiTokenValue",
    "",
    "data class GuiDimensionValue(val value: Double, val unit: String) : GuiTokenValue",
    "data class GuiShadowValue(",
    "    val color: GuiColorValue,",
    "    val offsetX: GuiDimensionValue,",
    "    val offsetY: GuiDimensionValue,",
    "    val blur: GuiDimensionValue,",
    "    val spread: GuiDimensionValue,",
    "    val inset: Boolean = false,",
    ") : GuiTokenValue",
    "data class GuiDurationValue(val value: Double, val unit: String) : GuiTokenValue",
    "data class GuiNumberValue(val value: Double) : GuiTokenValue",
    "data class GuiCubicBezierValue(val x1: Double, val y1: Double, val x2: Double, val y2: Double) : GuiTokenValue",
    "data class GuiTransitionValue(",
    "    val duration: GuiDurationValue,",
    "    val delay: GuiDurationValue,",
    "    val timingFunction: GuiCubicBezierValue,",
    ") : GuiTokenValue",
    "",
    "object GuiPrimitiveTokens {",
    `    val all: Map<String, GuiTokenValue> = ${mapLiteral(primitiveTokens(ir.palettes[0]))}`,
    "}",
    "",
    "object GuiPaletteTokens {",
    "    private val semanticByPalette: Map<String, Map<String, GuiTokenValue>> = mapOf("
  ];

  ir.palettes.forEach((palette, index) => {
    const suffix = index === ir.palettes.length - 1 ? "" : ",";
    lines.push(`        ${kotlinString(palette.id)} to ${mapLiteral(semanticTokens(palette), "            ")}${suffix}`);
  });

  lines.push(
    "    )",
    "",
    "    fun semantic(paletteId: String): Map<String, GuiTokenValue> =",
    "        semanticByPalette[paletteId] ?: error(\"Unknown GUI palette: $paletteId\")",
    "}",
    ""
  );

  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/compose/GuiTokens.kt"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const source = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), source, "utf8");
console.log(`Generated Kotlin tokens at ${outputPath}`);
