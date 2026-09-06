import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const stagingRoot = path.join(root, "build/release-staging/npm");
const stagedManifestPath = path.join(stagingRoot, "staged-packages.json");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  return result.stdout ?? "";
};

assert(fs.existsSync(stagedManifestPath), "npm staging manifest is missing; stage packages first");
const staged = JSON.parse(fs.readFileSync(stagedManifestPath, "utf8"));
assert(staged.schemaVersion === 1, "Unsupported npm staging manifest");
assert(staged.packages.length === 6, `Expected 6 npm artifacts, got ${staged.packages.length}`);

const tarballDir = path.join(stagingRoot, "tarballs");
fs.rmSync(tarballDir, { recursive: true, force: true });
fs.mkdirSync(tarballDir, { recursive: true });
const tarballs = [];

for (const pkg of staged.packages) {
  const packageDir = path.join(root, pkg.directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"));
  assert(manifest.private === true, `${pkg.id} staged manifest must remain private`);
  assert(manifest.license === "AGPL-3.0-or-later", `${pkg.id} must declare AGPL-3.0-or-later`);
  assert(fs.existsSync(path.join(packageDir, "LICENSE")), `${pkg.id} must stage the repository license`);

  const srcDir = path.join(packageDir, "src");
  if (fs.existsSync(srcDir)) {
    for (const file of fs.readdirSync(srcDir, { recursive: true }).filter((name) => typeof name === "string" && name.endsWith(".mjs"))) {
      const text = fs.readFileSync(path.join(srcDir, file), "utf8");
      assert(!/from\s+["']\.\.\/\.\.\//.test(text), `${pkg.id} contains a monorepo-escaping import in src/${file}`);
    }
  }

  const output = run("npm", ["pack", "--json", "--pack-destination", tarballDir], { cwd: packageDir });
  const details = JSON.parse(output);
  assert(Array.isArray(details) && details.length === 1 && details[0].filename, `${pkg.id} npm pack did not return one tarball`);
  const tarball = path.join(tarballDir, details[0].filename);
  assert(fs.existsSync(tarball), `${pkg.id} tarball was not created`);
  tarballs.push(tarball);
}

const consumerDir = path.join(stagingRoot, "consumer");
fs.rmSync(consumerDir, { recursive: true, force: true });
fs.mkdirSync(consumerDir, { recursive: true });
fs.writeFileSync(
  path.join(consumerDir, "package.json"),
  `${JSON.stringify({ name: "gui-framework-artifact-smoke", private: true, version: "0.0.0", type: "module" }, null, 2)}\n`,
);
run("npm", ["install", "--ignore-scripts", "--no-package-lock", "--no-audit", "--no-fund", ...tarballs], { cwd: consumerDir });

const smokeSource = `
import * as core from "@gui-framework/core";
import * as compiler from "@gui-framework/spec-compiler";
import * as web from "@gui-framework/web-adapter";
import * as browserExtension from "@gui-framework/browser-extension-integration";
import * as webApplication from "@gui-framework/web-application-integration";
import * as hostContext from "@gui-framework/host-context";

const checks = [
  ["core.supportsCapabilities", core.supportsCapabilities],
  ["compiler.compileSpecification", compiler.compileSpecification],
  ["web.createGuiButton", web.createGuiButton],
  ["browserExtension.createBrowserExtensionGuiHost", browserExtension.createBrowserExtensionGuiHost],
  ["webApplication.createWebApplicationGuiHost", webApplication.createWebApplicationGuiHost],
  ["hostContext.resolveGuiHostCapabilities", hostContext.resolveGuiHostCapabilities],
];
for (const [name, value] of checks) {
  if (typeof value !== "function") throw new Error(name + " is not an importable function");
}
if (!browserExtension.BROWSER_EXTENSION_SURFACES.includes("popup")) throw new Error("Browser extension surfaces missing popup");
if (!webApplication.WEB_APPLICATION_SURFACES.includes("application")) throw new Error("Web application surfaces missing application");
const portable = hostContext.resolveGuiHostCapabilities("portable");
if (!Array.isArray(portable) || portable.length !== 0) throw new Error("Portable host-context preset is not consumable");
console.log("Packed npm consumer imports succeeded.");
`;
const smokePath = path.join(consumerDir, "smoke.mjs");
fs.writeFileSync(smokePath, smokeSource);
run(process.execPath, [smokePath], { cwd: consumerDir });

console.log(`npm artifact smoke OK: ${tarballs.length} private development tarballs packed and consumed locally.`);
