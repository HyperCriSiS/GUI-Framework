// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  GUI_HOST_CONTEXT_PRESETS,
  getGuiHostContextPreset,
  resolveGuiHostCapabilities,
} from "../packages/integration-host-context/src/index.mjs";

const contract = JSON.parse(
  await readFile("packages/integration-host-context/presets.json", "utf8"),
);
assert.equal(contract.schemaVersion, 1);
assert.ok(Array.isArray(contract.presets));
assert.ok(contract.presets.length >= 4);

const canonical = Object.fromEntries(
  contract.presets.map((preset) => {
    assert.match(preset.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(Array.isArray(preset.availableCapabilities));
    assert.deepEqual(
      preset.availableCapabilities,
      [...new Set(preset.availableCapabilities)].sort(),
      `${preset.id} capabilities must be sorted and unique`,
    );
    return [preset.id, preset.availableCapabilities];
  }),
);
assert.deepEqual(Object.keys(canonical).sort(), Object.keys(GUI_HOST_CONTEXT_PRESETS).sort());
for (const [id, capabilities] of Object.entries(canonical)) {
  assert.deepEqual(getGuiHostContextPreset(id).availableCapabilities, capabilities);
}
assert.deepEqual(
  resolveGuiHostCapabilities("rich-effects", { additionalCapabilities: ["shaderEffects", "backdropBlur"] }),
  ["advancedBlendModes", "backdropBlur", "shaderEffects"],
);
assert.throws(() => getGuiHostContextPreset("unknown"), RangeError);
assert.throws(
  () => resolveGuiHostCapabilities("portable", { additionalCapabilities: "backdropBlur" }),
  TypeError,
);

const python = spawnSync(
  "python3",
  [
    "-c",
    [
      "import json,sys",
      "sys.path.insert(0, 'packages/integration-host-context/python')",
      "import gui_framework_host_context_presets as p",
      "print(json.dumps({k:list(v) for k,v in p.GUI_HOST_CONTEXT_PRESETS.items()}, sort_keys=True))",
    ].join(";"),
  ],
  { encoding: "utf8" },
);
assert.equal(python.status, 0, python.stderr);
assert.deepEqual(JSON.parse(python.stdout), canonical);

const kotlin = await readFile(
  "packages/integration-host-context/kotlin/GuiHostContextPresets.kt",
  "utf8",
);
for (const [id, capabilities] of Object.entries(canonical)) {
  assert.match(kotlin, new RegExp(`\\"${id}\\"`));
  for (const capability of capabilities) assert.match(kotlin, new RegExp(`\\"${capability}\\"`));
}
assert.match(kotlin, /fun resolveGuiHostCapabilities\(/);

console.log("Shared host-context preset parity tests passed.");
