# GUI Framework

A cross-platform GUI framework focused on consistent, high-quality interfaces across desktop, Android, web applications, and browser extensions.

## Project goals

- One coherent component model across supported platforms.
- Six initial visual themes: **Basic**, **Modern**, **Glass**, **Frosted Glass**, **Spacey**, and **Cyberpunk**.
- Strong visual consistency while preserving platform-native interaction, accessibility, input, focus, text handling, and performance characteristics.
- Support for dense and complex application interfaces without sacrificing clarity or responsiveness.
- Renderer architecture that can scale from conservative fallbacks to advanced visual effects.
- No mandatory animation system in the initial implementation; extension points must permit animation later without redesigning the component model.

## Rendering strategy

The framework does not depend on a single rendering technology. It uses a platform-neutral component and theme model with renderer-specific implementations.

Primary roles:

- **Native/CSS/Compose:** application structure, layout, interaction, accessibility, text and standard controls.
- **SVG:** scalable icons, vector geometry and decorative assets.
- **Rive:** optional advanced visual components and future interactive/animated assets.
- **Skia:** optional advanced rendering and shader effects where supported and worthwhile.
- **Capability fallbacks:** themes must remain usable when advanced effects are unavailable or intentionally disabled.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical model and [ROADMAP.md](ROADMAP.md) for implementation status and milestones.

## Status

Early architecture and foundation phase. Public APIs are not stable yet.

## License

A restrictive licensing policy is planned. The exact license text must be finalized before public distribution of production code. See [LICENSE_POLICY.md](LICENSE_POLICY.md).
