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
assert.equal(plan.publicationLock.requiresProtectedDefaultBranch, true);
assert.equal(plan.publicationLock.requiresNamespaceOwnershipVerification, true);
assert.equal(plan.publicationLock.requiresExplicitReleaseApproval, true);
assert.deepEqual(plan.repositorySecurityReadiness, {
  defaultBranch: "main",
  requiredEffectiveRules: ["deletion", "pull_request", "required_status_checks", "non_fast_forward"],
  requiredStatusChecks: ["validate-and-typecheck"],
  strictRequiredStatusChecksPolicy: false,
  requiredApprovingReviewCount: 0,
  privateVulnerabilityReporting: true,
  requiredCodeScanningWorkflow: ".github/workflows/codeql-security.yml",
  requireNoOpenCodeScanningAlerts: true,
  requireNoOpenDependabotAlerts: true,
});
assert.deepEqual(plan.publicationLock.requiresRoadmapGates, [
  "stable-public-api-surface",
  "versioned-migration-policy",
]);
assert.equal(plan.releaseApprovalPolicy.recordRequired, true);
assert.deepEqual(plan.releaseApprovalPolicy.candidateIdentity, [
  "version",
  "sourceCommit",
  "releaseManifestSha256",
  "sha256SumsSha256",
]);
assert.equal(plan.releaseApprovalPolicy.approvalScope, "single-candidate");
assert.equal(plan.releaseApprovalPolicy.candidateMutationRequiresReapproval, true);
assert.equal(plan.releaseApprovalPolicy.releaseTagMustResolveToApprovedCommit, true);
assert.equal(plan.releaseApprovalPolicy.publishedVersionReuse, "forbidden");
assert.equal(plan.releaseApprovalPolicy.rollbackMode, "withdraw-or-new-version");

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
assert.match(securityPolicy, /default branch must be protected/i);
assert.match(securityPolicy, /Private Vulnerability Reporting/);
assert.match(securityPolicy, /Dependabot Security Alerts/);
assert.match(securityPolicy, /Code Scanning/);

const branchingPolicy = await readFile("BRANCHING.md", "utf8");
assert.match(branchingPolicy, /require changes to reach `main` through a pull request/i);
assert.match(branchingPolicy, /validate-and-typecheck/);
assert.match(branchingPolicy, /block force pushes and branch deletion/i);
assert.match(branchingPolicy, /fully up to date with `main` before every merge is optional/i);

const distributionWorkflow = await readFile(".github/workflows/distribution-strategy-ci.yml", "utf8");
const distributionContractInputs = [
  "BRANCHING.md",
  "DISTRIBUTION.md",
  "SECURITY.md",
  "LICENSE",
  "distribution/**",
  "packages/core/package.json",
  "packages/compiler/package.json",
  "packages/adapter-web/package.json",
  "packages/integration-browser-extension/package.json",
  "packages/integration-python/pyproject.toml",
  "scripts/check-repository-release-readiness.mjs",
  "scripts/test-repository-release-readiness.mjs",
  "scripts/test-distribution-strategy.mjs",
  ".github/workflows/distribution-strategy-ci.yml",
];
for (const path of distributionContractInputs) {
  const marker = `- "${path}"`;
  assert.equal(
    distributionWorkflow.split(marker).length - 1,
    2,
    `${path} must trigger Distribution Strategy CI on both push and pull_request`,
  );
}

const strategy = await readFile("DISTRIBUTION.md", "utf8");
assert.match(strategy, /Stable public API surface/);
assert.match(strategy, /Versioned migration policy/);
assert.match(strategy, /must never publish a registry artifact/);
assert.match(strategy, /registry coordinates remain unbound/);
assert.match(strategy, /security readiness review/i);
assert.match(strategy, /SECURITY\.md/);
assert.match(strategy, /single-candidate/i);
assert.match(strategy, /exact source commit SHA/i);
assert.match(strategy, /release-manifest\.json/);
assert.match(strategy, /SHA256SUMS/);
assert.match(strategy, /must never be overwritten or republished/i);
assert.match(strategy, /release tag `v<semver>` must resolve to the approved source commit/i);

console.log("Distribution/publication strategy contract tests passed.");
