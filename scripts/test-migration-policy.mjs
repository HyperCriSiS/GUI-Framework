// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const policy = JSON.parse(await readFile("api/migration-policy.json", "utf8"));
const api = JSON.parse(await readFile("api/public-api.json", "utf8"));
const distribution = JSON.parse(await readFile("distribution/artifacts.json", "utf8"));

assert.equal(policy.schemaVersion, 1);
assert.equal(policy.policyVersion, 1);
assert.equal(policy.versioning.scheme, "semver");
assert.equal(policy.versioning.releaseTrain, "unified");
assert.match(policy.versioning.pre1Behavior, /does not waive migration requirements/);
assert.deepEqual(policy.compatibilityDimensions, ["source", "binary", "behavior"]);

assert.equal(policy.changeClasses.patch.apiSnapshotChange, false);
assert.equal(policy.changeClasses.minor.apiSnapshotChange, "additive-only");
assert.equal(policy.changeClasses.major.apiSnapshotChange, "breaking");
assert.equal(policy.changeClasses.minor.requiresMigrationNoteWhenSourceImpactExists, true);
assert.ok(policy.changeClasses.major.includes.length >= 6);

assert.equal(policy.generatedContracts.publicPackage, "gui.framework.generated.api");
assert.equal(policy.generatedContracts.internalPackage, "gui.framework.generated.internal");
assert.equal(policy.generatedContracts.enumValueAddition, "minor-with-source-impact");
assert.deepEqual(policy.migrationRecord.requiredFor, ["major", "minor-with-source-impact", "security-compatibility-waiver"]);
assert.equal(policy.generatedContracts.enumValueRemovalOrRename, "major");
assert.equal(policy.deprecation.requiredBeforePublicRemoval, true);
assert.ok(policy.deprecation.minimumReleasedMinorVersions >= 1);
assert.equal(policy.deprecation.removalBoundary, "next-major-or-later");
assert.equal(policy.deprecation.securityExceptionRequiresWaiver, true);

assert.equal(policy.migrationRecord.directory, "migrations");
assert.equal(policy.migrationRecord.filePattern, "v<from>-to-v<to>.md");
assert.deepEqual(policy.migrationRecord.requiredSections, [
  "Summary",
  "Affected public surface",
  "Compatibility impact",
  "Migration steps",
  "Validation",
]);

assert.equal(policy.releaseGate.publicApiSnapshot, "api/public-api.json");
assert.equal(policy.releaseGate.publicationPlan, "distribution/artifacts.json");
assert.equal(policy.releaseGate.publicationMustRemainExplicitApprovalOnly, true);
assert.equal(policy.releaseGate.automaticRegistryPublication, false);
assert.equal(api.status, "stable-boundary");
assert.equal(api.publicationState, "locked");
assert.equal(distribution.releaseTrain.mode, policy.versioning.releaseTrain);
assert.equal(distribution.releaseTrain.publicationTrigger, "explicit-approval-only");
assert.equal(distribution.publicationLock.state, "locked");
assert.ok(distribution.publicationLock.requiresRoadmapGates.includes("versioned-migration-policy"));

const documentation = await readFile("MIGRATION_POLICY.md", "utf8");
for (const phrase of [
  "source",
  "binary",
  "behavioral",
  "minor with source impact",
  "next major release",
  "security compatibility waiver",
  "No CI workflow may automatically publish registry artifacts",
]) {
  assert.ok(documentation.includes(phrase), `migration policy documentation must contain: ${phrase}`);
}

const migrationsReadme = await readFile("migrations/README.md", "utf8");
for (const section of policy.migrationRecord.requiredSections) {
  assert.ok(migrationsReadme.includes(`## ${section}`), `migration template guidance missing ${section}`);
}

console.log("Versioned migration policy contract tests passed.");
