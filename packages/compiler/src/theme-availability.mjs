// SPDX-License-Identifier: AGPL-3.0-or-later

function sortedKeys(value) {
  return Object.keys(value ?? {}).sort();
}

function sameIds(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function visualComponentIdsForPalette(palette, registeredThemeIds) {
  const ids = new Set();
  for (const themeId of registeredThemeIds) {
    for (const componentId of sortedKeys(palette.themes?.[themeId]?.components)) ids.add(componentId);
  }
  return [...ids].sort();
}

/**
 * Separates manifest registration from adapter-ready theme availability.
 * Component contracts may be registered before their visuals are implemented.
 * A theme is adapter-ready only when every compiled palette contains the full
 * currently implemented visual-component set for that theme.
 */
export function analyzeThemeAvailability(ir) {
  if (!Array.isArray(ir.themes) || ir.themes.length === 0) {
    throw new Error("Compiled IR contains no themes");
  }
  if (!Array.isArray(ir.palettes) || ir.palettes.length === 0) {
    throw new Error("Compiled IR contains no palettes/components");
  }

  const registeredThemeIds = ir.themes.map((theme) => theme.id);
  const componentIds = sortedKeys(ir.palettes[0].components);
  if (componentIds.length === 0) throw new Error("Compiled IR contains no components");

  const visualComponentIds = visualComponentIdsForPalette(ir.palettes[0], registeredThemeIds);
  if (visualComponentIds.length === 0) throw new Error("Compiled IR contains no visualized components");
  for (const componentId of visualComponentIds) {
    if (!componentIds.includes(componentId)) {
      throw new Error(`Visual component ${componentId} has no registered component contract`);
    }
  }

  for (const palette of ir.palettes.slice(1)) {
    const paletteComponentIds = sortedKeys(palette.components);
    if (!sameIds(paletteComponentIds, componentIds)) {
      throw new Error(`Component registry differs for palette ${palette.id}`);
    }
    const paletteVisualComponentIds = visualComponentIdsForPalette(palette, registeredThemeIds);
    if (!sameIds(paletteVisualComponentIds, visualComponentIds)) {
      throw new Error(`Visual component registry differs for palette ${palette.id}`);
    }
  }

  const availableThemeIds = registeredThemeIds.filter((themeId) =>
    ir.palettes.every((palette) =>
      sameIds(sortedKeys(palette.themes?.[themeId]?.components), visualComponentIds),
    ),
  );

  return { registeredThemeIds, availableThemeIds, componentIds, visualComponentIds };
}
