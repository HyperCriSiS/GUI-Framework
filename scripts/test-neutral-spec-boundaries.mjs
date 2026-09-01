// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const specRoot = "spec";
const forbiddenTerms = [
  { pattern: /\baria(?:-[a-z0-9-]+)?\b/i, label: "ARIA" },
  { pattern: /\bcss\b/i, label: "CSS" },
  { pattern: /\bhtml(?:element|inputelement)?\b/i, label: "HTML" },
  { pattern: /\bdom\b/i, label: "DOM" },
  { pattern: /\bandroidx?\b/i, label: "Android" },
  { pattern: /\bcompose\b/i, label: "Compose" },
  { pattern: /\bkotlin\b/i, label: "Kotlin" },
  { pattern: /\btypescript\b/i, label: "TypeScript" },
  { pattern: /\bjavascript\b/i, label: "JavaScript" },
  { pattern: /\bbrowser\b/i, label: "browser" },
  { pattern: /\bswiftui\b/i, label: "SwiftUI" },
  { pattern: /\breact\b/i, label: "React" },
  { pattern: /\bqt\b/i, label: "Qt" },
];

async function collectJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
  return files;
}

function collectStrings(value, location = "$", output = []) {
  if (typeof value === "string") {
    output.push({ location, value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStrings(entry, `${location}[${index}]`, output));
    return output;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      output.push({ location: `${location}.<key>`, value: key });
      collectStrings(entry, `${location}.${key}`, output);
    }
  }
  return output;
}

const files = await collectJsonFiles(specRoot);
assert.ok(files.length > 0, "neutral specification JSON sources must exist");

const violations = [];
for (const file of files.sort()) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  for (const item of collectStrings(parsed)) {
    for (const forbidden of forbiddenTerms) {
      if (forbidden.pattern.test(item.value)) {
        violations.push(`${file} ${item.location}: renderer-specific term ${forbidden.label} in ${JSON.stringify(item.value)}`);
      }
    }
  }
}

assert.deepEqual(
  violations,
  [],
  `Canonical specification must remain renderer-neutral:\n${violations.join("\n")}`,
);

console.log(`Renderer-neutral specification boundary tests passed for ${files.length} JSON source(s).`);
