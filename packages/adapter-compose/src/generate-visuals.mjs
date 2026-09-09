// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from "node:crypto";
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
  for (const property of ["blur", "glow"]) {
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
    `backdropBlur = ${optional(style.backdropBlur, dimensionExpr, `${label}.backdropBlur`)}, ` +
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

function stringListExpr(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label}: expected string list`);
  if (values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error(`${label}: expected non-empty string values`);
  }
  return values.length === 0 ? "emptyList()" : `listOf(${values.map(kotlinString).join(", ")})`;
}

function compareKeys(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalString(value) {
  if (typeof value !== "string") throw new Error("Visual parity canonicalization expected a string");
  return `${value.length}:${value}`;
}

function canonicalOptionalString(value) {
  return value === undefined || value === null ? "~" : canonicalString(value);
}

function canonicalDouble(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}: visual parity canonicalization expected a finite number`);
  }
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  return view.getBigUint64(0, false).toString(16).padStart(16, "0");
}

function canonicalColor(token, label) {
  if (token?.type !== "color" || !token.value) throw new Error(`${label}: expected color token`);
  const value = token.value;
  return `C(${canonicalString(value.colorSpace)};[${value.components
    .map((entry, index) => canonicalDouble(entry, `${label}.components[${index}]`))
    .join(",")}];${canonicalOptionalString(value.hex)};${canonicalDouble(value.alpha ?? 1, `${label}.alpha`)})`;
}

function canonicalDimension(token, label) {
  if (token?.type !== "dimension" || !token.value) throw new Error(`${label}: expected dimension token`);
  return `D(${canonicalDouble(token.value.value, `${label}.value`)};${canonicalString(token.value.unit)})`;
}

function canonicalNumber(token, label) {
  if (token?.type !== "number") throw new Error(`${label}: expected number token`);
  return `N(${canonicalDouble(token.value, label)})`;
}

function canonicalShadow(token, label) {
  if (token?.type !== "shadow" || !token.value) throw new Error(`${label}: expected shadow token`);
  const value = token.value;
  return `S(${canonicalColor({ type: "color", value: value.color }, `${label}.color`)};${canonicalDimension(
    { type: "dimension", value: value.offsetX },
    `${label}.offsetX`,
  )};${canonicalDimension({ type: "dimension", value: value.offsetY }, `${label}.offsetY`)};${canonicalDimension(
    { type: "dimension", value: value.blur },
    `${label}.blur`,
  )};${canonicalDimension({ type: "dimension", value: value.spread }, `${label}.spread`)};${value.inset === true ? "1" : "0"})`;
}

function canonicalDuration(value, label) {
  if (!value || typeof value !== "object") throw new Error(`${label}: expected duration`);
  return `U(${canonicalDouble(value.value, `${label}.value`)};${canonicalString(value.unit)})`;
}

function canonicalTransition(token, label) {
  if (token?.type !== "transition" || !token.value) throw new Error(`${label}: expected transition token`);
  const value = token.value;
  return `T(${canonicalDuration(value.duration, `${label}.duration`)};${canonicalDuration(
    value.delay,
    `${label}.delay`,
  )};B(${value.timingFunction
    .map((entry, index) => canonicalDouble(entry, `${label}.timingFunction[${index}]`))
    .join(",")}))`;
}

function canonicalOptional(value, mapper, label) {
  return value === undefined || value === null ? "~" : mapper(value, label);
}

function canonicalBorder(border, label) {
  return `R(${canonicalColor(border.color, `${label}.color`)};${canonicalDimension(border.width, `${label}.width`)})`;
}

function canonicalOutline(outline, label) {
  return `O(${canonicalColor(outline.color, `${label}.color`)};${canonicalDimension(
    outline.width,
    `${label}.width`,
  )};${canonicalDimension(outline.offset, `${label}.offset`)})`;
}

function canonicalStyle(style, label) {
  return `P(${[
    canonicalOptional(style.fill, canonicalColor, `${label}.fill`),
    canonicalOptional(style.foreground, canonicalColor, `${label}.foreground`),
    canonicalOptional(style.opacity, canonicalNumber, `${label}.opacity`),
    canonicalOptional(style.radius, canonicalDimension, `${label}.radius`),
    canonicalOptional(style.paddingHorizontal, canonicalDimension, `${label}.paddingHorizontal`),
    canonicalOptional(style.paddingVertical, canonicalDimension, `${label}.paddingVertical`),
    canonicalOptional(style.gap, canonicalDimension, `${label}.gap`),
    canonicalOptional(style.minWidth, canonicalDimension, `${label}.minWidth`),
    canonicalOptional(style.minHeight, canonicalDimension, `${label}.minHeight`),
    canonicalOptional(style.fontSize, canonicalDimension, `${label}.fontSize`),
    canonicalOptional(style.fontWeight, canonicalNumber, `${label}.fontWeight`),
    canonicalOptional(style.lineHeight, canonicalNumber, `${label}.lineHeight`),
    canonicalOptional(style.border, canonicalBorder, `${label}.border`),
    canonicalOptional(style.outline, canonicalOutline, `${label}.outline`),
    canonicalOptional(style.shadow, canonicalShadow, `${label}.shadow`),
    canonicalOptional(style.backdropBlur, canonicalDimension, `${label}.backdropBlur`),
    canonicalOptional(style.transition, canonicalTransition, `${label}.transition`),
  ].join(";")})`;
}

function canonicalMap(entries, mapper, label) {
  return `{${Object.entries(entries ?? {})
    .sort(([left], [right]) => compareKeys(left, right))
    .map(([key, value]) => `${canonicalString(key)}=${mapper(value, `${label}.${key}`)}`)
    .join(",")}}`;
}

function canonicalPartMap(entries, label) {
  return canonicalMap(entries, canonicalStyle, label);
}

function canonicalPartMapGroups(entries, label) {
  return canonicalMap(entries, canonicalPartMap, label);
}

function canonicalScopedRecipe(scoped, label) {
  return `W(${canonicalPartMap(scoped?.base, `${label}.base`)};${canonicalPartMapGroups(
    scoped?.sizes,
    `${label}.sizes`,
  )};${canonicalPartMapGroups(scoped?.states, `${label}.states`)})`;
}

function canonicalRecipe(recipe, label) {
  return `V(${canonicalPartMap(recipe?.base, `${label}.base`)};${canonicalPartMapGroups(
    recipe?.sizes,
    `${label}.sizes`,
  )};${canonicalPartMapGroups(recipe?.states, `${label}.states`)};${canonicalMap(
    recipe?.variants,
    canonicalScopedRecipe,
    `${label}.variants`,
  )})`;
}

function overlayStyle(base = {}, override = {}) {
  return { ...base, ...override };
}

function mergePartMapsForParity(base = {}, override = {}) {
  const output = { ...base };
  for (const [partId, style] of Object.entries(override)) {
    output[partId] = output[partId] ? overlayStyle(output[partId], style) : style;
  }
  return output;
}

function mergePartMapGroupsForParity(base = {}, override = {}) {
  const output = { ...base };
  for (const [id, partMap] of Object.entries(override)) {
    output[id] = mergePartMapsForParity(output[id] ?? {}, partMap);
  }
  return output;
}

function overlayScopedRecipeForParity(base = {}, override = {}) {
  return {
    base: mergePartMapsForParity(base.base ?? {}, override.base ?? {}),
    sizes: mergePartMapGroupsForParity(base.sizes ?? {}, override.sizes ?? {}),
    states: mergePartMapGroupsForParity(base.states ?? {}, override.states ?? {}),
  };
}

function mergeScopedRecipesForParity(base = {}, override = {}) {
  const output = { ...base };
  for (const [id, scoped] of Object.entries(override)) {
    output[id] = output[id] ? overlayScopedRecipeForParity(output[id], scoped) : scoped;
  }
  return output;
}

function overlayRecipeForParity(base, override) {
  return {
    base: mergePartMapsForParity(base?.base ?? {}, override?.base ?? {}),
    sizes: mergePartMapGroupsForParity(base?.sizes ?? {}, override?.sizes ?? {}),
    states: mergePartMapGroupsForParity(base?.states ?? {}, override?.states ?? {}),
    variants: mergeScopedRecipesForParity(base?.variants ?? {}, override?.variants ?? {}),
    fallbacks: {},
  };
}

function resolveComposeRecipeForParity(component, recipe, label) {
  const capabilities = component?.capabilities ?? { required: [], fallbackOrder: [] };
  const available = new Set();
  const missingRequired = (capabilities.required ?? []).filter((capability) => !available.has(capability));
  if (missingRequired.length > 0) {
    throw new Error(`${label}: Compose cannot satisfy required capabilities ${missingRequired.join(", ")}`);
  }

  let fallbackId = null;
  let fallback = null;
  for (const candidate of capabilities.fallbackOrder ?? []) {
    const current = recipe?.fallbacks?.[candidate];
    if (!current) continue;
    if ((current.requires ?? []).every((capability) => available.has(capability))) {
      fallbackId = candidate;
      fallback = current;
      break;
    }
  }

  return {
    fallbackId,
    recipe: fallback ? overlayRecipeForParity(recipe, fallback.recipe) : recipe,
  };
}

function composeThemeFingerprint(palette, themeId) {
  const theme = palette.themes?.[themeId];
  if (!theme?.components || Object.keys(theme.components).length === 0) {
    throw new Error(`${palette.id}.${themeId}: expected compiled visual components`);
  }
  const entries = Object.entries(theme.components)
    .sort(([left], [right]) => compareKeys(left, right))
    .map(([componentId, recipe]) => {
      const component = palette.components?.[componentId];
      if (!component) throw new Error(`${palette.id}.${themeId}.${componentId}: missing component contract`);
      const effective = resolveComposeRecipeForParity(component, recipe, `${palette.id}.${themeId}.${componentId}`);
      return `E(${canonicalString(componentId)};${canonicalOptionalString(effective.fallbackId)};${canonicalRecipe(
        effective.recipe,
        `${palette.id}.${themeId}.${componentId}`,
      )})`;
    });
  const payload = `Q(${canonicalString(palette.id)};${canonicalString(themeId)};[${entries.join(",")}])`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function composeParityBaselines(ir) {
  return Object.fromEntries(
    [...ir.palettes]
      .sort((left, right) => compareKeys(left.id, right.id))
      .map((palette) => [
        palette.id,
        Object.fromEntries(
          Object.keys(palette.themes ?? {})
            .sort(compareKeys)
            .map((themeId) => [themeId, composeThemeFingerprint(palette, themeId)]),
        ),
      ]),
  );
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
    "    val backdropBlur: GuiDimensionValue? = null,",
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
  ];

  const paletteFunctions = [];
  ir.palettes.forEach((palette, paletteIndex) => {
    const themeEntries = Object.entries(palette.themes ?? {})
      .map(([themeId, theme]) => [themeId, theme.components ?? {}])
      .filter(([, components]) => Object.keys(components).length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
    const paletteFunction = `palette${paletteIndex}`;
    const themeFunctions = [];

    themeEntries.forEach(([themeId, components], themeIndex) => {
      const themeFunction = `${paletteFunction}Theme${themeIndex}`;
      themeFunctions.push([themeId, themeFunction]);
      lines.push(`    private fun ${themeFunction}(): Map<String, GuiVisualRecipe> = mapOf(`);
      const componentEntries = Object.entries(components).sort(([a], [b]) => a.localeCompare(b));
      componentEntries.forEach(([componentId, recipe], componentIndex) => {
        const componentSuffix = componentIndex === componentEntries.length - 1 ? "" : ",";
        lines.push(`        ${kotlinString(componentId)} to ${recipeExpr(recipe, `${palette.id}.${themeId}.${componentId}`)}${componentSuffix}`);
      });
      lines.push("    )", "");
    });

    if (themeFunctions.length === 0) {
      lines.push(`    private fun ${paletteFunction}(): Map<String, Map<String, GuiVisualRecipe>> = emptyMap()`, "");
    } else {
      lines.push(`    private fun ${paletteFunction}(): Map<String, Map<String, GuiVisualRecipe>> = mapOf(`);
      themeFunctions.forEach(([themeId, themeFunction], themeIndex) => {
        const themeSuffix = themeIndex === themeFunctions.length - 1 ? "" : ",";
        lines.push(`        ${kotlinString(themeId)} to ${themeFunction}()${themeSuffix}`);
      });
      lines.push("    )", "");
    }
    paletteFunctions.push([palette.id, paletteFunction]);
  });

  lines.push("    private val byPalette: Map<String, Map<String, Map<String, GuiVisualRecipe>>> = mapOf(");
  paletteFunctions.forEach(([paletteId, paletteFunction], paletteIndex) => {
    const paletteSuffix = paletteIndex === paletteFunctions.length - 1 ? "" : ",";
    lines.push(`        ${kotlinString(paletteId)} to ${paletteFunction}()${paletteSuffix}`);
  });

  lines.push(
    "    )",
    "",
    "    fun component(paletteId: String, themeId: String, componentId: String): GuiVisualRecipe? =",
    "        byPalette[paletteId]?.get(themeId)?.get(componentId)",
    "",
    "    internal fun theme(paletteId: String, themeId: String): Map<String, GuiVisualRecipe>? =",
    "        byPalette[paletteId]?.get(themeId)",
    "}",
    "",
  );

  const componentContracts = Object.entries(ir.palettes[0]?.components ?? {}).sort(([left], [right]) =>
    compareKeys(left, right),
  );
  if (componentContracts.length === 0) throw new Error("Compiled IR contains no component capability metadata");
  lines.push(
    "internal object GuiComposeVisualParityMetadata {",
    "    private val capabilitiesByComponent: Map<String, GuiComponentCapabilities> = mapOf(",
  );
  componentContracts.forEach(([componentId, component], index) => {
    const capabilities = component.capabilities ?? { required: [], optional: [], fallbackOrder: [] };
    const suffix = index === componentContracts.length - 1 ? "" : ",";
    lines.push(
      `        ${kotlinString(componentId)} to GuiComponentCapabilities(` +
        `required = ${stringListExpr(capabilities.required ?? [], `${componentId}.required`)}, ` +
        `optional = ${stringListExpr(capabilities.optional ?? [], `${componentId}.optional`)}, ` +
        `fallbackOrder = ${stringListExpr(capabilities.fallbackOrder ?? [], `${componentId}.fallbackOrder`)})${suffix}`,
    );
  });
  lines.push(
    "    )",
    "",
    "    fun capabilities(componentId: String): GuiComponentCapabilities =",
    "        capabilitiesByComponent[componentId] ?: error(\"Unknown GUI component capability metadata: $componentId\")",
    "}",
    "",
  );

  const baselines = composeParityBaselines(ir);
  const paletteBaselines = Object.entries(baselines).sort(([left], [right]) => compareKeys(left, right));
  lines.push(
    "internal object GuiComposeVisualParityBaseline {",
    "    private val byPalette: Map<String, Map<String, String>> = mapOf(",
  );
  paletteBaselines.forEach(([paletteId, themeBaselines], paletteIndex) => {
    const paletteSuffix = paletteIndex === paletteBaselines.length - 1 ? "" : ",";
    const themeEntries = Object.entries(themeBaselines).sort(([left], [right]) => compareKeys(left, right));
    lines.push(`        ${kotlinString(paletteId)} to mapOf(`);
    themeEntries.forEach(([themeId, fingerprint], themeIndex) => {
      const themeSuffix = themeIndex === themeEntries.length - 1 ? "" : ",";
      lines.push(`            ${kotlinString(themeId)} to ${kotlinString(fingerprint)}${themeSuffix}`);
    });
    lines.push(`        )${paletteSuffix}`);
  });
  lines.push(
    "    )",
    "",
    "    fun fingerprint(paletteId: String, themeId: String): String? =",
    "        byPalette[paletteId]?.get(themeId)",
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
