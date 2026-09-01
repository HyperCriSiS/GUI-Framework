// SPDX-License-Identifier: AGPL-3.0-or-later

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function literal(value) {
  return JSON.stringify(value);
}

const [manifestPath = "spec/manifest.json", outputPath = "build/web/assets.ts", assetOutputDir = "build/web/assets", specRoot = "spec"] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
const assets = manifest.assets ?? [];
const outputEntries = [];

await mkdir(resolve(assetOutputDir), { recursive: true });

for (const asset of assets) {
  if (asset.kind !== "svg") continue;
  const sourcePath = resolve(specRoot, asset.source);
  const markup = await readFile(sourcePath, "utf8");
  const fileName = `${asset.id}.svg`;
  await copyFile(sourcePath, join(resolve(assetOutputDir), fileName));
  outputEntries.push({ ...asset, fileName, markup });
}

const lines = [
  "// Generated from the language-neutral GUI Framework specification.",
  "// Do not edit directly.",
  "",
  "export const guiAssets = {"
];
for (const asset of outputEntries) {
  lines.push(`  ${literal(asset.id)}: {`);
  lines.push(`    id: ${literal(asset.id)},`);
  lines.push(`    kind: ${literal(asset.kind)},`);
  lines.push(`    intrinsicSize: ${literal(asset.intrinsicSize)},`);
  lines.push(`    viewBox: ${literal(asset.viewBox)},`);
  lines.push(`    colorMode: ${literal(asset.colorMode)},`);
  lines.push(`    url: ${literal(`./assets/${asset.fileName}`)},`);
  lines.push(`    markup: ${literal(asset.markup)}`);
  lines.push("  },");
}
lines.push("} as const;", "");
lines.push("export type GuiAssetId = keyof typeof guiAssets;", "");
lines.push("export function guiAssetUrl(id: GuiAssetId): string {", "  return guiAssets[id].url;", "}", "");
lines.push("export function createGuiSvgAsset(document: Document, id: GuiAssetId, options: { title?: string; className?: string } = {}): SVGSVGElement {");
lines.push("  const asset = guiAssets[id];");
lines.push("  const template = document.createElement(\"template\");");
lines.push("  template.innerHTML = asset.markup.trim();");
lines.push("  const element = template.content.firstElementChild;");
lines.push("  if (!element || element.namespaceURI !== \"http://www.w3.org/2000/svg\" || element.localName !== \"svg\") {");
lines.push("    throw new Error(`Asset ${id} did not produce an SVG root`);");
lines.push("  }");
lines.push("  if (options.className) element.setAttribute(\"class\", options.className);");
lines.push("  element.setAttribute(\"focusable\", \"false\");");
lines.push("  if (options.title) {");
lines.push("    element.setAttribute(\"role\", \"img\");");
lines.push("    element.setAttribute(\"aria-label\", options.title);");
lines.push("  } else {");
lines.push("    element.setAttribute(\"aria-hidden\", \"true\");");
lines.push("  }");
lines.push("  return element as SVGSVGElement;", "}", "");

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), `${lines.join("\n")}\n`, "utf8");
console.log(`Generated Web asset registry at ${outputPath}`);
