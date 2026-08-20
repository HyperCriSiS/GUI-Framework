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
