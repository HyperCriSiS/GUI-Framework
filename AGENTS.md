# GUI Framework — Repository Instructions

Follow the global Codex instructions first.

## Product goals

- Build a high-quality reusable GUI framework with clarity, sharpness, elegance, performance, recognizability, and support for complex application structures.
- Primary target: PySide6 / Qt. Keep architecture capable of supporting other Python GUI integrations only where this does not compromise the primary implementation.
- Initial theme families: Basic, Modern, Glass, Frosted Glass, Spacey, Cyberpunk.
- Themes may expose multiple color palettes, but theme structure and semantics should remain consistent.
- Necessary interaction feedback such as hover, focus, pressed, selection, and state transitions is allowed. Avoid decorative animation that adds latency or distraction.
- Prioritize responsiveness and low rendering overhead.

## Change rules

- Keep design tokens/theme primitives separate from application-specific widgets where practical.
- Do not hardcode one theme's assumptions into shared widget logic.
- Accessibility, readable contrast, scaling, focus states, keyboard behavior, and high-DPI rendering must be considered.
- Avoid visual effects that materially degrade performance or text clarity.
- Keep the framework usable for real applications rather than turning it into a collection of isolated mockups.

## Repository workflow

- Read `ARCHITECTURE.md`, `LICENSE_POLICY.md`, `ROADMAP.md`, README, and license before architecture or API changes.
- The license policy is intentional; do not relax or replace it without an explicit project decision.
