// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const tokenDirectories = ["spec/tokens", "spec/palettes"];
const allowedTypes = new Set([
  "color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number",
  "strokeStyle", "border", "transition", "shadow", "gradient", "typography"
]);

const errors = [];

function isReference(value) {
  return typeof value === "string" && /^\{[^{}.]+(?:\.[^{}.]+)*\}$/.test(value);
}
function referencePath(value) { return value.slice(1, -1); }
function validName(name) { return name === "$root" || (!name.startsWith("$") && !/[{}.]/.test(name)); }

function collectTokens(node, file, path = [], inheritedType, tokens = new Map()) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    errors.push(`${file}: group ${path.join(".") || "<root>"} must be an object`);
    return tokens;
  }
  const groupType = typeof node.$type === "string" ? node.$type : inheritedType;
  if (node.$type !== undefined && !allowedTypes.has(node.$type)) {
    errors.push(`${file}: unsupported DTCG type ${JSON.stringify(node.$type)} at ${path.join(".") || "<root>"}`);
  }
  for (const [name, value] of Object.entries(node)) {
    if (name.startsWith("$")) continue;
    if (!validName(name)) {
      errors.push(`${file}: invalid token/group name ${JSON.stringify(name)} at ${path.join(".") || "<root>"}`);
      continue;
    }
    const childPath = [...path, name];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${file}: ${childPath.join(".")} must be an object`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(value, "$value")) {
      const type = typeof value.$type === "string" ? value.$type : groupType;
      if (!type) errors.push(`${file}: token ${childPath.join(".")} has no explicit or inherited $type`);
      else if (!allowedTypes.has(type)) errors.push(`${file}: token ${childPath.join(".")} uses unsupported type ${JSON.stringify(type)}`);
      tokens.set(childPath.join("."), { type, value: value.$value });
    } else {
      collectTokens(value, file, childPath, groupType, tokens);
    }
  }
  return tokens;
}

function validateDimension(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.value !== "number" || !["px", "rem"].includes(value.unit)) {
    errors.push(`${label}: dimension must contain numeric value and unit px/rem`);
  }
}

function validateColor(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.colorSpace !== "string" || !Array.isArray(value.components) || value.components.length !== 3) {
    errors.push(`${label}: color must contain colorSpace and three components`);
    return;
  }
  if (value.colorSpace === "srgb" && value.components.some((component) => typeof component !== "number" || component < 0 || component > 1)) {
    errors.push(`${label}: sRGB components must be numbers in the range 0..1`);
  }
  if (value.alpha !== undefined && (typeof value.alpha !== "number" || value.alpha < 0 || value.alpha > 1)) {
    errors.push(`${label}: color alpha must be a number in the range 0..1`);
  }
}

function validateTypedField(value, expectedType, label, tokens) {
  if (isReference(value)) {
    const target = tokens.get(referencePath(value));
    if (!target) errors.push(`${label}: unresolved token reference ${value}`);
    else if (target.type !== expectedType) errors.push(`${label}: reference must resolve to ${expectedType}`);
    return;
  }
  validateTokenValue({ type: expectedType, value }, label, tokens);
}

function validateShadowLayer(value, label, tokens) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label}: shadow layer must be an object`);
    return;
  }
  for (const [field, expectedType] of [["color", "color"], ["offsetX", "dimension"], ["offsetY", "dimension"], ["blur", "dimension"], ["spread", "dimension"]]) {
    if (!(field in value)) {
      errors.push(`${label}: shadow layer is missing ${field}`);
      continue;
    }
    validateTypedField(value[field], expectedType, `${label}.${field}`, tokens);
  }
  if (value.inset !== undefined && typeof value.inset !== "boolean") errors.push(`${label}.inset: shadow inset must be a boolean`);
  const allowed = new Set(["color", "offsetX", "offsetY", "blur", "spread", "inset"]);
  for (const field of Object.keys(value)) if (!allowed.has(field)) errors.push(`${label}: unsupported shadow field ${field}`);
  if (!isReference(value.blur) && value.blur?.value < 0) errors.push(`${label}.blur: shadow blur must not be negative`);
}

function validateTokenValue(token, label, tokens) {
  const { type, value } = token;
  if (isReference(value)) {
    const target = tokens.get(referencePath(value));
    if (!target) errors.push(`${label}: unresolved token reference ${value}`);
    else if (type && target.type && type !== target.type) errors.push(`${label}: reference ${value} resolves to ${target.type}, expected ${type}`);
    return;
  }
  switch (type) {
    case "color": validateColor(value, label); break;
    case "dimension": validateDimension(value, label); break;
    case "duration":
      if (!value || typeof value !== "object" || typeof value.value !== "number" || !["ms", "s"].includes(value.unit)) errors.push(`${label}: duration must contain numeric value and unit ms/s`);
      break;
    case "cubicBezier":
      if (!Array.isArray(value) || value.length !== 4 || value.some((item) => typeof item !== "number") || value[0] < 0 || value[0] > 1 || value[2] < 0 || value[2] > 1) errors.push(`${label}: cubicBezier must contain four numbers with x coordinates in the range 0..1`);
      break;
    case "number": if (typeof value !== "number") errors.push(`${label}: number token must contain a JSON number`); break;
    case "shadow": {
      const layers = Array.isArray(value) ? value : [value];
      if (layers.length === 0) {
        errors.push(`${label}: shadow array must not be empty`);
        break;
      }
      layers.forEach((layer, index) => {
        const layerLabel = Array.isArray(value) ? `${label}[${index}]` : label;
        if (isReference(layer)) {
          const target = tokens.get(referencePath(layer));
          if (!target) errors.push(`${layerLabel}: unresolved shadow reference ${layer}`);
          else if (target.type !== "shadow") errors.push(`${layerLabel}: reference must resolve to shadow`);
        } else validateShadowLayer(layer, layerLabel, tokens);
      });
      break;
    }
    case "transition": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`${label}: transition must be an object`);
        break;
      }
      for (const [field, expectedType] of [["duration", "duration"], ["delay", "duration"], ["timingFunction", "cubicBezier"]]) {
        const fieldValue = value[field];
        if (isReference(fieldValue)) {
          const target = tokens.get(referencePath(fieldValue));
          if (!target) errors.push(`${label}: unresolved transition reference ${fieldValue}`);
          else if (target.type !== expectedType) errors.push(`${label}: ${field} reference must resolve to ${expectedType}`);
        } else if (expectedType === "duration") validateTokenValue({ type: "duration", value: fieldValue }, `${label}.${field}`, tokens);
        else validateTokenValue({ type: "cubicBezier", value: fieldValue }, `${label}.${field}`, tokens);
      }
      break;
    }
    default: break;
  }
}

async function validateFile(file) {
  const document = JSON.parse(await readFile(file, "utf8"));
  const tokens = collectTokens(document, file);
  for (const [path, token] of tokens) validateTokenValue(token, `${file}:${path}`, tokens);
  return tokens;
}

for (const directory of tokenDirectories) {
  const entries = await readdir(directory);
  for (const entry of entries.filter((name) => name.endsWith(".tokens.json")).sort()) await validateFile(join(directory, entry));
}

const requiredPaletteRoles = [
  "background", "surface", "surfaceElevated", "textPrimary", "textSecondary", "textDisabled", "accent", "accentHover", "accentPressed", "onAccent", "border", "borderStrong", "focus", "success", "warning", "danger", "dangerHover", "dangerPressed"
];
for (const entry of (await readdir("spec/palettes")).filter((name) => name.endsWith(".tokens.json")).sort()) {
  const file = join("spec/palettes", entry);
  const document = JSON.parse(await readFile(file, "utf8"));
  const tokens = collectTokens(document, file);
  for (const role of requiredPaletteRoles) {
    const token = tokens.get(`semantic.color.${role}`);
    if (!token) errors.push(`${file}: missing required semantic palette role semantic.color.${role}`);
    else if (token.type !== "color") errors.push(`${file}: semantic.color.${role} must resolve as a color token`);
  }
}
if (errors.length > 0) {
  console.error("Specification token validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log("DTCG token sources and semantic palette roles are valid.");
