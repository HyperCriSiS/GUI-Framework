// SPDX-License-Identifier: AGPL-3.0-or-later

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

/**
 * Deterministic merge used by theme inheritance and visual recipe resolution.
 * Objects merge recursively; arrays and scalar values are replaced by the more
 * specific layer. Replacing arrays avoids accidental accumulation of ordered
 * visual effects such as shadow stacks.
 */
export function deepMerge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return clone(override);

  const output = clone(base);
  for (const [key, value] of Object.entries(override)) {
    output[key] =
      key in output && isPlainObject(output[key]) && isPlainObject(value)
        ? deepMerge(output[key], value)
        : clone(value);
  }
  return output;
}

/**
 * Resolves optional theme inheritance without assigning any inheritance
 * relationship to the six built-in themes. Relationships only exist when a
 * theme source explicitly declares `extends`.
 */
export function resolveThemeDefinitions(entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  if (byId.size !== entries.length) throw new Error("Duplicate theme ids are not allowed");

  const resolved = new Map();
  const resolving = [];

  function resolveOne(id) {
    if (resolved.has(id)) return resolved.get(id);

    const entry = byId.get(id);
    if (!entry) throw new Error(`Unknown theme ${id}`);

    const cycleAt = resolving.indexOf(id);
    if (cycleAt >= 0) {
      throw new Error(
        `Theme inheritance cycle: ${[...resolving.slice(cycleAt), id].join(" -> ")}`,
      );
    }

    resolving.push(id);

    const parentId = entry.definition.extends;
    let inheritedComponents = {};
    let inheritedPalette = null;
    let inheritance = [id];

    if (parentId) {
      if (!byId.has(parentId)) {
        throw new Error(`Theme ${id} extends unknown theme ${parentId}`);
      }
      const parent = resolveOne(parentId);
      inheritedComponents = parent.components;
      inheritedPalette = parent.recommendedPalette;
      inheritance = [...parent.inheritance, id];
    }

    const result = {
      id: entry.id,
      name: entry.name,
      source: entry.source,
      extends: parentId ?? null,
      recommendedPalette: entry.definition.recommendedPalette ?? inheritedPalette,
      inheritance,
      components: deepMerge(inheritedComponents, entry.definition.components ?? {}),
    };

    resolving.pop();
    resolved.set(id, result);
    return result;
  }

  return entries.map((entry) => resolveOne(entry.id));
}

/**
 * Resolves one component visual recipe for a concrete variant, size and set of
 * active states. State precedence comes exclusively from `statePriority`, which
 * is the component contract's ordered `states` list. Call order and object key
 * order therefore cannot change the result.
 *
 * Precedence, from least to most specific:
 * base -> size -> variant -> variant+size -> states in contract order, where a
 * variant-specific state is applied after the component-wide state of the same
 * name.
 */
export function resolveComponentVisualRecipe(
  visual,
  { variant, size, activeStates = [], statePriority = [] } = {},
) {
  const knownStates = new Set(statePriority);
  for (const state of activeStates) {
    if (!knownStates.has(state)) {
      throw new Error(`Active state ${state} has no declared priority`);
    }
  }

  const variantVisual = variant ? visual?.variants?.[variant] : undefined;
  let output = {};

  output = deepMerge(output, visual?.base ?? {});
  if (size) output = deepMerge(output, visual?.sizes?.[size] ?? {});
  output = deepMerge(output, variantVisual?.base ?? {});
  if (size) output = deepMerge(output, variantVisual?.sizes?.[size] ?? {});

  const active = new Set(activeStates);
  for (const state of statePriority) {
    if (state === "default" || !active.has(state)) continue;
    output = deepMerge(output, visual?.states?.[state] ?? {});
    output = deepMerge(output, variantVisual?.states?.[state] ?? {});
  }

  return output;
}
