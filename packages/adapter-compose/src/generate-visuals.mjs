// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

function kotlinString(value) {
  return JSON.stringify(value);
}

function kotlinDouble(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}: expected finite number`);
  }
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

function colorExpr(token, label) {
  if (token.type !== "color" || !token.value || typeof token.value !== "object") {
    throw new Error(`${label}: expected compiled color`);
  }
  const value = token.value;
  if (!Array.isArray(value.components) || value.components.length !== 3) {
    throw new Error(`${label}: expected three color components`);
  }
  if (value.alpha !== undefined && (typeof value.alpha !== "number" || !Number.isFinite(value.alpha) || value.alpha < 0 || value.alpha > 1)) {
    throw new Error(`${label}: expected alpha in the range 0..1`);
  }
  const components = value.components.map((entry, index) => kotlinDouble(entry, `${label}.components[${index}]`)).join(", ");
  const alpha = value.alpha === undefined ? "" : `, ${kotlinDouble(value.alpha, `${label}.alpha`)}`;
  return `GuiColorValue(${kotlinString(value.colorSpace)}, listOf(${components}), ${typeof value.hex === "string" ? kotlinString(value.hex) : "null"}${alpha})`;
}

function dimensionExpr(token, label) {
  if (token.type !== "dimension" || !token.value || typeof token.value !== "object") {
    throw new Error(`${label}: expected compiled dimension`);
  }
  return `GuiDimensionValue(${kotlinDouble(token.value.value, `${label}.value`)}, ${kotlinString(token.value.unit)})`;
}

function shadowExpr(token, label) {
  if (token.type !== "shadow" || !token.value || typeof token.value !== "object") {
    throw new Error(`${label}: expected compiled shadow`);
  }
  const value = token.value;
  return `GuiShadowValue(` +
    `color = ${colorExpr({ type: "color", value: value.color }, `${label}.color`)}, ` +
    `offsetX = ${dimensionExpr({ type: "dimension", value: value.offsetX }, `${label}.offsetX`)}, ` +
    `offsetY = ${dimensionExpr({ type: "dimension", value: value.offsetY }, `${label}.offsetY`)}, ` +
    `blur = ${dimensionExpr({ type: "dimension", value: value.blur }, `${label}.blur`)}, ` +
    `spread = ${dimensionExpr({ type: "dimension", value: value.spread }, `${label}.spread`)}, ` +
    `inset = ${value.inset === true ? "true" : "false"}` +
    `)`;
}

function numberExpr(token, label) {
  if (token.type !== "number") throw new Error(`${label}: expected compiled number`);
  return `GuiNumberValue(${kotlinDouble(token.value, label)})`;
}

function durationExpr(value, label) {
  if (!value || typeof value !== "object") throw new Error(`${label}: expected duration value`);
  return `GuiDurationValue(${kotlinDouble(value.value, `${label}.value`)}, ${kotlinString(value.unit)})`;
}

function transitionExpr(token, label) {
  if (token.type !== "transition" || !token.value || typeof token.value !== "object") {
    throw new Error(`${label}: expected compiled transition`);
  }
  const timing = token.value.timingFunction;
  if (!Array.isArray(timing) || timing.length !== 4) throw new Error(`${label}: invalid timingFunction`);
  return `GuiTransitionValue(duration = ${durationExpr(token.value.duration, `${label}.duration`)}, delay = ${durationExpr(token.value.delay, `${label}.delay`)}, timingFunction = GuiCubicBezierValue(${timing.map((entry, index) => kotlinDouble(entry, `${label}.timingFunction[${index}]`)).join(", ")}))`;
}

function optional(value, mapper, label) {
  return value === undefined ? "null" : mapper(value, label);
}

function styleExpr(style, label) {
  for (const property of ["blur", "backdropBlur", "glow"]) {
    if (style[property] !== undefined) {
      throw new Error(`${label}: Compose reference adapter does not yet map ${property}`);
    }
  }

  const border = style.border === undefined
    ? "null"
    : `GuiVisualBorder(color = ${colorExpr(style.border.color, `${label}.border.color`)}, width = ${dimensionExpr(style.border.width, `${label}.border.width`)})`;
  const outline = style.outline === undefined
    ? "null"
    : `GuiVisualOutline(color = ${colorExpr(style.outline.color, `${label}.outline.color`)}, width = ${dimensionExpr(style.outline.width, `${label}.outline.width`)}, offset = ${dimensionExpr(style.outline.offset, `${label}.outline.offset`)})`;

  return `GuiVisualPartStyle(` +
    `fill = ${optional(style.fill, colorExpr, `${label}.fill`)}, ` +
    `foreground = ${optional(style.foreground, colorExpr, `${label}.foreground`)}, ` +
    `opacity = ${optional(style.opacity, numberExpr, `${label}.opacity`)}, ` +
    `radius = ${optional(style.radius, dimensionExpr, `${label}.radius`)}, ` +
    `paddingHorizontal = ${optional(style.paddingHorizontal, dimensionExpr, `${label}.paddingHorizontal`)}, ` +
    `paddingVertical = ${optional(style.paddingVertical, dimensionExpr, `${label}.paddingVertical`)}, ` +
    `gap = ${optional(style.gap, dimensionExpr, `${label}.gap`)}, ` +
    `minWidth = ${optional(style.minWidth, dimensionExpr, `${label}.minWidth`)}, ` +
    `minHeight = ${optional(style.minHeight, dimensionExpr, `${label}.minHeight`)}, ` +
    `fontSize = ${optional(style.fontSize, dimensionExpr, `${label}.fontSize`)}, ` +
    `fontWeight = ${optional(style.fontWeight, numberExpr, `${label}.fontWeight`)}, ` +
    `lineHeight = ${optional(style.lineHeight, numberExpr, `${label}.lineHeight`)}, ` +
    `border = ${border}, outline = ${outline}, ` +
    `shadow = ${optional(style.shadow, shadowExpr, `${label}.shadow`)}, ` +
    `transition = ${optional(style.transition, transitionExpr, `${label}.transition`)}` +
    `)`;
}

function mapExpr(entries, mapper, label) {
  const pairs = Object.entries(entries ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (pairs.length === 0) return "emptyMap()";
  return `mapOf(${pairs.map(([key, value]) => `${kotlinString(key)} to ${mapper(value, `${label}.${key}`)}`).join(", ")})`;
}

function partMapExpr(partMap, label) {
  return mapExpr(partMap, styleExpr, label);
}

function scopedExpr(scoped, label) {
  return `GuiVisualScopedRecipe(` +
    `base = ${partMapExpr(scoped?.base, `${label}.base`)}, ` +
    `sizes = ${mapExpr(scoped?.sizes, partMapExpr, `${label}.sizes`)}, ` +
    `states = ${mapExpr(scoped?.states, partMapExpr, `${label}.states`)}` +
    `)`;
}

function stringSetExpr(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label}: expected capability list`);
  const unique = [...new Set(values)];
  if (unique.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error(`${label}: capability ids must be non-empty strings`);
  }
  if (unique.length !== values.length) throw new Error(`${label}: duplicate capability id`);
  return unique.length === 0 ? "emptySet()" : `setOf(${unique.map(kotlinString).join(", ")})`;
}

function fallbackExpr(fallback, label) {
  if (!fallback || typeof fallback !== "object" || !fallback.recipe || typeof fallback.recipe !== "object") {
    throw new Error(`${label}: expected fallback recipe`);
  }
  if (fallback.recipe.fallbacks && Object.keys(fallback.recipe.fallbacks).length > 0) {
    throw new Error(`${label}: nested capability fallbacks are not supported`);
  }
  return `GuiVisualFallback(` +
    `requires = ${stringSetExpr(fallback.requires ?? [], `${label}.requires`)}, ` +
    `recipe = ${recipeExpr(fallback.recipe, `${label}.recipe`, false)}` +
    `)`;
}

function recipeExpr(recipe, label, includeFallbacks = true) {
  return `GuiVisualRecipe(` +
    `base = ${partMapExpr(recipe?.base, `${label}.base`)}, ` +
    `sizes = ${mapExpr(recipe?.sizes, partMapExpr, `${label}.sizes`)}, ` +
    `states = ${mapExpr(recipe?.states, partMapExpr, `${label}.states`)}, ` +
    `variants = ${mapExpr(recipe?.variants, scopedExpr, `${label}.variants`)}, ` +
    `fallbacks = ${includeFallbacks ? mapExpr(recipe?.fallbacks, fallbackExpr, `${label}.fallbacks`) : "emptyMap()"}` +
    `)`;
}

function generate(ir) {
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) throw new Error("Compiled IR contains no palettes");
  const lines = [
    "// Generated from the language-neutral GUI Framework specification.",
    "// Do not edit directly.",
    "",
    "package gui.framework.generated.internal",
    "",
    "data class GuiVisualBorder(val color: GuiColorValue, val width: GuiDimensionValue)",
    "data class GuiVisualOutline(val color: GuiColorValue, val width: GuiDimensionValue, val offset: GuiDimensionValue)",
    "data class GuiVisualPartStyle(",
    "    val fill: GuiColorValue? = null,",
    "    val foreground: GuiColorValue? = null,",
    "    val opacity: GuiNumberValue? = null,",
    "    val radius: GuiDimensionValue? = null,",
    "    val paddingHorizontal: GuiDimensionValue? = null,",
    "    val paddingVertical: GuiDimensionValue? = null,",
    "    val gap: GuiDimensionValue? = null,",
    "    val minWidth: GuiDimensionValue? = null,",
    "    val minHeight: GuiDimensionValue? = null,",
    "    val fontSize: GuiDimensionValue? = null,",
    "    val fontWeight: GuiNumberValue? = null,",
    "    val lineHeight: GuiNumberValue? = null,",
    "    val border: GuiVisualBorder? = null,",
    "    val outline: GuiVisualOutline? = null,",
    "    val shadow: GuiShadowValue? = null,",
    "    val transition: GuiTransitionValue? = null,",
    ")",
    "",
    "data class GuiVisualScopedRecipe(",
    "    val base: Map<String, GuiVisualPartStyle> = emptyMap(),",
    "    val sizes: Map<String, Map<String, GuiVisualPartStyle>> = emptyMap(),",
    "    val states: Map<String, Map<String, GuiVisualPartStyle>> = emptyMap(),",
    ")",
    "",
    "data class GuiVisualFallback(",
    "    val requires: Set<String> = emptySet(),",
    "    val recipe: GuiVisualRecipe,",
    ")",
    "",
    "data class GuiVisualRecipe(",
    "    val base: Map<String, GuiVisualPartStyle> = emptyMap(),",
    "    val sizes: Map<String, Map<String, GuiVisualPartStyle>> = emptyMap(),",
    "    val states: Map<String, Map<String, GuiVisualPartStyle>> = emptyMap(),",
    "    val variants: Map<String, GuiVisualScopedRecipe> = emptyMap(),",
    "    val fallbacks: Map<String, GuiVisualFallback> = emptyMap(),",
    ")",
    "",
    "object GuiVisualRegistry {",
    "    private val byPalette: Map<String, Map<String, Map<String, GuiVisualRecipe>>> = mapOf("
  ];

  ir.palettes.forEach((palette, paletteIndex) => {
    const themeEntries = Object.entries(palette.themes ?? {})
      .map(([themeId, theme]) => [themeId, theme.components ?? {}])
      .filter(([, components]) => Object.keys(components).length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    const paletteSuffix = paletteIndex === ir.palettes.length - 1 ? "" : ",";
    if (themeEntries.length === 0) {
      lines.push(`        ${kotlinString(palette.id)} to emptyMap()${paletteSuffix}`);
      return;
    }
    lines.push(`        ${kotlinString(palette.id)} to mapOf(`);
    themeEntries.forEach(([themeId, components], themeIndex) => {
      const componentEntries = Object.entries(components).sort(([a], [b]) => a.localeCompare(b));
      const themeSuffix = themeIndex === themeEntries.length - 1 ? "" : ",";
      lines.push(`            ${kotlinString(themeId)} to mapOf(`);
      componentEntries.forEach(([componentId, recipe], componentIndex) => {
        const componentSuffix = componentIndex === componentEntries.length - 1 ? "" : ",";
        lines.push(`                ${kotlinString(componentId)} to ${recipeExpr(recipe, `${palette.id}.${themeId}.${componentId}`)}${componentSuffix}`);
      });
      lines.push(`            )${themeSuffix}`);
    });
    lines.push(`        )${paletteSuffix}`);
  });

  lines.push(
    "    )",
    "",
    "    fun component(paletteId: String, themeId: String, componentId: String): GuiVisualRecipe? =",
    "        byPalette[paletteId]?.get(themeId)?.get(componentId)",
    "}",
    "",
  );

  return `${lines.join("\n")}\n`;
}

const [inputPath = "build/spec-ir.json", outputPath = "build/compose/GuiVisuals.kt"] = process.argv.slice(2);
const ir = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const source = generate(ir);
await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), source, "utf8");
console.log(`Generated Kotlin visual recipes at ${outputPath}`);
