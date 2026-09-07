// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const plan = JSON.parse(await readFile("distribution/artifacts.json", "utf8"));
assert.equal(plan.schemaVersion, 1);
assert.equal(plan.releaseTrain.mode, "unified");
assert.equal(plan.releaseTrain.versionSource, "git-tag");
assert.equal(plan.releaseTrain.publicationTrigger, "explicit-approval-only");
assert.equal(plan.publicationLock.state, "locked");
assert.equal(plan.publicationLock.registryCoordinates, "unbound");
assert.equal(plan.publicationLock.requiresSecurityReadinessReview, true);
assert.equal(plan.publicationLock.securityPolicy, "SECURITY.md");
assert.equal(plan.publicationLock.requiresNamespaceOwnershipVerification, true);
assert.equal(plan.publicationLock.requiresExplicitReleaseApproval, true);
assert.deepEqual(plan.publicationLock.requiresRoadmapGates, [
  "stable-public-api-surface",
  "versioned-migration-policy",
]);

assert.ok(Array.isArray(plan.artifacts) && plan.artifacts.length >= 10);
const ids = plan.artifacts.map((artifact) => artifact.id);
assert.equal(new Set(ids).size, ids.length, "distribution artifact ids must be unique");

const ecosystems = new Set(plan.artifacts.map((artifact) => artifact.ecosystem));
for (const ecosystem of ["github-release", "npm", "maven-central", "pypi"]) {
  assert.ok(ecosystems.has(ecosystem), `missing distribution ecosystem: ${ecosystem}`);
}

for (const artifact of plan.artifacts) {
  assert.match(artifact.id, /^[a-z][a-z0-9-]*$/);
  assert.equal(typeof artifact.logicalName, "string");
  assert.ok(artifact.logicalName.length > 0);
  assert.equal(artifact.registryName, null, `${artifact.id} must remain registry-unbound while locked`);
  await access(artifact.sourcePath);
}

const npmDevelopmentManifests = [
  "packages/core/package.json",
  "packages/compiler/package.json",
  "packages/adapter-web/package.json",
  "packages/integration-browser-extension/package.json",
];
for (const path of npmDevelopmentManifests) {
  const manifest = JSON.parse(await readFile(path, "utf8"));
  assert.equal(manifest.private, true, `${path} must stay private before publication unlock`);
  assert.equal(manifest.version, "0.0.0-development", `${path} must stay on development version`);
}

const pythonProject = await readFile("packages/integration-python/pyproject.toml", "utf8");
assert.match(pythonProject, /version\s*=\s*"0\.0\.0"/);
assert.match(pythonProject, /AGPL-3.0-or-later/);

const license = await readFile("LICENSE", "utf8");
assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
assert.match(license, /Version 3/);

const securityPolicy = await readFile(plan.publicationLock.securityPolicy, "utf8");
assert.match(securityPolicy, /Private Vulnerability Reporting/);
assert.match(securityPolicy, /Dependabot Security Alerts/);
assert.match(securityPolicy, /Code Scanning/);

const strategy = await readFile("DISTRIBUTION.md", "utf8");
assert.match(strategy, /Stable public API surface/);
assert.match(strategy, /Versioned migration policy/);
assert.match(strategy, /must never publish a registry artifact/);
assert.match(strategy, /registry coordinates remain unbound/);
assert.match(strategy, /security readiness review/i);
assert.match(strategy, /SECURITY\.md/);

console.log("Distribution/publication strategy contract tests passed.");
