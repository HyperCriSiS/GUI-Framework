// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  applyWebCapabilityFallback,
  configureWebCapabilityFallback,
  detectWebCapabilities,
  selectWebCapabilityFallback,
} from "../packages/adapter-web/src/capabilities.mjs";
import { selectCapabilityFallback } from "../packages/compiler/src/theme-resolution.mjs";

const profile = {
  required: [],
  optional: ["advancedBlendModes", "shaderEffects"],
  fallbackOrder: ["standard", "minimal"],
  fallbacks: {
    standard: { requires: ["advancedBlendModes"] },
    minimal: { requires: [] },
  },
};
const neutralVisual = {
  fallbacks: {
    standard: { requires: ["advancedBlendModes"], recipe: {} },
    minimal: { requires: [], recipe: {} },
  },
};

assert.deepEqual(
  detectWebCapabilities({
    cssSupports: (property, value) => property === "mix-blend-mode" && value === "multiply",
  }),
  ["advancedBlendModes"],
);
assert.deepEqual(
  detectWebCapabilities({
    cssSupports: () => false,
    providedCapabilities: ["shaderEffects", "customProvider", "shaderEffects"],
  }),
  ["customProvider", "shaderEffects"],
);
assert.deepEqual(
  detectWebCapabilities({ cssSupports: () => false }),
  [],
);

for (const availableCapabilities of [
  [],
  ["advancedBlendModes"],
  ["shaderEffects"],
  ["advancedBlendModes", "shaderEffects"],
]) {
  const expected = selectCapabilityFallback(
    neutralVisual,
    {
      required: profile.required,
      optional: profile.optional,
      fallbackOrder: profile.fallbackOrder,
    },
    availableCapabilities,
  );
  assert.deepEqual(
    selectWebCapabilityFallback(profile, availableCapabilities),
    expected,
    `Web fallback selection must match neutral resolution for ${availableCapabilities.join(",") || "no capabilities"}`,
  );
}

assert.deepEqual(
  selectWebCapabilityFallback(
    {
      ...profile,
      required: ["shaderEffects"],
    },
    [],
  ),
  {
    supported: false,
    missingRequired: ["shaderEffects"],
    selectedFallback: null,
  },
);

const attributes = new Map();
const element = {
  setAttribute(name, value) {
    attributes.set(name, String(value));
  },
  removeAttribute(name) {
    attributes.delete(name);
  },
};
applyWebCapabilityFallback(element, {
  supported: true,
  missingRequired: [],
  selectedFallback: "minimal",
});
assert.equal(attributes.get("data-gui-fallback"), "minimal");
assert.equal(attributes.has("data-gui-unsupported-capabilities"), false);

configureWebCapabilityFallback(element, profile, {
  availableCapabilities: ["advancedBlendModes"],
});
assert.equal(attributes.get("data-gui-fallback"), "standard");

configureWebCapabilityFallback(
  element,
  {
    ...profile,
    required: ["shaderEffects", "customProvider"],
  },
  { availableCapabilities: [] },
);
assert.equal(attributes.has("data-gui-fallback"), false);
assert.equal(
  attributes.get("data-gui-unsupported-capabilities"),
  "customProvider shaderEffects",
);

const irPath = "build/spec-ir-web-capability-test.json";
const cssPath = "build/web/components-capability-test.css";
const compiledValue = (reference, type = "number") => ({ reference, type });
const ir = {
  themes: [{ id: "basic" }],
  palettes: [
    {
      id: "reference-a",
      components: {
        button: {
          sizes: [],
          variants: [],
          states: ["default"],
        },
      },
      themes: {
        basic: {
          components: {
            button: {
              base: {
                root: {
                  opacity: compiledValue("{opacity.enabled}"),
                },
              },
              fallbacks: {
                minimal: {
                  requires: [],
                  recipe: {
                    base: {
                      root: {
                        opacity: compiledValue("{opacity.disabled}"),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      id: "reference-b",
      components: {
        button: {
          sizes: [],
          variants: [],
          states: ["default"],
        },
      },
      themes: {
        basic: {
          components: {
            button: {
              base: {
                root: {
                  opacity: compiledValue("{opacity.enabled}"),
                },
              },
              fallbacks: {
                minimal: {
                  requires: [],
                  recipe: {
                    base: {
                      root: {
                        opacity: compiledValue("{opacity.disabled}"),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
};

try {
  await writeFile(irPath, `${JSON.stringify(ir, null, 2)}\n`, "utf8");
  const result = spawnSync(
    process.execPath,
    ["packages/adapter-web/src/generate-components-css.mjs", irPath, cssPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Web CSS generator failed:\n${result.stdout}\n${result.stderr}`);
  }

  const css = await readFile(cssPath, "utf8");
  assert.match(
    css,
    /\[data-gui-theme="basic"\] \.gui-button:where\(\[data-gui-fallback="minimal"\]\) \{/,
  );
  assert.match(css, /opacity: var\(--gui-opacity-disabled\);/);
  console.log("Web capability detection, neutral fallback parity and CSS fallback emission tests passed.");
} finally {
  await Promise.all([rm(irPath, { force: true }), rm(cssPath, { force: true })]);
}
