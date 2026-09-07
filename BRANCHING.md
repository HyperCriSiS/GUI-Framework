# Branching workflow

`main` is the single long-lived product and integration branch.

Themes, renderers, widgets, platform backends and other framework modules belong in the code/module structure, not in permanent Git branches.

Use one short-lived branch per logical change / pull request:

- `feature/<name>`
- `fix/<name>`
- `refactor/<name>`
- `test/<name>`
- `docs/<name>`
- `chore/<name>`
- `hotfix/<name>`
- `release/<version>` only for temporary release stabilization

Do not create permanent `dev`, `staging`, module, subsystem, theme, or feature branches. Branch from the current `main`, merge back into `main`, then delete the branch.

Stacked pull requests are acceptable only for genuine temporary dependencies. The authoritative roadmap and architecture planning must live on `main`. Mark releases with Git tags rather than permanent release branches.

## Repository enforcement for `main`

Before the first public release, GitHub must enforce the workflow above with a branch protection rule or repository ruleset targeting `main`.

Minimum configuration:

- require changes to reach `main` through a pull request,
- require the `validate-and-typecheck` status check from **Core CI**,
- block force pushes and branch deletion,
- keep any administrator bypass as an explicit emergency path rather than the normal merge flow,
- do not globally require path-filtered specialist checks that are intentionally absent on unrelated pull requests; when those workflows run, they must still be green before merge, and
- do not configure a mandatory external approval count that a single-maintainer repository cannot satisfy. If additional maintainers are added, review requirements can be raised deliberately.

Requiring the branch to be fully up to date with `main` before every merge is optional rather than a baseline requirement because it can force duplicate CI runs. The stable mandatory gate is `validate-and-typecheck`; change-scoped packaging, documentation, API, migration, browser, Android and other specialist gates remain additive evidence when applicable.
