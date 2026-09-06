# SPDX-License-Identifier: AGPL-3.0-or-later

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "packages" / "integration-python"))

from gui_framework_integration import GuiPythonHost, GuiPythonSurface  # noqa: E402


def main() -> None:
    host = GuiPythonHost.from_file(
        ROOT / "build" / "spec-ir.json",
        theme_id="basic",
        palette_id="reference-dark",
        surface=GuiPythonSurface.APPLICATION,
        available_capabilities=(),
    )
    button = host.resolve_component("button")
    if not button.capability_selection.supported:
        raise RuntimeError(
            f"Reference button unexpectedly requires unavailable capabilities: "
            f"{button.capability_selection.missing_required}"
        )
    if "variants" not in button.effective_visual:
        raise RuntimeError("Compiled Basic button visual does not expose variants")

    print(
        "Python integration reference resolved "
        f"{button.component_id} for {button.host.theme_id}/{button.host.palette_id} "
        f"on {button.host.surface.value}."
    )


if __name__ == "__main__":
    main()
