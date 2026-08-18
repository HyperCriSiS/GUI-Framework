// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const expectedInitialThemes = [
  "basic",
  "modern",
  "glass",
  "frosted-glass",
  "spacey",
  "cyberpunk",
];

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const errors = [];

const manifestThemeIds = manifest.themes.map((theme) => theme.id);
if (new Set(manifestThemeIds).size !== manifestThemeIds.length) {
  errors.push("spec/manifest.json: duplicate theme ids are not allowed");
}

if (
  manifestThemeIds.length !== expectedInitialThemes.length ||
  expectedInitialThemes.some((id) => !manifestThemeIds.includes(id))
) {
  errors.push(
    `spec/manifest.json: initial theme set must be exactly ${expectedInitialThemes.join(", ")}`,
  );
}

const paletteIds = new Set(manifest.palettes.map((palette) => palette.id));
const componentEntries = new Map(manifest.components.map((component) => [component.id, component]));
const componentRecipes = new Map();

for (const [id, entry] of componentEntries) {
  const file = join("spec", entry.source);
  componentRecipes.set(id, JSON.parse(await readFile(file, "utf8")));
}

const themeDefinitions = new Map();
for (const entry of manifest.themes) {
  const file = join("spec", entry.source);
  const theme = JSON.parse(await readFile(file, "utf8"));
  themeDefinitions.set(entry.id, theme);

  if (theme.theme !== entry.id) {
    errors.push(`${file}: theme id ${theme.theme} does not match manifest id ${entry.id}`);
  }

  if (theme.recommendedPalette && !paletteIds.has(theme.recommendedPalette)) {
    errors.push(`${file}: unknown recommended palette ${theme.recommendedPalette}`);
  }

  for (const [componentId, visual] of Object.entries(theme.components)) {
    const recipe = componentRecipes.get(componentId);
    if (!recipe) {
      errors.push(`${file}: visual recipe targets unknown component ${componentId}`);
      continue;
    }

    const contract = {
      parts: new Set(recipe.anatomy.map((part) => part.id)),
      variants: new Set(recipe.variants),
      sizes: new Set(recipe.sizes),
      states: new Set(recipe.states),
      fallbackOrder: new Set(recipe.capabilities?.fallbackOrder ?? []),
      capabilities: new Set([
        ...(recipe.capabilities?.required ?? []),
        ...(recipe.capabilities?.optional ?? []),
      ]),
    };

    validateVisualRecipe(file, componentId, visual, contract, true);
  }
}

for (const [id, theme] of themeDefinitions) {
  if (theme.extends && !themeDefinitions.has(theme.extends)) {
    errors.push(`theme ${id}: extends unknown theme ${theme.extends}`);
  }
}

for (const id of themeDefinitions.keys()) {
  const path = [];
  const seen = new Set();
  let current = id;
  while (current) {
    if (seen.has(current)) {
      path.push(current);
      errors.push(`theme ${id}: inheritance cycle detected (${path.join(" -> ")})`);
      break;
    }
    seen.add(current);
    path.push(current);
    current = themeDefinitions.get(current)?.extends;
  }
}

function validatePartMap(file, componentId, label, partMap, parts) {
  for (const partId of Object.keys(partMap ?? {})) {
    if (!parts.has(partId)) {
      errors.push(`${file}: ${componentId}.${label} targets unknown anatomy part ${partId}`);
    }
  }
}

function validateRecipeBody(file, componentId, visual, contract) {
  validatePartMap(file, componentId, "base", visual.base, contract.parts);

  for (const [sizeId, partMap] of Object.entries(visual.sizes ?? {})) {
    if (!contract.sizes.has(sizeId)) {
      errors.push(`${file}: ${componentId} uses undeclared size ${sizeId}`);
    }
    validatePartMap(file, componentId, `sizes.${sizeId}`, partMap, contract.parts);
  }

  for (const [stateId, partMap] of Object.entries(visual.states ?? {})) {
    if (!contract.states.has(stateId)) {
      errors.push(`${file}: ${componentId} uses undeclared state ${stateId}`);
    }
    validatePartMap(file, componentId, `states.${stateId}`, partMap, contract.parts);
  }

  for (const [variantId, variant] of Object.entries(visual.variants ?? {})) {
    if (!contract.variants.has(variantId)) {
      errors.push(`${file}: ${componentId} uses undeclared variant ${variantId}`);
    }
    validateRecipeBody(file, componentId, variant, contract);
  }
}

function validateVisualRecipe(file, componentId, visual, contract, allowFallbacks) {
  validateRecipeBody(file, componentId, visual, contract);

  if (!allowFallbacks) return;

  for (const [fallbackId, fallback] of Object.entries(visual.fallbacks ?? {})) {
    if (!contract.fallbackOrder.has(fallbackId)) {
      errors.push(
        `${file}: ${componentId} fallback ${fallbackId} is not declared in component capability fallbackOrder`,
      );
    }

    for (const capability of fallback.requires ?? []) {
      if (!contract.capabilities.has(capability)) {
        errors.push(
          `${file}: ${componentId} fallback ${fallbackId} requires undeclared capability ${capability}`,
        );
      }
    }

    validateVisualRecipe(file, componentId, fallback.recipe, contract, false);
  }
}

if (errors.length > 0) {
  console.error("Theme contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Theme sources, capability fallbacks and visual recipe references are internally consistent.");
