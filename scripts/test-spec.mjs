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

  const button = ir.palettes[0]?.components?.button;
  assert.ok(button, "The reference palette must compile the button contract");
  assert.equal(button.tokenBindings.accent.value.hex, "#4C8DFF");
  assert.deepEqual(
    button.tokenBindings.accent.trace.map((entry) => entry.token),
    ["semantic.color.accent", "palette.accent500"],
    "Resolved token bindings must preserve provenance"
  );
  assert.equal(button.semantics.preferNativePrimitive, true);

  console.log("Specification compiler determinism and reference-resolution tests passed.");
} finally {
  await Promise.all([rm(first, { force: true }), rm(second, { force: true })]);
}
