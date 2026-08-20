// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { resolveThemeDefinitions } from "./theme-resolution.mjs";
import { validatePaletteRegistry } from "./palette-model.mjs";
import {
  compileVisualRecipe,
  mergeCompiledVisualRecipes,
} from "./visual-resolution.mjs";

const specRoot = resolve("spec");
const manifestPath = join(specRoot, "manifest.json");

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
  const baseTheme = theme.extends ? themeEntriesById.get(theme.extends) : null;
  const componentIds = new Set([
    ...Object.keys(baseTheme?.definition?.components ?? {}),
    ...Object.keys(theme.components ?? {}),
  ]);
  const components = {};

  for (const componentId of componentIds) {
    const parentVisual = baseTheme?.definition?.components?.[componentId]
      ? compileVisualRecipe(baseTheme.definition.components[componentId], tokenUniverse)
      : null;
    const ownVisual = theme.components?.[componentId]
      ? compileVisualRecipe(theme.components[componentId], tokenUniverse)
      : null;
    components[componentId] = mergeCompiledVisualRecipes(parentVisual, ownVisual);
  }

  return {
    id: theme.id,
    extends: theme.extends ?? null,
    recommendedPalette: theme.recommendedPalette ?? null,
    components,
  };
}

async function compile() {
  const manifest = await readJson(manifestPath);

  const primitiveMaps = [];
  for (const source of manifest.tokenSources) {
    const path = join(specRoot, source.source);
    primitiveMaps.push(collectTokens(await readJson(path), source.source));
  }
  const primitives = mergeTokenMaps(...primitiveMaps);

  const components = [];
  for (const componentEntry of manifest.components) {
    const recipe = await readJson(join(specRoot, componentEntry.source));
    components.push({ id: componentEntry.id, source: componentEntry.source, recipe });
  }

  const themeEntries = [];
  for (const themeEntry of manifest.themes) {
    const definition = await readJson(join(specRoot, themeEntry.source));
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
    const paletteTokens = collectTokens(await readJson(join(specRoot, paletteEntry.source)), paletteEntry.source);
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

const outputArgIndex = process.argv.indexOf("--output");
const outputPath = resolve(outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : "build/spec-ir.json");
const ir = await compile();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(ir, null, 2)}\n`, "utf8");
console.log(`Compiled GUI Framework specification ${ir.specVersion} to ${outputPath}`);
