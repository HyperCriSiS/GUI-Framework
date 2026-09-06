import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const contract = json("docs/contracts/documentation-contract.json");
const pkg = json("package.json");
const themeSchema = json("spec/schemas/theme.schema.json");
const componentSchema = json("spec/schemas/component-recipe.schema.json");
const manifestSchema = json("spec/schemas/framework-manifest.schema.json");

for (const doc of contract.documents) {
  assert(fs.existsSync(path.join(root, doc)), `Missing documentation file: ${doc}`);
  assert(read(doc).trim().length > 100, `Documentation file is unexpectedly empty: ${doc}`);
}

const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
assert(sameSet(contract.themeRequiredFields, themeSchema.required ?? []), "Theme required-field documentation contract drifted from schema");
assert(sameSet(contract.componentRequiredFields, componentSchema.required ?? []), "Component required-field documentation contract drifted from schema");
assert(sameSet(contract.manifestRequiredFields, manifestSchema.required ?? []), "Manifest required-field documentation contract drifted from schema");

const themes = read("docs/authoring/THEMES.md");
for (const field of contract.themeRequiredFields) assert(themes.includes(`\`${field}\``), `Theme guide does not document required field: ${field}`);
const components = read("docs/authoring/COMPONENTS.md");
for (const field of contract.componentRequiredFields) assert(components.includes(`\`${field}\``), `Component guide does not document required field: ${field}`);

for (const [doc, refs] of Object.entries(contract.requiredReferences)) {
  const text = read(doc);
  for (const ref of refs) assert(text.includes(ref), `${doc} missing required reference: ${ref}`);
}

const allDocs = contract.documents.map(read).join("\n");
const commands = [...allDocs.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((m) => m[1]);
for (const command of new Set(commands)) {
  assert(pkg.scripts?.[command], `Documentation references missing package script: npm run ${command}`);
}

for (const forbidden of ["packages/adapter-web/src/button.mjs", "gui.framework.generated.internal.GuiThemeId"]) {
  assert(!allDocs.includes(forbidden), `Documentation encourages private/deep API usage: ${forbidden}`);
}

console.log(`Documentation contract OK: ${contract.documents.length} documents, ${new Set(commands).size} npm commands verified.`);
