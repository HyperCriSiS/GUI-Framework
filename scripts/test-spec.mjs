// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const first = "build/spec-ir-test-a.json";
const second = "build/spec-ir-test-b.json";

function compile(output) {
  const result = spawnSync(process.execPath, ["packages/compiler/src/index.mjs", "--output", output], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`Specification compiler failed:\n${result.stdout}\n${result.stderr}`);
  }
}

try {
  compile(first);
  compile(second);

  const [a, b] = await Promise.all([readFile(first, "utf8"), readFile(second, "utf8")]);
  assert.equal(a, b, "The compiler must produce byte-identical output for identical inputs");

  const ir = JSON.parse(a);
  assert.deepEqual(
    ir.themes.map((theme) => theme.id),
    ["basic", "modern", "glass", "frosted-glass", "spacey", "cyberpunk"],
    "The initial theme registry must remain stable"
  );

  assert.deepEqual(
    ir.palettes.map((palette) => palette.id),
    ["reference-dark", "reference-light"],
    "Independent development palettes must remain registered"
  );

  const darkButton = ir.palettes.find((palette) => palette.id === "reference-dark")?.components?.button;
  const lightButton = ir.palettes.find((palette) => palette.id === "reference-light")?.components?.button;
  assert.ok(darkButton && lightButton, "Every registered palette must compile the same button contract");

  assert.deepEqual(darkButton.anatomy, lightButton.anatomy, "Palette changes must not fork component anatomy");
  assert.deepEqual(darkButton.variants, lightButton.variants, "Palette changes must not fork component variants");
  assert.deepEqual(darkButton.states, lightButton.states, "Palette changes must not fork component states");
  assert.deepEqual(darkButton.semantics, lightButton.semantics, "Palette changes must not fork component semantics");
  assert.deepEqual(darkButton.capabilities, lightButton.capabilities, "Palette changes must not fork capability requirements");

  assert.equal(darkButton.tokenBindings.accent.value.hex, "#4C8DFF");
  assert.equal(lightButton.tokenBindings.accent.value.hex, "#684DE2");
  assert.notDeepEqual(
    darkButton.tokenBindings.accent.value,
    lightButton.tokenBindings.accent.value,
    "Palette swapping must change resolved semantic color values"
  );

  assert.deepEqual(
    darkButton.tokenBindings.accent.trace.map((entry) => entry.token),
    ["semantic.color.accent", "palette.accent500"],
    "Resolved token bindings must preserve provenance"
  );
  assert.deepEqual(
    lightButton.tokenBindings.accent.trace.map((entry) => entry.token),
    ["semantic.color.accent", "palette.accent500"],
    "Equivalent semantic roles must preserve equivalent provenance shape across palettes"
  );
  assert.equal(darkButton.semantics.preferNativePrimitive, true);

  console.log("Specification compiler determinism, provenance and palette-independence tests passed.");
} finally {
  await Promise.all([rm(first, { force: true }), rm(second, { force: true })]);
}
