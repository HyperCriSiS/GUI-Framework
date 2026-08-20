// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const manifest = JSON.parse(await readFile("spec/manifest.json", "utf8"));
const assets = manifest.assets ?? [];
const errors = [];
const ids = new Set();

function numbers(value) {
  return value.trim().split(/[\s,]+/).map(Number);
}

function attr(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

for (const asset of assets) {
  if (ids.has(asset.id)) errors.push(`spec/manifest.json: duplicate asset id ${asset.id}`);
  ids.add(asset.id);

  const normalized = normalize(asset.source);
  if (normalized.startsWith(`..${sep}`) || normalized === "..") {
    errors.push(`asset ${asset.id}: source must stay inside spec/: ${asset.source}`);
    continue;
  }

  let source;
  try {
    source = await readFile(join("spec", asset.source), "utf8");
  } catch (error) {
    errors.push(`asset ${asset.id}: cannot read ${asset.source}: ${error.message}`);
    continue;
  }

  if (asset.kind !== "svg") continue;
  if (extname(asset.source).toLowerCase() !== ".svg") errors.push(`asset ${asset.id}: SVG source must use .svg`);
  if (!/^\s*<svg\b/i.test(source)) errors.push(`asset ${asset.id}: source is not an SVG document`);
  if (/<script\b/i.test(source) || /\son[a-z]+\s*=/i.test(source)) errors.push(`asset ${asset.id}: scripts and event handlers are forbidden`);
  if (/\b(?:href|xlink:href)\s*=\s*["'](?:https?:|data:|\/\/)/i.test(source)) errors.push(`asset ${asset.id}: external or embedded href references are forbidden`);

  const fileViewBox = attr(source, "viewBox");
  if (!fileViewBox) {
    errors.push(`asset ${asset.id}: SVG must declare viewBox`);
  } else if (JSON.stringify(numbers(fileViewBox)) !== JSON.stringify(asset.viewBox)) {
    errors.push(`asset ${asset.id}: manifest viewBox does not match SVG viewBox`);
  }

  if (asset.portableProfile === "path") {
    const elementNames = [...source.matchAll(/<\/?([A-Za-z][A-Za-z0-9:-]*)\b/g)]
      .map((match) => match[1].toLowerCase())
      .filter((name) => name !== "svg" && name !== "path");
    if (elementNames.length > 0) errors.push(`asset ${asset.id}: path profile only permits <svg> and <path>; found ${[...new Set(elementNames)].join(", ")}`);
    if (/\btransform\s*=/i.test(source)) errors.push(`asset ${asset.id}: path profile does not permit transforms`);
    if (!/<path\b/i.test(source)) errors.push(`asset ${asset.id}: path profile requires at least one <path>`);
    if (asset.viewBox?.[0] !== 0 || asset.viewBox?.[1] !== 0) errors.push(`asset ${asset.id}: path profile currently requires a 0 0 viewBox origin`);

    const rootMatch = source.match(/^\s*<svg\b([^>]*)>/i);
    const allowedRootAttributes = new Set(["xmlns", "viewBox", "fill", "stroke", "width", "height"]);
    const allowedPathAttributes = new Set(["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]);
    const attributeNames = (attributes) => [...attributes.matchAll(/([A-Za-z_:][A-Za-z0-9:._-]*)\s*=/g)].map((match) => match[1]);
    for (const name of attributeNames(rootMatch?.[1] ?? "")) {
      if (!allowedRootAttributes.has(name)) errors.push(`asset ${asset.id}: unsupported <svg> attribute ${name} in path profile`);
    }
    for (const match of source.matchAll(/<path\b([^>]*)\/?\s*>/gi)) {
      for (const name of attributeNames(match[1])) {
        if (!allowedPathAttributes.has(name)) errors.push(`asset ${asset.id}: unsupported <path> attribute ${name} in path profile`);
      }
      for (const paintName of ["fill", "stroke"]) {
        const paint = attr(match[1], paintName);
        if (paint && paint !== "none" && paint !== "currentColor" && !/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(paint)) {
          errors.push(`asset ${asset.id}: unsupported ${paintName} paint ${paint} in path profile`);
        }
      }
    }
  }

  if (asset.colorMode === "currentColor" && !/\b(?:fill|stroke)\s*=\s*["']currentColor["']/i.test(source)) {
    errors.push(`asset ${asset.id}: currentColor mode requires a currentColor fill or stroke`);
  }
}

for (const asset of assets) {
  if (asset.fallback && !ids.has(asset.fallback)) errors.push(`asset ${asset.id}: fallback ${asset.fallback} does not exist`);
  if (asset.fallback === asset.id) errors.push(`asset ${asset.id}: fallback cannot reference itself`);
}
const byId = new Map(assets.map((asset) => [asset.id, asset]));
for (const asset of assets) {
  const seen = new Set();
  let current = asset;
  while (current?.fallback) {
    if (seen.has(current.id)) {
      errors.push(`asset ${asset.id}: fallback cycle detected at ${current.id}`);
      break;
    }
    seen.add(current.id);
    current = byId.get(current.fallback);
  }
}

if (errors.length > 0) {
  console.error("Portable asset validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Portable asset validation passed for ${assets.length} asset(s).`);
