// SPDX-License-Identifier: AGPL-3.0-or-later

function sortedKeys(value) {
  return Object.keys(value ?? {}).sort();
}

function sameIds(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Separates manifest registration from adapter-ready theme availability.
 * A theme is available only when every compiled palette contains a visual
 * recipe for every registered component.
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

  for (const palette of ir.palettes.slice(1)) {
    const paletteComponentIds = sortedKeys(palette.components);
    if (!sameIds(paletteComponentIds, componentIds)) {
      throw new Error(`Component registry differs for palette ${palette.id}`);
    }
  }

  const availableThemeIds = registeredThemeIds.filter((themeId) =>
    ir.palettes.every((palette) =>
      sameIds(sortedKeys(palette.themes?.[themeId]?.components), componentIds),
    ),
  );

  return { registeredThemeIds, availableThemeIds, componentIds };
}
