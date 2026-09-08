// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import {
  validateEffectiveBranchRules,
  validateNoOpenAlerts,
  validatePrivateVulnerabilityReporting,
  validatePublicationLock,
  validateSecurityWorkflow,
} from "./check-repository-release-readiness.mjs";

const plan = {
  releaseTrain: { publicationTrigger: "explicit-approval-only" },
  publicationLock: {
    state: "locked",
    registryCoordinates: "unbound",
    requiresSecurityReadinessReview: true,
    requiresProtectedDefaultBranch: true,
    requiresExplicitReleaseApproval: true,
  },
  repositorySecurityReadiness: {
    defaultBranch: "main",
    requiredEffectiveRules: ["deletion", "pull_request", "required_status_checks", "non_fast_forward"],
    requiredStatusChecks: ["validate-and-typecheck"],
    strictRequiredStatusChecksPolicy: false,
    requiredApprovingReviewCount: 0,
    privateVulnerabilityReporting: true,
    requiredCodeScanningWorkflow: ".github/workflows/codeql-security.yml",
    requireNoOpenCodeScanningAlerts: true,
    requireNoOpenDependabotAlerts: true,
  },
};
const policy = validatePublicationLock(plan);

const goodRules = [
  { type: "deletion" },
  { type: "non_fast_forward" },
  { type: "pull_request", parameters: { required_approving_review_count: 0 } },
  {
    type: "required_status_checks",
    parameters: {
      strict_required_status_checks_policy: false,
      required_status_checks: [{ context: "validate-and-typecheck" }],
    },
  },
];
validateEffectiveBranchRules(goodRules, policy);
assert.throws(
  () => validateEffectiveBranchRules(goodRules.filter((rule) => rule.type !== "non_fast_forward"), policy),
  /missing active main rule: non_fast_forward/,
);
assert.throws(
  () =>
    validateEffectiveBranchRules(
      goodRules.map((rule) =>
        rule.type === "required_status_checks"
          ? { ...rule, parameters: { ...rule.parameters, strict_required_status_checks_policy: true } }
          : rule,
      ),
      policy,
    ),
  /must remain loose/,
);
assert.throws(
  () =>
    validateEffectiveBranchRules(
      goodRules.map((rule) =>
        rule.type === "pull_request" ? { ...rule, parameters: { required_approving_review_count: 1 } } : rule,
      ),
      policy,
    ),
  /single-maintainer review profile/,
);

validatePrivateVulnerabilityReporting({ enabled: true }, policy);
assert.throws(() => validatePrivateVulnerabilityReporting({ enabled: false }, policy), /must be enabled/);

const candidateSha = "a".repeat(40);
validateSecurityWorkflow(
  { path: ".github/workflows/codeql-security.yml", state: "active" },
  [{ head_sha: candidateSha, conclusion: "success" }],
  candidateSha,
  policy,
);
assert.throws(
  () =>
    validateSecurityWorkflow(
      { path: ".github/workflows/codeql-security.yml", state: "disabled_manually" },
      [{ head_sha: candidateSha, conclusion: "success" }],
      candidateSha,
      policy,
    ),
  /must be enabled/,
);
assert.throws(
  () => validateSecurityWorkflow({ path: policy.requiredCodeScanningWorkflow, state: "active" }, [], candidateSha, policy),
  /must have a successful run/,
);

validateNoOpenAlerts([], "Code Scanning");
assert.throws(() => validateNoOpenAlerts([{ number: 1 }], "Code Scanning"), /has open alerts/);

console.log("Repository release-readiness contract tests passed.");
