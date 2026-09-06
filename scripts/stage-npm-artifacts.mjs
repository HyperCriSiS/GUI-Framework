import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const copyFile = (from, to) => {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
};
const copyTree = (from, to, { filter = () => true } = {}) => {
  fs.cpSync(from, to, {
    recursive: true,
    filter(source) {
      const relative = path.relative(from, source).replace(/\\/g, "/");
      return relative === "" || filter(relative, source);
    },
  });
};

const distribution = readJson("distribution/artifacts.json");
const packaging = readJson("distribution/packaging.json");
assert(distribution.publicationLock?.state === "locked", "npm staging must not run with publication unlocked");

const stagingRoot = path.join(root, packaging.stagingRoot, "npm");
fs.rmSync(stagingRoot, { recursive: true, force: true });
ensureDir(stagingRoot);

const coreBuild = path.join(root, "build/package-inputs/core");
assert(fs.existsSync(path.join(coreBuild, "index.js")), "Core release JS is missing; run the core release build before npm staging");
assert(fs.existsSync(path.join(coreBuild, "index.d.ts")), "Core declaration output is missing; run the core release build before npm staging");

const npmArtifacts = distribution.artifacts.filter((artifact) => artifact.ecosystem === "npm");
const staged = [];

for (const artifact of npmArtifacts) {
  const contract = packaging.artifacts[artifact.id];
  assert(contract?.strategy === "npm", `Missing npm packaging contract for ${artifact.id}`);
  const packageRoot = path.join(root, contract.packageRoot);
  const sourceManifest = readJson(path.relative(root, path.join(packageRoot, "package.json")));
  assert(sourceManifest.private === true, `${artifact.id} source manifest must stay private`);
  assert(sourceManifest.version === packaging.developmentVersion, `${artifact.id} source manifest must stay on the development version`);

  const output = path.join(stagingRoot, artifact.id, "package");
  ensureDir(output);
  copyFile(path.join(root, "LICENSE"), path.join(output, "LICENSE"));
  const readme = path.join(packageRoot, "README.md");
  if (fs.existsSync(readme)) copyFile(readme, path.join(output, "README.md"));

  const manifest = {
    ...sourceManifest,
    name: artifact.logicalName,
    version: packaging.developmentVersion,
    private: true,
    license: "AGPL-3.0-or-later",
  };

  switch (artifact.id) {
    case "core-js": {
      copyTree(coreBuild, path.join(output, "dist"));
      manifest.type = "module";
      manifest.types = "./dist/index.d.ts";
      manifest.exports = {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
          default: "./dist/index.js"
        }
      };
      manifest.sideEffects = false;
      break;
    }
    case "spec-compiler-js": {
      copyTree(path.join(packageRoot, "src"), path.join(output, "src"));
      break;
    }
    case "web-adapter-js": {
      copyTree(path.join(packageRoot, "src"), path.join(output, "src"), {
        filter(relative) {
          return !/^generate-.*\.mjs$/.test(path.basename(relative));
        },
      });
      break;
    }
    case "browser-extension-integration-js": {
      copyFile(path.join(packageRoot, "src/index.mjs"), path.join(output, "src/index.mjs"));
      break;
    }
    case "web-application-integration-js": {
      const source = fs.readFileSync(path.join(packageRoot, "src/index.mjs"), "utf8");
      const rewritten = source.replace(
        'from "../../adapter-web/src/capabilities.mjs"',
        'from "./internal/web-capabilities.mjs"',
      );
      assert(rewritten !== source, "Web application staging did not replace the monorepo capability import");
      ensureDir(path.join(output, "src/internal"));
      fs.writeFileSync(path.join(output, "src/index.mjs"), rewritten);
      copyFile(
        path.join(root, "packages/adapter-web/src/capabilities.mjs"),
        path.join(output, "src/internal/web-capabilities.mjs"),
      );
      break;
    }
    case "host-context-js": {
      copyTree(path.join(packageRoot, "src"), path.join(output, "src"));
      break;
    }
    default:
      throw new Error(`Unsupported npm artifact staging strategy: ${artifact.id}`);
  }

  fs.writeFileSync(path.join(output, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  staged.push({ id: artifact.id, logicalName: artifact.logicalName, directory: path.relative(root, output).replace(/\\/g, "/") });
}

const manifestPath = path.join(stagingRoot, "staged-packages.json");
fs.writeFileSync(manifestPath, `${JSON.stringify({ schemaVersion: 1, packages: staged }, null, 2)}\n`);
console.log(`Staged ${staged.length} npm artifacts under ${path.relative(root, stagingRoot)}.`);
