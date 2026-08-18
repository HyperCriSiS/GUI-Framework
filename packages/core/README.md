# Core

The core package contains platform-neutral contracts shared by GUI Framework renderers.

It intentionally has no dependency on DOM APIs, Compose, Rive, Skia or another rendering runtime.

Current foundation contracts cover:

- component properties;
- semantic interaction state;
- design and motion tokens;
- renderer capabilities and quality levels;
- accessibility metadata;
- theme definitions.

The first web renderer and Basic theme will exercise these contracts before the API is considered stable.
