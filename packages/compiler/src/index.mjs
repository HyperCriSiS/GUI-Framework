// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

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
    if (!isObject(child)) throw new Error(`${source}: ${[...path, name].join(".")} must be an object`);
    const tokenPath = [...path, name];

    if (Object.prototype.hasOwnProperty.call(child, "$value")) {
      const key = tokenPath.join(".");
      if (output.has(key)) throw new Error(`Duplicate token path ${key} while loading ${source}`);
      const type = typeof child.$type === "string" ? child.$type : groupType;
      if (!type) throw new Error(`${source}: token ${key} has no type`);
      output.set(key, { path: key, type, value: child.$value, source });
    } else {
      collectTokens(child, source, tokenPath, groupType, output);
    }
  }

  return output;
}

function mergeTokenMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, token] of map) {
      if (merged.has(key)) throw new Error(`Duplicate token path across loaded sources: ${key}`);
      merged.set(key, token);
    }
  }
  return merged;
}

function resolveToken(path, tokens, stack = []) {
  if (stack.includes(path)) {
    throw new Error(`Circular token reference: ${[...stack, path].join(" -> ")}`);
  }

  const token = tokens.get(path);
  if (!token) throw new Error(`Unresolved token reference: ${path}`);

  if (!isTokenReference(token.value)) {
    return {
      type: token.type,
      value: token.value,
      trace: [{ token: path, source: token.source }]
    };
  }

  const targetPath = referencePath(token.value);
  const resolved = resolveToken(targetPath, tokens, [...stack, path]);
  if (resolved.type !== token.type) {
    throw new Error(`Token ${path} declares ${token.type} but resolves to ${resolved.type}`);
  }

  return {
    type: token.type,
    value: resolved.value,
    trace: [{ token: path, source: token.source }, ...resolved.trace]
  };
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
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

  const palettes = [];
  for (const paletteEntry of manifest.palettes) {
    const paletteTokens = collectTokens(await readJson(join(specRoot, paletteEntry.source)), paletteEntry.source);
    const tokenUniverse = mergeTokenMaps(primitives, paletteTokens);

    const compiledComponents = {};
    for (const component of components) {
      const bindings = {};
      for (const [binding, reference] of Object.entries(component.recipe.tokenBindings)) {
        const tokenPath = referencePath(reference);
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
        variants: component.recipe.variants,
        sizes: component.recipe.sizes,
        states: component.recipe.states,
        semantics: component.recipe.semantics,
        capabilities: component.recipe.capabilities,
        tokenBindings: bindings
      };
    }

    palettes.push({
      id: paletteEntry.id,
      name: paletteEntry.name,
      source: paletteEntry.source,
      developmentReference: paletteEntry.developmentReference === true,
      components: compiledComponents
    });
  }

  return stableObject({
    specVersion: manifest.specVersion,
    themes: manifest.themes,
    palettes
  });
}

const outputArgIndex = process.argv.indexOf("--output");
const outputPath = outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : undefined;
if (outputArgIndex >= 0 && !outputPath) throw new Error("--output requires a path");

const result = await compile();
const serialized = `${JSON.stringify(result, null, 2)}\n`;

if (outputPath) {
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), serialized, "utf8");
  console.log(`Compiled neutral specification to ${outputPath}`);
} else {
  process.stdout.write(serialized);
}
