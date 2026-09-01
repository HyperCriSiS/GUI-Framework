// SPDX-License-Identifier: AGPL-3.0-or-later

export function validatePaletteRegistry(entries) {
  const ids = new Set();
  const variants = new Set();

  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate palette id ${entry.id}`);
    ids.add(entry.id);

    const variantKey = `${entry.familyId}/${entry.variantId}`;
    if (variants.has(variantKey)) throw new Error(`Duplicate palette variant ${variantKey}`);
    variants.add(variantKey);
  }
}

export function groupPaletteFamilies(entries) {
  validatePaletteRegistry(entries);
  const families = new Map();

  for (const entry of entries) {
    const family = families.get(entry.familyId) ?? [];
    family.push(entry);
    families.set(entry.familyId, family);
  }

  return families;
}
