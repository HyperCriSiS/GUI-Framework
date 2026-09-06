# Python Integration Path

This package is the toolkit-neutral Python bridge over the compiled GUI Framework specification IR. It intentionally does not choose Tkinter, PySide, wxPython or another GUI toolkit for the application.

## Runtime contract

- consume compiled `spec-ir.json`, never DTCG source directly,
- make host surface, theme, palette and capabilities explicit,
- resolve required capability fallbacks deterministically,
- do not infer operating system, GPU, window-manager or toolkit capabilities,
- keep toolkit lifecycle and rendering ownership in the consuming application.

The stable public API is exported from `gui_framework_integration`.

## Pre-release packaging validation

Phase 9 stages this source as the logical `gui-framework-integration` artifact with PEP-440 development version `0.0.0.dev0`. The staging gate builds both wheel and sdist forms, embeds the AGPL license, then installs and imports each form from a fresh Python 3.11 virtual environment.

This does not reserve or publish a PyPI project name. `distribution/artifacts.json` keeps the registry coordinate unbound and publication locked.

Run the local smoke after installing the pinned build tools documented in `DISTRIBUTION.md`:

```sh
npm run check:python-artifacts
```
