# Security Policy

## Supported status

GUI Framework is currently in a pre-release development state. No public registry release is authorized by the repository's distribution policy. Until the first tagged public release, the supported security line is the current `main` branch. After public releases begin, this file must be updated with an explicit supported-version policy.

## Reporting a vulnerability

Do not disclose unpatched vulnerability details in a public issue, discussion, pull request, commit message, or other public channel.

Use GitHub's private **Report a vulnerability** flow when **Private Vulnerability Reporting** is enabled for this repository. If that control is not available, open a public issue containing only `Private security contact requested` and no technical details, exploit material, logs, secrets, or affected-user information. The maintainer can then establish a private channel before details are exchanged.

Include enough information in the private report to reproduce and assess the problem: affected component and version or commit, impact, prerequisites, reproduction steps, and any safe remediation ideas. Do not include real credentials or unrelated personal data.

## Scope

Security reports are in scope when they affect the framework source, generated artifacts, compiler, adapters, integration kits, release-staging tooling, or repository automation. A vulnerability in an application merely using the framework is out of scope unless the framework itself causes or materially enables the issue.

## Repository analysis

The maintained **Code Scanning** path is `.github/workflows/codeql-security.yml`. It uses CodeQL for JavaScript/TypeScript, Python and Java/Kotlin. Java/Kotlin analysis traces the same local Maven artifact build used by the release-staging contract so executable JVM surfaces are actually compiled for analysis. The workflow is scheduled monthly, can be dispatched manually, and only runs on pull requests that modify the CodeQL workflow itself; ordinary framework pull requests do not pay the CodeQL cost.

The CodeQL workflow has `contents: read` and `security-events: write` permissions only. It has no package, release, registry or identity-token permission and does not authorize publication.

## Disclosure

Coordinate disclosure with the maintainer. Public disclosure should follow a fix or an explicit decision that a fix is not required. Security fixes that must break compatibility still follow `MIGRATION_POLICY.md` unless an emergency compatibility waiver is justified and recorded.

## Release security prerequisites

`DISTRIBUTION.md` remains authoritative: publication is locked and a green CI run never authorizes publishing by itself. Before the first public registry release, the repository security posture must be reviewed explicitly. At minimum:

- The default branch must be protected by a GitHub branch protection rule or repository ruleset that requires pull requests and the repository's required CI checks; bypass must be limited to an explicit administrator emergency path.
- **Private Vulnerability Reporting** must be enabled so reporters have a real confidential channel.
- **Dependabot Security Alerts** must be enabled, or an equivalent continuously maintained advisory mechanism must be documented and approved.
- **Code Scanning** / SAST must have a maintained analysis path for the languages that carry executable framework logic, or an explicit risk-based waiver must be documented and approved.
- Secret scanning must show no unresolved release-blocking secret exposure.
- Known dependency advisories must be triaged; unresolved high/critical issues require an explicit release-blocking decision or documented exception.
- The manual read-only **Release Candidate Dry Run** must remain green, including deterministic staging and checksum verification.

These prerequisites do not bind registry coordinates, grant credentials, or relax the existing explicit human release approval.
