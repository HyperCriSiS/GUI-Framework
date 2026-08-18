# Web adapter

This internal package is the first platform adapter for the language-neutral specification.

The adapter consumes compiled IR only. It does not parse DTCG source files or palette source files directly.

Current scope:

- emit platform-neutral primitive tokens as `:root` CSS custom properties;
- emit semantic color roles per explicitly selected palette using `data-gui-palette`;
- convert supported neutral token types to CSS syntax;
- generate TypeScript theme/component metadata and union types from the neutral component registry;
- expose neutral content/property/event metadata to Web tooling without inventing DOM-specific public contracts;
- keep development palette IDs out of public component contract types;
- fail explicitly for token types that do not yet have a Web mapping.

No final theme styling is implemented here yet.
