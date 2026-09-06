// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const api = JSON.parse(await readFile("api/public-api.json", "utf8"));
assert.equal(api.schemaVersion, 1);
assert.equal(api.status, "stable-boundary");
assert.equal(api.publicationState, "locked");

const distribution = JSON.parse(await readFile("distribution/artifacts.json", "utf8"));
assert.equal(distribution.publicationLock.state, "locked");
const artifactById = new Map(distribution.artifacts.map((artifact) => [artifact.id, artifact]));

function expectedJs(artifact) {
  const entry = api.javascript.find((candidate) => candidate.artifact === artifact);
  assert.ok(entry, `missing JS API entry for ${artifact}`);
  return entry;
}

function exportedNamesFromTypescriptBarrel(source) {
  const names = [];
  const pattern = /export(?:\s+type)?\s*\{([^}]+)\}\s*from\s*["'][^"']+["'];/g;
  for (const match of source.matchAll(pattern)) {
    for (const part of match[1].split(",")) {
      const value = part.trim();
      if (!value) continue;
      const [original, alias] = value.split(/\s+as\s+/);
      names.push((alias ?? original).trim());
    }
  }
  return names.sort();
}

const packagePaths = new Map([
  ["core-js", "packages/core/package.json"],
  ["spec-compiler-js", "packages/compiler/package.json"],
  ["web-adapter-js", "packages/adapter-web/package.json"],
  ["browser-extension-integration-js", "packages/integration-browser-extension/package.json"],
  ["web-application-integration-js", "packages/integration-web-application/package.json"],
  ["host-context-js", "packages/integration-host-context/package.json"],
]);
for (const [artifactId, packagePath] of packagePaths) {
  const manifest = JSON.parse(await readFile(packagePath, "utf8"));
  const entry = expectedJs(artifactId);
  assert.equal(manifest.name, entry.package, `${packagePath} package name`);
  assert.equal(manifest.private, true, `${packagePath} must remain private while publication is locked`);
  assert.equal(manifest.version, "0.0.0-development", `${packagePath} development version`);
  assert.equal(entry.entrypoint, ".", `${artifactId} must expose one canonical package root`);
  assert.equal(typeof manifest.exports?.["."], "string", `${packagePath} must declare a root export`);
  assert.equal(artifactById.get(artifactId)?.logicalName, entry.package, `${artifactId} logical name drift`);
}

const coreSource = await readFile("packages/core/src/index.ts", "utf8");
assert.doesNotMatch(coreSource, /export\s+\*/u, "core public barrel must not use wildcard exports");
assert.deepEqual(exportedNamesFromTypescriptBarrel(coreSource), expectedJs("core-js").exports);

const modulePaths = new Map([
  ["spec-compiler-js", "packages/compiler/src/index.mjs"],
  ["web-adapter-js", "packages/adapter-web/src/index.mjs"],
  ["browser-extension-integration-js", "packages/integration-browser-extension/src/index.mjs"],
  ["web-application-integration-js", "packages/integration-web-application/src/index.mjs"],
  ["host-context-js", "packages/integration-host-context/src/index.mjs"],
]);
for (const [artifactId, modulePath] of modulePaths) {
  const module = await import(pathToFileURL(resolve(modulePath)).href);
  assert.deepEqual(Object.keys(module).sort(), expectedJs(artifactId).exports, `${artifactId} export drift`);
}

const tempRoot = await mkdtemp(join(tmpdir(), "gui-framework-public-api-"));
try {
  const compilerUrl = pathToFileURL(resolve("packages/compiler/src/index.mjs")).href;
  const importProbe = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(compilerUrl)});`],
    { cwd: tempRoot, encoding: "utf8" },
  );
  assert.equal(importProbe.status, 0, `compiler import must be side-effect free:\n${importProbe.stderr}`);

  const compiler = await import(compilerUrl);
  const ir = await compiler.compileSpecification();
  assert.equal(typeof ir.specVersion, "string");
  assert.ok(ir.palettes.length > 0);

  const apiOutput = join(tempRoot, "api-ir.json");
  const written = await compiler.compileSpecificationToFile({ outputPath: apiOutput });
  assert.equal(written.outputPath, resolve(apiOutput));
  assert.equal(JSON.parse(await readFile(apiOutput, "utf8")).specVersion, ir.specVersion);

  for (const entry of ["packages/compiler/src/index.mjs", "packages/compiler/src/cli.mjs"]) {
    const output = join(tempRoot, `${entry.endsWith("cli.mjs") ? "canonical" : "legacy"}.json`);
    const result = spawnSync(process.execPath, [resolve(entry), "--output", output], { encoding: "utf8" });
    assert.equal(result.status, 0, `${entry} CLI compatibility failed:\n${result.stderr}`);
    assert.equal(JSON.parse(await readFile(output, "utf8")).specVersion, ir.specVersion);
  }

  const kotlinContracts = join(tempRoot, "GuiContracts.kt");
  const aliasPath = join(tempRoot, "GuiContractAliases.kt");
  const generatorResult = spawnSync(
    process.execPath,
    [resolve("packages/adapter-compose/src/generate-contracts.mjs"), apiOutput, kotlinContracts, aliasPath],
    { encoding: "utf8" },
  );
  assert.equal(generatorResult.status, 0, `Compose contract generator failed:\n${generatorResult.stderr}`);
  const generated = await readFile(kotlinContracts, "utf8");
  assert.match(generated, /package gui\.framework\.generated\.api/);
  assert.doesNotMatch(generated, /package gui\.framework\.generated\.internal/);
  const aliases = await readFile(aliasPath, "utf8");
  assert.match(aliases, /package gui\.framework\.generated\.internal/);
  assert.match(aliases, /typealias GuiThemeId = gui\.framework\.generated\.api\.GuiThemeId/);
  assert.match(aliases, /typealias GuiButtonContract = gui\.framework\.generated\.api\.GuiButtonContract/);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

const contractGenerator = await readFile("packages/adapter-compose/src/generate-contracts.mjs", "utf8");
assert.match(contractGenerator, /package gui\.framework\.generated\.api/);
assert.match(contractGenerator, /typealias \$\{name\} = gui\.framework\.generated\.api\.\$\{name\}/);
for (const generator of [
  "packages/adapter-compose/src/generate-tokens.mjs",
  "packages/adapter-compose/src/generate-visuals.mjs",
]) {
  const source = await readFile(generator, "utf8");
  assert.match(source, /package gui\.framework\.generated\.internal/, `${generator} must keep implementation output internal`);
  assert.doesNotMatch(source, /package gui\.framework\.generated\.api/, `${generator} must not leak implementation output into the API package`);
}
assert.match(await readFile("packages/integration-host-context/kotlin/GuiHostContextPresets.kt", "utf8"), /package gui\.framework\.integration\.hostcontext/);

function runPython(code, pythonPath) {
  const result = spawnSync("python3", ["-c", code], {
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: resolve(pythonPath) },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}
const pythonIntegration = api.python.find((entry) => entry.artifact === "python-integration");
const pythonExports = runPython(
  'import json, gui_framework_integration as m; print(json.dumps(sorted(m.__all__)))',
  "packages/integration-python",
);
assert.deepEqual(pythonExports, [...pythonIntegration.exports].sort());

const hostPython = api.python.find((entry) => entry.artifact === "host-context-python");
const hostExports = runPython(
  `import json, gui_framework_host_context_presets as m; print(json.dumps(sorted([name for name in ${JSON.stringify(hostPython.exports)} if hasattr(m, name)])))`,
  "packages/integration-host-context/python",
);
assert.deepEqual(hostExports, [...hostPython.exports].sort());

const compilerManifest = JSON.parse(await readFile("packages/compiler/package.json", "utf8"));
assert.equal(compilerManifest.bin?.["gui-framework-compile"], "./src/cli.mjs");

console.log("Stable public API surface contract tests passed.");
