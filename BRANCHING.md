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
