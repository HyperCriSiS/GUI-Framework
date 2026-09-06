import assert from "node:assert/strict";
import fs from "node:fs";

const distribution = JSON.parse(fs.readFileSync("distribution/artifacts.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/release-candidate-dry-run.yml", "utf8");
assert.equal(distribution.publicationLock.state, "locked");
assert.equal(distribution.publicationLock.registryCoordinates, "unbound");
assert.match(workflow, /workflow_dispatch:/, "RC dry run must be manually dispatched only");
assert.doesNotMatch(workflow, /^\s*push:/m, "RC dry run must not run on push");
assert.doesNotMatch(workflow, /^\s*pull_request:/m, "RC dry run must not run on pull_request");
assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/, "RC dry run must explicitly use read-only contents permission");
for (const forbidden of [
  /packages:\s*write/i,
  /contents:\s*write/i,
  /id-token:\s*write/i,
  /\$\{\{\s*secrets\./i,
  /npm\s+publish/i,
  /mvn(?:\s+[^\n]+)?\s+deploy/i,
  /twine\s+upload/i,
  /gh\s+release\s+create/i,
  /environment:\s*/i,
]) {
  assert.doesNotMatch(workflow, forbidden, `RC dry run contains forbidden publish-capable construct: ${forbidden}`);
}
assert.match(workflow, /npm run test:reproducible-staging/, "RC dry run must execute byte-reproducibility validation");
console.log("Release-candidate dry-run policy OK: manual, read-only, no publication credentials or write scopes.");
