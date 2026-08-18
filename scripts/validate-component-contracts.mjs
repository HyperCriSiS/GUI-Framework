// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const errors = [];

function duplicateIds(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id);
    seen.add(item.id);
  }
  return [...duplicates];
}

function defaultMatchesType(property) {
  if (!Object.prototype.hasOwnProperty.call(property, "default")) return true;
  if (property.type === "boolean") return typeof property.default === "boolean";
  if (property.type === "string") return typeof property.default === "string";
  if (property.type === "number") return typeof property.default === "number";
  return false;
}

for (const entry of (await readdir("spec/components")).filter((name) => name.endsWith(".recipe.json")).sort()) {
  const file = join("spec/components", entry);
  const recipe = JSON.parse(await readFile(file, "utf8"));

  for (const [name, items] of [["anatomy", recipe.anatomy], ["content", recipe.content], ["properties", recipe.properties], ["events", recipe.events]]) {
    for (const id of duplicateIds(items)) errors.push(`${file}: duplicate ${name} id ${id}`);
  }

  const anatomy = new Map(recipe.anatomy.map((part) => [part.id, part]));
  const states = new Set(recipe.states);

  for (const slot of recipe.content) {
    const part = anatomy.get(slot.id);
    if (!part) {
      errors.push(`${file}: content slot ${slot.id} does not exist in anatomy`);
      continue;
    }
    if (slot.required && !part.required) {
      errors.push(`${file}: required content slot ${slot.id} must also be a required anatomy part`);
    }
  }

  for (const property of recipe.properties) {
    if (!defaultMatchesType(property)) {
      errors.push(`${file}: default for property ${property.id} does not match declared type ${property.type}`);
    }
    if (property.state && !states.has(property.state)) {
      errors.push(`${file}: property ${property.id} maps to undeclared state ${property.state}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Component runtime contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Component content/property/event contracts are internally consistent.");
