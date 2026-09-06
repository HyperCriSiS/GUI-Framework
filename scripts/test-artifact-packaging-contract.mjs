import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const distribution = readJson("distribution/artifacts.json");
const packaging = readJson("distribution/packaging.json");

assert(distribution.schemaVersion === 1, "Unsupported distribution artifact schema");
assert(packaging.schemaVersion === 1, "Unsupported artifact packaging schema");
assert(distribution.publicationLock?.state === "locked", "Packaging validation must not unlock publication");
assert(distribution.publicationLock?.registryCoordinates === "unbound", "Registry coordinates must stay unbound during pre-release hardening");
assert(packaging.stagingRoot.startsWith("build/"), "Release staging must remain build output, not committed source");
assert(packaging.developmentVersion === "0.0.0-development", "Packaging contract must use the development release-train version");

const expectedStrategy = new Map([
  ["github-release", "archive"],
  ["npm", "npm"],
  ["maven-central", "maven"],
  ["pypi", "pypi"],
]);

const distributionIds = distribution.artifacts.map((artifact) => artifact.id).sort();
const packagingIds = Object.keys(packaging.artifacts).sort();
assert(
  JSON.stringify(distributionIds) === JSON.stringify(packagingIds),
  `Packaging artifact IDs must exactly match distribution/artifacts.json\nDistribution: ${distributionIds.join(", ")}\nPackaging: ${packagingIds.join(", ")}`,
);

for (const artifact of distribution.artifacts) {
  assert(artifact.registryName === null, `${artifact.id} must not bind a public registry name during pre-release hardening`);
  const contract = packaging.artifacts[artifact.id];
  assert(contract && typeof contract === "object", `Missing packaging contract for ${artifact.id}`);
  assert(contract.strategy === expectedStrategy.get(artifact.ecosystem), `${artifact.id} strategy does not match ecosystem ${artifact.ecosystem}`);
  assert(typeof contract.packageRoot === "string" && contract.packageRoot.trim() !== "", `${artifact.id} packageRoot must be non-empty`);

  const packageRoot = path.join(root, contract.packageRoot);
  assert(fs.existsSync(packageRoot), `${artifact.id} packageRoot does not exist: ${contract.packageRoot}`);

  const sourcePath = artifact.sourcePath;
  assert(typeof sourcePath === "string" && sourcePath.trim() !== "", `${artifact.id} sourcePath must be non-empty`);
  assert(fs.existsSync(path.join(root, sourcePath)), `${artifact.id} sourcePath does not exist: ${sourcePath}`);
  const rootPrefix = `${contract.packageRoot.replace(/\\/g, "/")}/`;
  const sourceNormalized = sourcePath.replace(/\\/g, "/");
  assert(
    sourceNormalized === contract.packageRoot || sourceNormalized.startsWith(rootPrefix),
    `${artifact.id} sourcePath must be inside packageRoot (${sourcePath} vs ${contract.packageRoot})`,
  );

  if (contract.strategy === "npm") {
    const packageJsonPath = path.join(packageRoot, "package.json");
    assert(fs.existsSync(packageJsonPath), `${artifact.id} npm packageRoot must contain package.json`);
    const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    assert(manifest.private === true, `${artifact.id} development npm manifest must remain private`);
    assert(manifest.version === "0.0.0-development", `${artifact.id} development npm version must remain locked`);
    assert(manifest.name === artifact.logicalName, `${artifact.id} npm logical name drifted from distribution contract`);
  }
}

console.log(`Artifact packaging contract OK: ${distributionIds.length} artifact roots mapped with publication locked.`);
