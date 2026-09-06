// SPDX-License-Identifier: AGPL-3.0-or-later

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function buildBrowserExtensionBundle(options = {}) {
  const tokensPath = resolve(options.tokensPath ?? "build/web/tokens.css");
  const componentsPath = resolve(options.componentsPath ?? "build/web/components.css");
  const assetsPath = resolve(options.assetsPath ?? "build/web/assets");
  const outputDir = resolve(options.outputDir ?? "build/integration/browser-extension/gui-framework");
  const outputStylesheet = resolve(outputDir, "gui-framework.css");
  const outputAssets = resolve(outputDir, "assets");
  const outputManifest = resolve(outputDir, "bundle-manifest.json");

  const [tokens, components] = await Promise.all([
    readFile(tokensPath, "utf8"),
    readFile(componentsPath, "utf8"),
  ]);

  await mkdir(outputDir, { recursive: true });
  const stylesheet = [
    "/* GUI Framework browser-extension integration bundle. Generated; do not edit. */",
    "/* Tokens */",
    tokens.trimEnd(),
    "",
    "/* Components */",
    components.trimEnd(),
    "",
  ].join("\n");
  await writeFile(outputStylesheet, stylesheet, "utf8");

  await rm(outputAssets, { recursive: true, force: true });
  await cp(assetsPath, outputAssets, { recursive: true, force: true });

  const manifest = {
    schemaVersion: 1,
    host: "browser-extension",
    stylesheet: "gui-framework.css",
    assetsDirectory: "assets",
  };
  await writeFile(outputManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return Object.freeze({
    outputDir,
    stylesheetPath: outputStylesheet,
    assetsPath: outputAssets,
    manifestPath: outputManifest,
  });
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entry === import.meta.url) {
  const [tokensPath, componentsPath, assetsPath, outputDir] = process.argv.slice(2);
  const result = await buildBrowserExtensionBundle({ tokensPath, componentsPath, assetsPath, outputDir });
  console.log(`Generated browser-extension GUI bundle at ${result.outputDir}`);
}
