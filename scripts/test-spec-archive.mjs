import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { compileSpecification } from "../packages/compiler/src/index.mjs";

const root = process.cwd();
const packaging = JSON.parse(fs.readFileSync(path.join(root, "distribution/packaging.json"), "utf8"));
const distribution = JSON.parse(fs.readFileSync(path.join(root, "distribution/artifacts.json"), "utf8"));
const prefix = `gui-framework-spec-${packaging.developmentVersion}`;
const archive = path.join(root, packaging.stagingRoot, "spec", `${prefix}.tar.gz`);
assert.ok(fs.existsSync(archive), "Specification source archive is missing");
assert.equal(distribution.publicationLock.state, "locked");
assert.equal(distribution.artifacts.find(({ id }) => id === "spec-source")?.registryName, null);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gui-spec-archive-"));
try {
  execFileSync("tar", ["-xzf", archive, "-C", temp], { stdio: "inherit" });
  const extractedRoot = path.join(temp, prefix);
  const extractedSpec = path.join(extractedRoot, "spec");
  assert.ok(fs.existsSync(path.join(extractedRoot, "LICENSE")), "Archive does not contain LICENSE");
  assert.ok(fs.existsSync(path.join(extractedSpec, "manifest.json")), "Archive does not contain spec/manifest.json");

  const listFiles = (base) => {
    const out = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) out.push(path.relative(base, full).replaceAll(path.sep, "/"));
        else throw new Error(`Unsupported archive entry type: ${full}`);
      }
    };
    walk(base);
    return out.sort();
  };

  const expected = ["LICENSE", ...listFiles(path.join(root, "spec")).map((file) => `spec/${file}`)].sort();
  assert.deepEqual(listFiles(extractedRoot), expected, "Specification archive file set differs from source contract");

  for (const file of listFiles(extractedSpec).filter((file) => file.endsWith(".json"))) {
    JSON.parse(fs.readFileSync(path.join(extractedSpec, file), "utf8"));
  }

  const sourceIr = await compileSpecification({ specRoot: path.join(root, "spec") });
  const archivedIr = await compileSpecification({ specRoot: extractedSpec });
  assert.deepEqual(archivedIr, sourceIr, "Extracted specification compiles to different neutral IR");
  console.log(`Specification archive smoke OK: ${expected.length} files round-trip to identical compiled IR.`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
