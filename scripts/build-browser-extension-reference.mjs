// SPDX-License-Identifier: AGPL-3.0-or-later

import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildBrowserExtensionBundle } from "../packages/integration-browser-extension/src/build-bundle.mjs";

const REFERENCE_FILES = Object.freeze([
  "manifest.json",
  "popup.html",
  "popup.mjs",
  "service-worker.mjs",
]);

export async function buildBrowserExtensionReference(options = {}) {
  const sourceDir = resolve(options.sourceDir ?? "examples/browser-extension");
  const outputDir = resolve(options.outputDir ?? "build/examples/browser-extension");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await Promise.all(
    REFERENCE_FILES.map((file) => cp(resolve(sourceDir, file), resolve(outputDir, file), { force: true })),
  );
  const guiBundle = await buildBrowserExtensionBundle({
    outputDir: resolve(outputDir, "gui-framework"),
  });

  return Object.freeze({ outputDir, guiBundle });
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entry === import.meta.url) {
  const result = await buildBrowserExtensionReference();
  console.log(`Generated browser-extension reference at ${result.outputDir}`);
}
