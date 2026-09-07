# Project playbook

## Documentation authority

Default branch: `main`.

Project-global current state has a single source of truth on `main`. This includes `ROADMAP.md`, whole-project architecture and public API state, compatibility/distribution policy, release/process policy, project status/priorities, and other management documentation.

Development branches document their own delta, not an independent copy of the project's global state. Appropriate branch-local documentation includes feature/module design, API changes introduced by that branch, migrations, ADRs, branch-specific test specifications, and temporary implementation notes.

A copy of a canonical document on a non-default branch is only a proposed delta and must not be treated as current project state. Operational roadmap/status updates should target `main` promptly; do not maintain a separate roadmap or architecture state on a long-lived side branch.

Before using or changing canonical documentation from a side branch:

1. read the current version from `main`,
2. describe only the branch-specific delta where possible,
3. reconcile canonical-document edits with the latest `main` before merge, and
4. after integration, ensure `main` reflects the resulting project state and remove or condense temporary delta documentation where appropriate.

Do not blindly overwrite newer canonical state from an older branch.
