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

function appendTrace(trace, additions) {
  const seen = new Set(trace.map((entry) => `${entry.token}\u0000${entry.source}`));
  for (const entry of additions) {
    const key = `${entry.token}\u0000${entry.source}`;
    if (!seen.has(key)) {
      trace.push(entry);
      seen.add(key);
    }
  }
}

function resolveNestedValue(value, tokens, stack) {
  if (isTokenReference(value)) {
    const resolved = resolveToken(referencePath(value), tokens, stack);
    return { value: resolved.value, trace: resolved.trace };
  }

  if (Array.isArray(value)) {
    const output = [];
    const trace = [];
    for (const item of value) {
      const resolved = resolveNestedValue(item, tokens, stack);
      output.push(resolved.value);
      appendTrace(trace, resolved.trace);
    }
    return { value: output, trace };
  }

  if (isObject(value)) {
    const output = {};
    const trace = [];
    for (const [key, item] of Object.entries(value)) {
      const resolved = resolveNestedValue(item, tokens, stack);
      output[key] = resolved.value;
      appendTrace(trace, resolved.trace);
    }
    return { value: output, trace };
  }

  return { value, trace: [] };
}

function resolveToken(path, tokens, stack = []) {
  if (stack.includes(path)) {
    throw new Error(`Circular token reference: ${[...stack, path].join(" -> ")}`);
  }

  const token = tokens.get(path);
  if (!token) throw new Error(`Unresolved token reference: ${path}`);

  if (isTokenReference(token.value)) {
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

  const nested = resolveNestedValue(token.value, tokens, [...stack, path]);
  const trace = [{ token: path, source: token.source }];
  appendTrace(trace, nested.trace);

  return {
    type: token.type,
    value: nested.value,
    trace
  };
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function compilePublicTokens(tokenUniverse) {
  const output = {};
  for (const path of [...tokenUniverse.keys()].sort()) {
    if (path.startsWith("palette.")) continue;
    const resolved = resolveToken(path, tokenUniverse);
    output[path] = {
      type: resolved.type,
      value: resolved.value,
      trace: resolved.trace
    };
  }
  return output;
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

    palettes.push({
      id: paletteEntry.id,
      name: paletteEntry.name,
      source: paletteEntry.source,
      developmentReference: paletteEntry.developmentReference === true,
      tokens: compilePublicTokens(tokenUniverse),
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
