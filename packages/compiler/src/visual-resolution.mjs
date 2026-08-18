// SPDX-License-Identifier: AGPL-3.0-or-later

const visualPropertyTypes = Object.freeze({
  fill: "color",
  foreground: "color",
  opacity: "number",
  radius: "dimension",
  paddingHorizontal: "dimension",
  paddingVertical: "dimension",
  gap: "dimension",
  minWidth: "dimension",
  minHeight: "dimension",
  shadow: "shadow",
  blur: "dimension",
  backdropBlur: "dimension",
  glow: "dimension",
  transition: "transition",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

function isTokenReference(value) {
  return typeof value === "string" && /^\{[^{}.]+(?:\.[^{}.]+)*\}$/.test(value);
}

function referencePath(value) {
  return value.slice(1, -1);
}

function compileReference(reference, expectedType, resolveToken, origin) {
  if (!isTokenReference(reference)) {
    throw new Error(`Visual value must be a token reference, received ${JSON.stringify(reference)}`);
  }

  const tokenPath = referencePath(reference);
  if (tokenPath.startsWith("palette.")) {
    throw new Error(
      `Theme visual recipes must not reference raw palette token ${tokenPath}; use semantic or primitive tokens`,
    );
  }

  const resolved = resolveToken(tokenPath);
  if (resolved.type !== expectedType) {
    throw new Error(
      `Visual reference ${reference} requires ${expectedType} but resolves to ${resolved.type}`,
    );
  }

  return {
    reference,
    type: resolved.type,
    value: clone(resolved.value),
    trace: clone(resolved.trace ?? []),
    themeTrace: [
      {
        theme: origin.theme,
        source: origin.source,
      },
    ],
  };
}

function compilePartStyle(style, resolveToken, origin) {
  const output = {};

  for (const [property, value] of Object.entries(style)) {
    if (property === "border") {
      output.border = {
        color: compileReference(value.color, "color", resolveToken, origin),
        width: compileReference(value.width, "dimension", resolveToken, origin),
      };
      continue;
    }

    const expectedType = visualPropertyTypes[property];
    if (!expectedType) throw new Error(`Unsupported visual property ${property}`);
    output[property] = compileReference(value, expectedType, resolveToken, origin);
  }

  return output;
}

function compilePartMap(partMap, resolveToken, origin) {
  return Object.fromEntries(
    Object.entries(partMap ?? {}).map(([partId, style]) => [
      partId,
      compilePartStyle(style, resolveToken, origin),
    ]),
  );
}

function compileStateMap(stateMap, resolveToken, origin) {
  return Object.fromEntries(
    Object.entries(stateMap ?? {}).map(([stateId, partMap]) => [
      stateId,
      compilePartMap(partMap, resolveToken, origin),
    ]),
  );
}

function compileScopedVisualRecipe(visual, resolveToken, origin, allowVariants) {
  const output = {};

  if (visual.base) output.base = compilePartMap(visual.base, resolveToken, origin);
  if (visual.sizes) {
    output.sizes = Object.fromEntries(
      Object.entries(visual.sizes).map(([sizeId, partMap]) => [
        sizeId,
        compilePartMap(partMap, resolveToken, origin),
      ]),
    );
  }
  if (visual.states) output.states = compileStateMap(visual.states, resolveToken, origin);

  if (allowVariants && visual.variants) {
    output.variants = Object.fromEntries(
      Object.entries(visual.variants).map(([variantId, variant]) => [
        variantId,
        compileScopedVisualRecipe(variant, resolveToken, origin, false),
      ]),
    );
  }

  return output;
}

/**
 * Converts a neutral theme visual recipe from token references into adapter-ready
 * typed values while retaining both token provenance and the theme source that
 * supplied each visual field.
 */
export function compileVisualRecipe(visual, resolveToken, origin) {
  if (!origin?.theme || !origin?.source) {
    throw new Error("Visual recipe compilation requires theme and source provenance");
  }
  return compileScopedVisualRecipe(visual, resolveToken, origin, true);
}

function isCompiledVisualValue(value) {
  return (
    isPlainObject(value) &&
    typeof value.reference === "string" &&
    typeof value.type === "string" &&
    Object.prototype.hasOwnProperty.call(value, "value")
  );
}

/**
 * Merges separately compiled inheritance layers. Compiled token values are
 * atomic: a child token reference replaces the complete parent value/provenance
 * object, while surrounding part/style objects continue to merge recursively.
 */
export function mergeCompiledVisualRecipes(base, override) {
  if (isCompiledVisualValue(override)) return clone(override);
  if (!isPlainObject(base) || !isPlainObject(override)) return clone(override);

  const output = clone(base);
  for (const [key, value] of Object.entries(override)) {
    output[key] =
      key in output && isPlainObject(output[key]) && isPlainObject(value)
        ? mergeCompiledVisualRecipes(output[key], value)
        : clone(value);
  }
  return output;
}
