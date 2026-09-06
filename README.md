# GUI Framework

GUI Framework is a renderer-neutral GUI system focused on clear, high-performance, strongly differentiated visual themes without coupling product code to one rendering engine.

The project defines semantic components, theme/palette contracts, capability fallbacks and generated adapter output for Web and Compose Multiplatform / Android. Browser extensions, desktop applications, Android applications, Python hosts and Web applications are first-class integration targets.

## Design goals

- clear, sharp, elegant interfaces with a recognizable visual identity;
- six initial theme families: Basic, Modern, Glass, Frosted Glass, Spacey and Cyberpunk;
- palettes independent from theme structure;
- practical host-native behavior rather than recreating mature platform systems;
- necessary micro-interactions only, with decorative motion disabled by default;
- explicit capability fallback for expensive or unavailable effects;
- performance budgets, accessibility and representative runtime validation as completion gates;
- renderer-neutral semantic/theme contracts that remain reusable across projects.

## Architecture

Primary roles:

- **Neutral specification:** source of truth for semantic component contracts, themes, palettes, tokens, assets and capabilities.
- **Web adapter:** generated CSS/assets/contracts plus native DOM interaction adapters.
- **Compose adapter:** generated Kotlin contracts/tokens/visual recipes/assets plus Foundation Compose controls.
- **Integration kits:** thin host-context boundaries for browser extensions, desktop, Android, Python and Web applications.
- **Skia:** optional advanced rendering and shader effects where supported and worthwhile.
- **Capability fallbacks:** themes must remain usable when advanced effects are unavailable or intentionally disabled.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical model, [PUBLIC_API.md](PUBLIC_API.md) for the stable consumer boundary, [MIGRATION_POLICY.md](MIGRATION_POLICY.md) for compatibility/versioning rules, [docs/README.md](docs/README.md) for authoring and quality guides, and [ROADMAP.md](ROADMAP.md) for implementation status.

## Status

The component/theme foundations, six initial theme families, extended component set, Web/Compose references, Phase 7 integration kits, and Phase 8 distribution/ecosystem contracts are implemented. Phase 9 now hardens the promised artifacts as real locally consumable npm/Maven/PyPI/archive outputs before any registry coordinate or release approval is introduced. Registry publication remains locked and requires explicit human release approval; see [DISTRIBUTION.md](DISTRIBUTION.md).

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [LICENSE_POLICY.md](LICENSE_POLICY.md).
