// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const workflowsDir = ".github/workflows";
const workflowFiles = (await readdir(workflowsDir))
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const selfTriggered = new Map([
  ["artifact-packaging-ci.yml", 2],
  ["codeql-security.yml", 1],
  ["distribution-strategy-ci.yml", 2],
  ["documentation-contract-ci.yml", 2],
  ["host-context-presets-ci.yml", 2],
  ["migration-policy-ci.yml", 2],
  ["public-api-ci.yml", 2],
  ["python-integration-ci.yml", 2],
  ["web-application-integration-ci.yml", 2],
]);

const universalPullRequest = new Set(["core-ci.yml", "showcase-contract.yml"]);
const manualOnly = new Set(["release-candidate-dry-run.yml"]);

const classified = [...selfTriggered.keys(), ...universalPullRequest, ...manualOnly].sort();
assert.deepEqual(
  workflowFiles,
  classified,
  "every workflow must be classified by the trigger contract when it is added or removed",
);

const contents = new Map();
for (const fileName of workflowFiles) {
  contents.set(fileName, await readFile(path.join(workflowsDir, fileName), "utf8"));
}

for (const [fileName, minimumSelfReferences] of selfTriggered) {
  const content = contents.get(fileName);
  const ownPath = `.github/workflows/${fileName}`;
  const occurrences = content.split(ownPath).length - 1;
  assert.ok(
    occurrences >= minimumSelfReferences,
    `${fileName}: expected at least ${minimumSelfReferences} self-trigger path references to ${ownPath}, found ${occurrences}`,
  );
  assert.match(content, /^\s*pull_request:\s*$/m, `${fileName}: expected pull_request trigger`);
}

const requiredCrossWorkflowInputs = new Map([
  [
    "public-api-ci.yml",
    [
      "distribution/artifacts.json",
      "spec/**",
      "packages/adapter-compose/src/generate-contracts.mjs",
      "packages/adapter-compose/src/generate-tokens.mjs",
      "packages/adapter-compose/src/generate-visuals.mjs",
    ],
  ],
  ["python-integration-ci.yml", ["package.json", "spec/**", "packages/compiler/**"]],
  ["web-application-integration-ci.yml", ["packages/adapter-web/src/capabilities.mjs"]],
]);
for (const [fileName, requiredInputs] of requiredCrossWorkflowInputs) {
  const content = contents.get(fileName);
  for (const input of requiredInputs) {
    const occurrences = content.split(input).length - 1;
    assert.equal(
      occurrences,
      2,
      `${fileName}: ${input} must trigger both push and pull_request (found ${occurrences} references)`,
    );
  }
}

const core = contents.get("core-ci.yml");
assert.match(core, /^\s*pull_request:\s*$/m, "core-ci.yml: pull_request must remain unfiltered");
assert.doesNotMatch(
  core,
  /pull_request:\s*\n\s+paths(?:-ignore)?:/m,
  "core-ci.yml: pull_request must not become path-filtered",
);

const releaseCandidate = contents.get("release-candidate-dry-run.yml");
assert.match(
  releaseCandidate,
  /^on:\s*\n\s+workflow_dispatch:\s*$/m,
  "release-candidate-dry-run.yml must remain manually dispatchable",
);
assert.doesNotMatch(
  releaseCandidate,
  /^\s+(?:push|pull_request|schedule):/m,
  "release-candidate-dry-run.yml must remain manual-only",
);

const artifactPackaging = contents.get("artifact-packaging-ci.yml");
const releaseCandidatePath = ".github/workflows/release-candidate-dry-run.yml";
const rcCoverage = artifactPackaging.split(releaseCandidatePath).length - 1;
assert.ok(
  rcCoverage >= 2,
  "artifact-packaging-ci.yml must validate release-candidate workflow changes on pull_request and push",
);

console.log(
  `Workflow trigger contract passed for ${workflowFiles.length} workflows (${selfTriggered.size} self-triggered, ${universalPullRequest.size} universal PR, ${manualOnly.size} manual-only).`,
);
