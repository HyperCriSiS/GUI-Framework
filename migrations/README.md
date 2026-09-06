# Migration records

Version-to-version consumer migrations live in this directory.

Use the filename `v<from>-to-v<to>.md`. Records required by `api/migration-policy.json` must contain these headings:

- `## Summary`
- `## Affected public surface`
- `## Compatibility impact`
- `## Migration steps`
- `## Validation`

Do not create placeholder migration records for releases with no migration-relevant change.
