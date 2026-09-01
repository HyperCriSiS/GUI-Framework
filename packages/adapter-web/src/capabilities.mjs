// SPDX-License-Identifier: AGPL-3.0-or-later

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function defaultCssSupports(property, value) {
  const supports = globalThis.CSS?.supports;
  return typeof supports === "function" ? supports.call(globalThis.CSS, property, value) : false;
}

export function detectWebCapabilities({
  cssSupports = defaultCssSupports,
  providedCapabilities = [],
} = {}) {
  const available = new Set(providedCapabilities);

  if (
    cssSupports("mix-blend-mode", "multiply") === true ||
    cssSupports("background-blend-mode", "multiply") === true
  ) {
    available.add("advancedBlendModes");
  }

  if (
    cssSupports("backdrop-filter", "blur(1px)") === true ||
    cssSupports("-webkit-backdrop-filter", "blur(1px)") === true
  ) {
    available.add("backdropBlur");
  }

  // Arbitrary shader effects are not a baseline browser capability. Optional
  // providers may advertise shaderEffects through providedCapabilities.
  return sortedUnique(available);
}

export function selectWebCapabilityFallback(profile, availableCapabilities = []) {
  const available = new Set(availableCapabilities);
  const missingRequired = (profile?.required ?? []).filter(
    (capability) => !available.has(capability),
  );

  if (missingRequired.length > 0) {
    return {
      supported: false,
      missingRequired,
      selectedFallback: null,
    };
  }

  for (const fallbackId of profile?.fallbackOrder ?? []) {
    const fallback = profile?.fallbacks?.[fallbackId];
    if (!fallback) continue;
    const compatible = (fallback.requires ?? []).every((capability) =>
      available.has(capability),
    );
    if (compatible) {
      return {
        supported: true,
        missingRequired: [],
        selectedFallback: fallbackId,
      };
    }
  }

  return {
    supported: true,
    missingRequired: [],
    selectedFallback: null,
  };
}

export function applyWebCapabilityFallback(element, selection) {
  if (!element || typeof element.setAttribute !== "function" || typeof element.removeAttribute !== "function") {
    throw new TypeError("element must support setAttribute/removeAttribute");
  }

  if (selection?.selectedFallback) {
    element.setAttribute("data-gui-fallback", selection.selectedFallback);
  } else {
    element.removeAttribute("data-gui-fallback");
  }

  const missing = selection?.supported === false
    ? sortedUnique(selection.missingRequired ?? [])
    : [];
  if (missing.length > 0) {
    element.setAttribute("data-gui-unsupported-capabilities", missing.join(" "));
  } else {
    element.removeAttribute("data-gui-unsupported-capabilities");
  }

  return selection;
}


function findById(values, id) {
  return Array.isArray(values) ? values.find((entry) => entry?.id === id) ?? null : null;
}

export function getWebComponentCapabilityProfile(ir, { paletteId, themeId, componentId } = {}) {
  if (!ir || typeof ir !== "object") throw new TypeError("ir must be a compiled GUI specification object");
  if (typeof paletteId !== "string" || paletteId === "") throw new TypeError("paletteId must be a non-empty string");
  if (typeof themeId !== "string" || themeId === "") throw new TypeError("themeId must be a non-empty string");
  if (typeof componentId !== "string" || componentId === "") throw new TypeError("componentId must be a non-empty string");

  const palette = findById(ir.palettes, paletteId);
  if (!palette) throw new Error(`Unknown compiled palette: ${paletteId}`);

  const component = palette.components?.[componentId];
  if (!component) throw new Error(`Unknown compiled component for ${paletteId}: ${componentId}`);

  const theme = palette.themes?.[themeId];
  if (!theme) throw new Error(`Unknown compiled theme for ${paletteId}: ${themeId}`);

  const visual = theme.components?.[componentId] ?? {};
  const capabilities = component.capabilities ?? {};
  return {
    required: capabilities.required ?? [],
    optional: capabilities.optional ?? [],
    fallbackOrder: capabilities.fallbackOrder ?? [],
    fallbacks: visual.fallbacks ?? {},
  };
}

export function configureWebComponentCapabilities(element, ir, context = {}, options = {}) {
  const componentId = element?.dataset?.guiComponent;
  if (typeof componentId !== "string" || componentId === "") {
    throw new TypeError("element must expose data-gui-component");
  }

  const profile = getWebComponentCapabilityProfile(ir, {
    paletteId: context.paletteId,
    themeId: context.themeId,
    componentId,
  });
  return configureWebCapabilityFallback(element, profile, options);
}

export function configureWebCapabilityFallback(element, profile, options = {}) {
  const availableCapabilities =
    options.availableCapabilities ??
    detectWebCapabilities({
      cssSupports: options.cssSupports,
      providedCapabilities: options.providedCapabilities,
    });

  const selection = selectWebCapabilityFallback(profile, availableCapabilities);
  applyWebCapabilityFallback(element, selection);
  return {
    ...selection,
    availableCapabilities: sortedUnique(availableCapabilities),
  };
}
