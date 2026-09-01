// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import {
  resolveComponentVisualForCapabilities,
  selectCapabilityFallback,
} from "../packages/compiler/src/theme-resolution.mjs";

const capabilityContract = {
  required: [],
  optional: ["advancedBlendModes", "shaderEffects"],
  fallbackOrder: ["standard", "minimal"],
};

const visual = {
  base: {
    root: {
      fill: "base-fill",
      radius: "base-radius",
    },
  },
  states: {
    hover: {
      root: { foreground: "hover-foreground" },
    },
  },
  fallbacks: {
    standard: {
      requires: ["advancedBlendModes"],
      recipe: {
        base: {
          root: { fill: "standard-fill" },
        },
        states: {
          hover: {
            root: { glow: "standard-hover-glow" },
          },
        },
      },
    },
    minimal: {
      requires: [],
      recipe: {
        base: {
          root: { fill: "minimal-fill" },
        },
      },
    },
  },
};

assert.deepEqual(
  selectCapabilityFallback(visual, capabilityContract, ["shaderEffects", "advancedBlendModes"]),
  { supported: true, missingRequired: [], selectedFallback: "standard" },
  "the first compatible fallback in contract order must win",
);

assert.deepEqual(
  selectCapabilityFallback(visual, capabilityContract, []),
  { supported: true, missingRequired: [], selectedFallback: "minimal" },
  "a lower fallback must be selected when preferred requirements are unavailable",
);

const rich = resolveComponentVisualForCapabilities(visual, capabilityContract, {
  activeStates: ["hover"],
  statePriority: ["default", "hover"],
  availableCapabilities: ["advancedBlendModes"],
});
assert.equal(rich.selectedFallback, "standard");
assert.deepEqual(rich.visual.root, {
  fill: "standard-fill",
  radius: "base-radius",
  foreground: "hover-foreground",
  glow: "standard-hover-glow",
});

const minimal = resolveComponentVisualForCapabilities(visual, capabilityContract, {
  activeStates: ["hover"],
  statePriority: ["default", "hover"],
  availableCapabilities: [],
});
assert.equal(minimal.selectedFallback, "minimal");
assert.deepEqual(minimal.visual.root, {
  fill: "minimal-fill",
  radius: "base-radius",
  foreground: "hover-foreground",
});

const baseOnly = resolveComponentVisualForCapabilities(
  { base: { root: { fill: "base" } } },
  capabilityContract,
  { statePriority: ["default"], availableCapabilities: [] },
);
assert.equal(baseOnly.selectedFallback, null);
assert.deepEqual(baseOnly.visual, { root: { fill: "base" } });

const unsupported = selectCapabilityFallback(
  visual,
  {
    required: ["shaderEffects"],
    optional: [],
    fallbackOrder: ["minimal"],
  },
  [],
);
assert.deepEqual(unsupported, {
  supported: false,
  missingRequired: ["shaderEffects"],
  selectedFallback: null,
});

const orderIndependentA = selectCapabilityFallback(
  visual,
  capabilityContract,
  ["shaderEffects", "advancedBlendModes"],
);
const orderIndependentB = selectCapabilityFallback(
  visual,
  capabilityContract,
  ["advancedBlendModes", "shaderEffects"],
);
assert.deepEqual(orderIndependentA, orderIndependentB);

console.log("Capability fallback selection and visual resolution are deterministic.");
