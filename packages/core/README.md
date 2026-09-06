# @gui-framework/core

Renderer-neutral TypeScript contracts and small runtime helpers shared by GUI Framework consumers.

The repository source remains TypeScript. Phase 9 release staging compiles this package to ESM JavaScript plus `.d.ts` declarations before `npm pack`; consumers of a staged or future published artifact do not execute TypeScript source directly.

The canonical public entry point is the package root (`@gui-framework/core`). Deep imports are not part of the stable public API. Registry publication remains locked until an explicit release approval.
