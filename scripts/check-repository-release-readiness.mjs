// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function validatePublicationLock(plan) {
  assert.equal(plan.publicationLock?.state, "locked", "publication must remain locked during readiness checks");
  assert.equal(plan.publicationLock?.registryCoordinates, "unbound", "registry coordinates must remain unbound");
  assert.equal(plan.publicationLock?.requiresSecurityReadinessReview, true);
  assert.equal(plan.publicationLock?.requiresProtectedDefaultBranch, true);
  assert.equal(plan.publicationLock?.requiresExplicitReleaseApproval, true);
  assert.equal(plan.releaseTrain?.publicationTrigger, "explicit-approval-only");
  assert.ok(plan.repositorySecurityReadiness, "repositorySecurityReadiness policy is required");
  return plan.repositorySecurityReadiness;
}

export function validateEffectiveBranchRules(rules, policy) {
  assert.ok(Array.isArray(rules), "effective branch rules response must be an array");
  const byType = new Map();
  for (const rule of rules) {
    if (!byType.has(rule.type)) byType.set(rule.type, []);
    byType.get(rule.type).push(rule);
  }

  for (const type of policy.requiredEffectiveRules) {
    assert.ok(byType.has(type), `missing active main rule: ${type}`);
  }

  const pullRequestRules = byType.get("pull_request") ?? [];
  for (const rule of pullRequestRules) {
    assert.equal(
      rule.parameters?.required_approving_review_count,
      policy.requiredApprovingReviewCount,
      "main pull-request rule must preserve the single-maintainer review profile",
    );
  }

  const statusRules = byType.get("required_status_checks") ?? [];
  const contexts = new Set(
    statusRules.flatMap((rule) => rule.parameters?.required_status_checks ?? []).map((check) => check.context),
  );
  for (const context of policy.requiredStatusChecks) {
    assert.ok(contexts.has(context), `missing required main status check: ${context}`);
  }
  for (const rule of statusRules) {
    assert.equal(
      rule.parameters?.strict_required_status_checks_policy,
      policy.strictRequiredStatusChecksPolicy,
      "main required-status-check policy must remain loose to avoid redundant rebuilds",
    );
  }
}

export function validatePrivateVulnerabilityReporting(status, policy) {
  assert.equal(status?.enabled, policy.privateVulnerabilityReporting, "Private Vulnerability Reporting must be enabled");
}

export function validateSecurityWorkflow(workflow, successfulRuns, candidateSha, policy) {
  assert.equal(workflow?.path, policy.requiredCodeScanningWorkflow, "unexpected CodeQL workflow path");
  assert.equal(workflow?.state, "active", `${policy.requiredCodeScanningWorkflow} must be enabled`);
  assert.ok(
    successfulRuns.some((run) => run.head_sha === candidateSha && run.conclusion === "success"),
    `CodeQL Security must have a successful run for candidate commit ${candidateSha}`,
  );
}

export function validateNoOpenAlerts(alerts, label) {
  assert.ok(Array.isArray(alerts), `${label} response must be an array`);
  assert.equal(alerts.length, 0, `${label} has open alerts`);
}

function repositoryParts(repository) {
  const match = /^([^/]+)\/([^/]+)$/.exec(repository ?? "");
  assert.ok(match, "GITHUB_REPOSITORY must be owner/repo");
  return { owner: match[1], repo: match[2] };
}

async function githubRequest({ apiUrl, token, owner, repo }, path) {
  const response = await fetch(`${apiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${path}`, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "gui-framework-release-readiness",
      "X-GitHub-Api-Version": "2026-03-10",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = "";
    try {
      message = JSON.parse(text)?.message ?? "";
    } catch {
      message = text.slice(0, 200);
    }
    throw new Error(`GitHub API ${path} returned HTTP ${response.status}${message ? `: ${message}` : ""}`);
  }
  return text ? JSON.parse(text) : null;
}

async function recordCheck(checks, name, operation) {
  try {
    const detail = await operation();
    checks.push({ name, ok: true, detail: detail ?? "OK" });
  } catch (error) {
    checks.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

function renderSummary(checks, candidateSha) {
  const passed = checks.filter((check) => check.ok).length;
  const lines = [
    "# Repository release-readiness audit",
    "",
    `Candidate commit: \`${candidateSha}\``,
    "",
    ...checks.map((check) => `- ${check.ok ? "PASS" : "FAIL"} — **${check.name}**: ${check.detail}`),
    "",
    `Result: **${passed}/${checks.length} checks passed**.`,
    "",
    "This audit is read-only. It cannot bind registry coordinates, create a release, publish artifacts, or grant release approval.",
  ];
  return lines.join("\n");
}

export async function runLiveReadiness(environment = process.env) {
  const token = environment.GITHUB_TOKEN;
  const repository = environment.GITHUB_REPOSITORY;
  const candidateSha = environment.GITHUB_SHA;
  const apiUrl = environment.GITHUB_API_URL || "https://api.github.com";
  assert.ok(token, "GITHUB_TOKEN is required");
  assert.match(candidateSha ?? "", /^[0-9a-f]{40}$/i, "GITHUB_SHA must be a full commit SHA");
  const { owner, repo } = repositoryParts(repository);
  const client = { apiUrl, token, owner, repo };
  const plan = JSON.parse(await readFile("distribution/artifacts.json", "utf8"));
  const policy = validatePublicationLock(plan);
  const checks = [];

  let repositoryMetadata;
  let defaultBranch;
  let branch;
  await recordCheck(checks, "candidate is current default-branch head", async () => {
    repositoryMetadata = await githubRequest(client, "");
    defaultBranch = repositoryMetadata.default_branch;
    assert.equal(defaultBranch, policy.defaultBranch, `default branch must remain ${policy.defaultBranch}`);
    branch = await githubRequest(client, `/branches/${encodeURIComponent(defaultBranch)}`);
    assert.equal(branch.commit?.sha, candidateSha, "workflow must run against the current default-branch head");
    assert.equal(branch.protected, true, "default branch is not protected by an active rule/protection");
    return `${defaultBranch} @ ${candidateSha.slice(0, 12)} is protected`;
  });

  await recordCheck(checks, "effective main ruleset profile", async () => {
    const branchName = defaultBranch || policy.defaultBranch;
    const rules = await githubRequest(client, `/rules/branches/${encodeURIComponent(branchName)}?per_page=100`);
    validateEffectiveBranchRules(rules, policy);
    return `${policy.requiredEffectiveRules.length} required effective rule types are active`;
  });

  await recordCheck(checks, "Private Vulnerability Reporting", async () => {
    const status = await githubRequest(client, "/private-vulnerability-reporting");
    validatePrivateVulnerabilityReporting(status, policy);
    return "enabled";
  });

  await recordCheck(checks, "maintained Advanced CodeQL path", async () => {
    const workflowName = policy.requiredCodeScanningWorkflow.split("/").at(-1);
    const workflow = await githubRequest(client, `/actions/workflows/${encodeURIComponent(workflowName)}`);
    const branchName = defaultBranch || policy.defaultBranch;
    const runs = await githubRequest(
      client,
      `/actions/workflows/${workflow.id}/runs?branch=${encodeURIComponent(branchName)}&status=success&per_page=100`,
    );
    validateSecurityWorkflow(workflow, runs.workflow_runs ?? [], candidateSha, policy);
    return `active and green for ${candidateSha.slice(0, 12)}`;
  });

  if (policy.requireNoOpenCodeScanningAlerts) {
    await recordCheck(checks, "Code Scanning alerts", async () => {
      const branchName = defaultBranch || policy.defaultBranch;
      const alerts = await githubRequest(
        client,
        `/code-scanning/alerts?state=open&ref=${encodeURIComponent(`refs/heads/${branchName}`)}&per_page=1`,
      );
      validateNoOpenAlerts(alerts, "Code Scanning");
      return "0 open";
    });
  }

  if (policy.requireNoOpenDependabotAlerts) {
    await recordCheck(checks, "Dependabot alerts", async () => {
      const alerts = await githubRequest(client, "/dependabot/alerts?state=open&per_page=1");
      validateNoOpenAlerts(alerts, "Dependabot");
      return "0 open";
    });
  }

  const summary = renderSummary(checks, candidateSha);
  console.log(summary);
  if (environment.GITHUB_STEP_SUMMARY) {
    await appendFile(environment.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  const failures = checks.filter((check) => !check.ok);
  if (failures.length > 0) {
    throw new Error(`Repository release-readiness audit failed: ${failures.length} of ${checks.length} checks failed`);
  }
  return checks;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLiveReadiness().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
