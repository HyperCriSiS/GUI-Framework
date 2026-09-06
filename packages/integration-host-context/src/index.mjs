// SPDX-License-Identifier: AGPL-3.0-or-later

const DEFINITIONS = Object.freeze({
  portable: Object.freeze([]),
  "blend-effects": Object.freeze(["advancedBlendModes"]),
  "backdrop-effects": Object.freeze(["backdropBlur"]),
  "rich-effects": Object.freeze(["advancedBlendModes", "backdropBlur"]),
});

export const GUI_HOST_CONTEXT_PRESETS = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFINITIONS).map(([id, availableCapabilities]) => [
      id,
      Object.freeze({ id, availableCapabilities }),
    ]),
  ),
);

function requirePresetId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("host-context preset id must be a non-empty string");
  }
  return value.trim();
}

function normalizeAdditionalCapabilities(values = []) {
  if (typeof values === "string") {
    throw new TypeError("additionalCapabilities must be an iterable of identifiers, not a string");
  }
  if (!values || typeof values[Symbol.iterator] !== "function") {
    throw new TypeError("additionalCapabilities must be iterable");
  }
  const normalized = [];
  for (const rawValue of values) {
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
      throw new TypeError("capability identifiers must be non-empty strings");
    }
    normalized.push(rawValue.trim());
  }
  return normalized;
}

export function getGuiHostContextPreset(id) {
  const presetId = requirePresetId(id);
  const preset = GUI_HOST_CONTEXT_PRESETS[presetId];
  if (!preset) throw new RangeError(`Unknown GUI host-context preset: ${presetId}`);
  return preset;
}

export function resolveGuiHostCapabilities(id, { additionalCapabilities = [] } = {}) {
  const preset = getGuiHostContextPreset(id);
  return Object.freeze(
    [...new Set([...preset.availableCapabilities, ...normalizeAdditionalCapabilities(additionalCapabilities)])].sort(),
  );
}
