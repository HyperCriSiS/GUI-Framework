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

function containsReference(value) {
  if (typeof value === "string") return /^\{[^{}]+\}$/.test(value);
  if (Array.isArray(value)) return value.some(containsReference);
  if (value !== null && typeof value === "object") return Object.values(value).some(containsReference);
  return false;
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

  const darkPalette = ir.palettes.find((palette) => palette.id === "reference-dark");
  const lightPalette = ir.palettes.find((palette) => palette.id === "reference-light");
  const darkButton = darkPalette?.components?.button;
  const lightButton = lightPalette?.components?.button;
  assert.ok(darkButton && lightButton, "Every registered palette must compile the same button contract");

  assert.deepEqual(darkButton.anatomy, lightButton.anatomy, "Palette changes must not fork component anatomy");
  assert.deepEqual(darkButton.content, lightButton.content, "Palette changes must not fork component content contracts");
  assert.deepEqual(darkButton.properties, lightButton.properties, "Palette changes must not fork component property contracts");
  assert.deepEqual(darkButton.events, lightButton.events, "Palette changes must not fork component event contracts");
  assert.deepEqual(darkButton.variants, lightButton.variants, "Palette changes must not fork component variants");
  assert.deepEqual(darkButton.states, lightButton.states, "Palette changes must not fork component states");
  assert.deepEqual(darkButton.semantics, lightButton.semantics, "Palette changes must not fork component semantics");
  assert.deepEqual(darkButton.capabilities, lightButton.capabilities, "Palette changes must not fork capability requirements");

  assert.deepEqual(darkButton.content, [
    { id: "label", kind: "text", required: true },
    { id: "leadingIcon", kind: "graphic", required: false },
    { id: "trailingIcon", kind: "graphic", required: false }
  ]);
  assert.deepEqual(darkButton.events, [{ id: "activate", payload: "none" }]);
  assert.equal(darkButton.properties.find((property) => property.id === "disabled")?.state, "disabled");
  assert.equal(darkButton.properties.find((property) => property.id === "loading")?.state, "loading");

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
  assert.equal(darkButton.semantics.preferNativePrimitive, true);

  const transition = darkButton.tokenBindings.interactionTransition;
  assert.equal(transition.type, "transition");
  assert.deepEqual(transition.value.duration, { value: 120, unit: "ms" });
  assert.deepEqual(transition.value.delay, { value: 0, unit: "ms" });
  assert.deepEqual(transition.value.timingFunction, [0.2, 0, 0, 1]);
  assert.equal(containsReference(transition.value), false, "Composite token values must not retain unresolved references in IR");

  assert.ok(darkPalette.tokens["semantic.color.background"], "Semantic tokens must be exported in the public IR");
  assert.ok(darkPalette.tokens["spacing.md"], "Primitive tokens must be exported in the public IR");
  assert.ok(darkPalette.tokens["motion.interaction.fast"], "Composite primitive tokens must be exported in the public IR");
  assert.equal(darkPalette.tokens["palette.accent500"], undefined, "Raw palette tokens must not be exposed as public adapter tokens");
  assert.equal(containsReference(darkPalette.tokens), false, "Public adapter tokens must be fully resolved");

  assert.deepEqual(
    Object.keys(darkPalette.themes),
    ["basic", "cyberpunk", "frosted-glass", "glass", "modern", "spacey"],
    "Every palette must contain compiled visual slots for the six registered themes",
  );
  assert.deepEqual(
    darkPalette.themes.basic.components,
    {},
    "Theme visual IR must stay empty until concrete Basic design values are deliberately defined",
  );

  console.log("Specification compiler determinism, provenance, runtime contracts, composite resolution and palette-independence tests passed.");
} finally {
  await Promise.all([rm(first, { force: true }), rm(second, { force: true })]);
}
