// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const workflowsDir = ".github/workflows";
const workflowFiles = (await readdir(workflowsDir))
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

assert.ok(workflowFiles.length > 0, "no GitHub Actions workflows found");

let remoteUses = 0;

for (const fileName of workflowFiles) {
  const filePath = path.join(workflowsDir, fileName);
  const lines = (await readFile(filePath, "utf8")).split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#\s*(.+))?\s*$/);
    if (!match) continue;

    const reference = match[1];
    const versionComment = match[2]?.trim() ?? "";

    if (reference.startsWith("./") || reference.startsWith("docker://")) continue;

    const at = reference.lastIndexOf("@");
    assert.ok(at > 0, `${filePath}:${index + 1}: remote action reference must include @<commit>`);
    const actionPath = reference.slice(0, at);
    const revision = reference.slice(at + 1);

    assert.match(actionPath, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?$/, `${filePath}:${index + 1}: unsupported remote action syntax`);
    assert.match(revision, /^[0-9a-f]{40}$/, `${filePath}:${index + 1}: remote actions must be pinned to a full-length commit SHA`);
    assert.match(versionComment, /^v\d+(?:\.\d+){0,2}(?:[-+][A-Za-z0-9_.-]+)?$/, `${filePath}:${index + 1}: pinned actions must retain a same-line version comment for Dependabot`);
    remoteUses += 1;
  }
}

assert.ok(remoteUses > 0, "no remote GitHub Actions references were validated");
console.log(`GitHub Actions pinning contract passed for ${remoteUses} remote uses.`);
