// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function screamingSnake(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function kotlinString(value) {
  return JSON.stringify(value);
}

function attr(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function float(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid SVG numeric value ${value}`);
  return Number.isInteger(number) ? `${number}.0f` : `${number}f`;
}

function brush(value, colorMode) {
  if (!value || value === "none") return "null";
  if (value === "currentColor") return "SolidColor(currentColor)";
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return `SolidColor(Color(0xFF${value.slice(1).toUpperCase()}))`;
  if (/^#[0-9A-Fa-f]{8}$/.test(value)) return `SolidColor(Color(0x${value.slice(1).toUpperCase()}))`;
  throw new Error(`Unsupported SVG paint ${value} for ${colorMode} asset`);
}

function cap(value) {
  if (!value || value === "butt") return "StrokeCap.Butt";
  if (value === "round") return "StrokeCap.Round";
  if (value === "square") return "StrokeCap.Square";
  throw new Error(`Unsupported stroke-linecap ${value}`);
}

function join(value) {
  if (!value || value === "miter") return "StrokeJoin.Miter";
  if (value === "round") return "StrokeJoin.Round";
  if (value === "bevel") return "StrokeJoin.Bevel";
  throw new Error(`Unsupported stroke-linejoin ${value}`);
}

function parsePaths(svg, asset) {
  const rootAttributes = svg.match(/^\s*<svg\b([^>]*)>/i)?.[1] ?? "";
  const paths = [...svg.matchAll(/<path\b([^>]*)\/?\s*>/gi)].map((match) => match[1]);
  if (paths.length === 0) throw new Error(`SVG asset ${asset.id} has no paths`);
  return paths.map((attributes) => {
    const d = attr(attributes, "d");
    if (!d) throw new Error(`SVG asset ${asset.id} contains a path without d`);
    return {
      d,
      fill: brush(attr(attributes, "fill") ?? attr(rootAttributes, "fill"), asset.colorMode),
      stroke: brush(attr(attributes, "stroke") ?? attr(rootAttributes, "stroke"), asset.colorMode),
      strokeWidth: float(attr(attributes, "stroke-width") ?? 0),
      cap: cap(attr(attributes, "stroke-linecap")),
      join: join(attr(attributes, "stroke-linejoin")),
    };
  });
}

const [manifestPath = "spec/manifest.json", outputPath = "build/compose/GuiAssets.kt", specRoot = "spec"] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
const assets = (manifest.assets ?? []).filter((asset) => asset.kind === "svg");
const parsed = [];
for (const asset of assets) {
  if (asset.portableProfile !== "path") throw new Error(`Compose adapter cannot map SVG profile ${asset.portableProfile} for ${asset.id}`);
  const svg = await readFile(resolve(specRoot, asset.source), "utf8");
  parsed.push({ asset, paths: parsePaths(svg, asset) });
}

const lines = [
  "// Generated from the language-neutral GUI Framework specification.",
  "// Do not edit directly.",
  "",
  "package gui.framework.generated.internal",
  "",
  "import androidx.compose.ui.graphics.Color",
  "import androidx.compose.ui.graphics.SolidColor",
  "import androidx.compose.ui.graphics.StrokeCap",
  "import androidx.compose.ui.graphics.StrokeJoin",
  "import androidx.compose.ui.graphics.vector.ImageVector",
  "import androidx.compose.ui.graphics.vector.addPathNodes",
  "import androidx.compose.ui.unit.dp",
  "",
  "enum class GuiAssetId(val wireValue: String) {"
];
parsed.forEach(({ asset }, index) => lines.push(`    ${screamingSnake(asset.id)}(${kotlinString(asset.id)})${index === parsed.length - 1 ? ";" : ","}`));
lines.push("}", "", "object GuiAssets {", "    fun imageVector(id: GuiAssetId, currentColor: Color = Color.Black): ImageVector = when (id) {");
for (const { asset, paths } of parsed) {
  const [, , viewportWidth, viewportHeight] = asset.viewBox;
  lines.push(`        GuiAssetId.${screamingSnake(asset.id)} -> ImageVector.Builder(`);
  lines.push(`            name = ${kotlinString(asset.id)},`);
  lines.push(`            defaultWidth = ${float(asset.intrinsicSize.width)}.dp,`);
  lines.push(`            defaultHeight = ${float(asset.intrinsicSize.height)}.dp,`);
  lines.push(`            viewportWidth = ${float(viewportWidth)},`);
  lines.push(`            viewportHeight = ${float(viewportHeight)}`);
  lines.push("        ).apply {");
  for (const path of paths) {
    lines.push("            addPath(");
    lines.push(`                pathData = addPathNodes(${kotlinString(path.d)}),`);
    lines.push(`                fill = ${path.fill},`);
    lines.push(`                stroke = ${path.stroke},`);
    lines.push(`                strokeLineWidth = ${path.strokeWidth},`);
    lines.push(`                strokeLineCap = ${path.cap},`);
    lines.push(`                strokeLineJoin = ${path.join}`);
    lines.push("            )");
  }
  lines.push("        }.build()");
}
lines.push("    }", "}", "");

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), `${lines.join("\n")}\n`, "utf8");
console.log(`Generated Compose native vector assets at ${outputPath}`);
