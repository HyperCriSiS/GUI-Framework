// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { resolveThemeDefinitions } from "./theme-resolution.mjs";
import { validatePaletteRegistry } from "./palette-model.mjs";
import {
  compileVisualRecipe,
  mergeCompiledVisualRecipes,
} from "./visual-resolution.mjs";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTokenReference(value) {
  return typeof value === "string" && /^\{[^{}.]+(?:\.[^{}.]+)*\}$/.test(value);
}

function referencePath(value) {
  return value.slice(1, -1);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function collectTokens(node, source, path = [], inheritedType, output = new Map()) {
  if (!isObject(node)) throw new Error(`${source}: ${path.join(".") || "<root>"} must be an object`);
  const groupType = typeof node.$type === "string" ? node.$type : inheritedType;

  for (const [name, child] of Object.entries(node)) {
    if (name.startsWith("$")) continue;
    const tokenPath = [...path, name];
    if (!isObject(child)) throw new Error(`${source}: ${tokenPath.join(".")} must be an object`);

    if (Object.hasOwn(child, "$value")) {
      const type = child.$type ?? groupType;
      if (!type) throw new Error(`${source}: ${tokenPath.join(".")} has no token type`);
      const key = tokenPath.join(".");
      if (output.has(key)) throw new Error(`${source}: duplicate token ${key}`);
      output.set(key, { source, path: key, type, raw: child.$value });
      continue;
    }

    collectTokens(child, source, tokenPath, child.$type ?? groupType, output);
  }

  return output;
}

function mergeTokenMaps(...maps) {
  const output = new Map();
  for (const map of maps) {
    for (const [key, value] of map) {
      if (output.has(key)) throw new Error(`Token ${key} is defined by both ${output.get(key).source} and ${value.source}`);
      output.set(key, value);
    }
  }
  return output;
}

function resolveCompositeValue(value, tokens, stack, trace) {
  if (isTokenReference(value)) {
    const resolved = resolveToken(referencePath(value), tokens, stack);
    trace.push(...resolved.trace);
    return resolved.value;
  }
  if (Array.isArray(value)) return value.map((entry) => resolveCompositeValue(entry, tokens, stack, trace));
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveCompositeValue(entry, tokens, stack, trace)])
    );
  }
  return value;
}

function resolveToken(path, tokens, stack = []) {
  const token = tokens.get(path);
  if (!token) throw new Error(`Unresolved token reference ${path}`);
  if (stack.includes(path)) throw new Error(`Circular token reference: ${[...stack, path].join(" -> ")}`);

  const nextStack = [...stack, path];
  if (isTokenReference(token.raw)) {
    const target = referencePath(token.raw);
    const resolved = resolveToken(target, tokens, nextStack);
    if (resolved.type !== token.type) {
      throw new Error(`Type mismatch: ${path} (${token.type}) references ${target} (${resolved.type})`);
    }
    return {
      type: token.type,
      value: resolved.value,
      trace: [{ token: path, source: token.source }, ...resolved.trace]
    };
  }

  const compositeTrace = [];
  const value = resolveCompositeValue(token.raw, tokens, nextStack, compositeTrace);
  return {
    type: token.type,
    value,
    trace: [{ token: path, source: token.source }, ...compositeTrace]
  };
}

function compilePublicTokens(tokens) {
  const output = {};
  for (const key of [...tokens.keys()].sort()) {
    if (key.startsWith("palette.")) continue;
    const resolved = resolveToken(key, tokens);
    output[key] = {
      type: resolved.type,
      value: resolved.value,
      trace: resolved.trace
    };
  }
  return output;
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableObject(value[key])])
  );
}

function compileThemeVisuals(theme, themeEntriesById, tokenUniverse) {
  const resolveVisualToken = (path) => resolveToken(path, tokenUniverse);
  const components = {};

  for (const inheritedThemeId of theme.inheritance) {
    const entry = themeEntriesById.get(inheritedThemeId);
    if (!entry) throw new Error(`Resolved theme ${theme.id} references unknown inheritance entry ${inheritedThemeId}`);

    for (const [componentId, visual] of Object.entries(entry.definition.components ?? {})) {
      const compiled = compileVisualRecipe(
        visual,
        resolveVisualToken,
        { theme: entry.id, source: entry.source },
      );
      components[componentId] = components[componentId]
        ? mergeCompiledVisualRecipes(components[componentId], compiled)
        : compiled;
    }
  }

  return {
    id: theme.id,
    extends: theme.extends ?? null,
    recommendedPalette: theme.recommendedPalette ?? null,
    components,
  };
}

export async function compileSpecification({ specRoot = "spec" } = {}) {
  const resolvedSpecRoot = resolve(specRoot);
  const manifestPath = join(resolvedSpecRoot, "manifest.json");
  const manifest = await readJson(manifestPath);

  const primitiveMaps = [];
  for (const source of manifest.tokenSources) {
    const path = join(resolvedSpecRoot, source.source);
    primitiveMaps.push(collectTokens(await readJson(path), source.source));
  }
  const primitives = mergeTokenMaps(...primitiveMaps);

  const components = [];
  for (const componentEntry of manifest.components) {
    const recipe = await readJson(join(resolvedSpecRoot, componentEntry.source));
    components.push({ id: componentEntry.id, source: componentEntry.source, recipe });
  }

  const themeEntries = [];
  for (const themeEntry of manifest.themes) {
    const definition = await readJson(join(resolvedSpecRoot, themeEntry.source));
    themeEntries.push({
      id: themeEntry.id,
      name: themeEntry.name,
      source: themeEntry.source,
      definition
    });
  }
  const themes = resolveThemeDefinitions(themeEntries);
  const themeEntriesById = new Map(themeEntries.map((theme) => [theme.id, theme]));

  validatePaletteRegistry(manifest.palettes);

  const palettes = [];
  for (const paletteEntry of manifest.palettes) {
    const paletteTokens = collectTokens(await readJson(join(resolvedSpecRoot, paletteEntry.source)), paletteEntry.source);
    const tokenUniverse = mergeTokenMaps(primitives, paletteTokens);

    const compiledComponents = {};
    for (const component of components) {
      const bindings = {};
      for (const [binding, reference] of Object.entries(component.recipe.tokenBindings)) {
        const tokenPath = referencePath(reference);
        if (tokenPath.startsWith("palette.")) {
          throw new Error(`${component.source}: component binding ${binding} must use semantic or primitive tokens, not raw palette token ${tokenPath}`);
        }
        const resolved = resolveToken(tokenPath, tokenUniverse);
        bindings[binding] = {
          reference,
          type: resolved.type,
          value: resolved.value,
          trace: resolved.trace
        };
      }
      compiledComponents[component.id] = {
        anatomy: component.recipe.anatomy,
        content: component.recipe.content,
        properties: component.recipe.properties,
        events: component.recipe.events,
        variants: component.recipe.variants,
        sizes: component.recipe.sizes,
        states: component.recipe.states,
        semantics: component.recipe.semantics,
        capabilities: component.recipe.capabilities,
        tokenBindings: bindings
      };
    }

    const compiledThemes = Object.fromEntries(
      themes.map((theme) => [
        theme.id,
        compileThemeVisuals(theme, themeEntriesById, tokenUniverse),
      ]),
    );

    palettes.push({
      id: paletteEntry.id,
      name: paletteEntry.name,
      familyId: paletteEntry.familyId,
      variantId: paletteEntry.variantId,
      source: paletteEntry.source,
      developmentReference: paletteEntry.developmentReference === true,
      tokens: compilePublicTokens(tokenUniverse),
      components: compiledComponents,
      themes: compiledThemes,
    });
  }

  return stableObject({
    specVersion: manifest.specVersion,
    themes,
    palettes
  });
}

export async function compileSpecificationToFile({ specRoot = "spec", outputPath = "build/spec-ir.json" } = {}) {
  const resolvedOutputPath = resolve(outputPath);
  const ir = await compileSpecification({ specRoot });
  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(ir, null, 2)}\n`, "utf8");
  return { ir, outputPath: resolvedOutputPath };
}

function parseLegacyCliArgs(argv) {
  const outputIndex = argv.indexOf("--output");
  if (outputIndex >= 0 && !argv[outputIndex + 1]) {
    throw new Error("--output requires a path");
  }
  const specRootIndex = argv.indexOf("--spec-root");
  if (specRootIndex >= 0 && !argv[specRootIndex + 1]) {
    throw new Error("--spec-root requires a path");
  }
  return {
    outputPath: outputIndex >= 0 ? argv[outputIndex + 1] : "build/spec-ir.json",
    specRoot: specRootIndex >= 0 ? argv[specRootIndex + 1] : "spec",
  };
}

function isDirectExecution() {
  const entry = process.argv[1];
  return typeof entry === "string" && import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectExecution()) {
  const options = parseLegacyCliArgs(process.argv.slice(2));
  const { ir, outputPath } = await compileSpecificationToFile(options);
  console.log(`Compiled GUI Framework specification ${ir.specVersion} to ${outputPath}`);
}
