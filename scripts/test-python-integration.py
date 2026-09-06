# SPDX-License-Identifier: AGPL-3.0-or-later

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "packages" / "integration-python"))

from gui_framework_integration import (  # noqa: E402
    GuiPythonHost,
    GuiPythonHostContext,
    GuiPythonSurface,
    select_capability_fallback,
)


def fixture_spec() -> dict:
    return {
        "specVersion": "0.0.0-test",
        "palettes": [
            {
                "id": "reference-dark",
                "components": {
                    "panel": {
                        "capabilities": {
                            "required": [],
                            "optional": ["backdropBlur"],
                            "fallbackOrder": ["high"],
                        }
                    },
                    "button": {"capabilities": {"required": ["nativeButton"]}},
                },
                "themes": {
                    "frosted-glass": {
                        "components": {
                            "panel": {
                                "base": {"root": {"fill": {"value": "#101010"}}},
                                "fallbacks": {
                                    "high": {
                                        "requires": ["backdropBlur"],
                                        "recipe": {"base": {"root": {"backdropBlur": {"value": 24}}}},
                                    }
                                },
                            }
                        }
                    },
                    "basic": {
                        "components": {
                            "button": {"base": {"root": {"fill": {"value": "#202020"}}}}
                        }
                    },
                },
            }
        ],
    }


def main() -> None:
    if sys.version_info < (3, 11):
        raise RuntimeError("Python integration path requires Python 3.11 or newer")

    selection = select_capability_fallback(
        {
            "required": [],
            "fallbackOrder": ["high"],
            "fallbacks": {"high": {"requires": ["backdropBlur"]}},
        },
        {"backdropBlur"},
    )
    assert selection.supported is True
    assert selection.selected_fallback == "high"

    unsupported = select_capability_fallback({"required": ["shaderEffects"]}, ())
    assert unsupported.supported is False
    assert unsupported.missing_required == ("shaderEffects",)

    for scalar in ("backdropBlur", b"backdropBlur"):
        try:
            select_capability_fallback({}, scalar)
        except TypeError:
            pass
        else:
            raise AssertionError("scalar capability strings must be rejected")

    context = GuiPythonHostContext(
        theme_id="frosted-glass",
        palette_id="reference-dark",
        surface=GuiPythonSurface.UTILITY,
        available_capabilities=frozenset({"backdropBlur"}),
    )
    resolved = GuiPythonHost(fixture_spec(), context).resolve_component("panel")
    assert resolved.host.surface is GuiPythonSurface.UTILITY
    assert resolved.capability_selection.selected_fallback == "high"
    assert resolved.base_visual["base"]["root"]["fill"]["value"] == "#101010"
    assert resolved.effective_visual["base"]["root"]["fill"]["value"] == "#101010"
    assert resolved.effective_visual["base"]["root"]["backdropBlur"]["value"] == 24

    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "spec-ir.json"
        path.write_text(json.dumps(fixture_spec()), encoding="utf-8")
        loaded = GuiPythonHost.from_file(
            path,
            theme_id="basic",
            palette_id="reference-dark",
            available_capabilities={"nativeButton"},
        ).resolve_component("button")
        assert loaded.capability_selection.supported is True
        assert loaded.effective_visual["base"]["root"]["fill"]["value"] == "#202020"

        try:
            GuiPythonHost.from_file(
                path,
                theme_id="basic",
                palette_id="reference-dark",
                available_capabilities="nativeButton",
            )
        except TypeError:
            pass
        else:
            raise AssertionError("GuiPythonHost.from_file must reject scalar capability strings")

    for bad in ("", "   "):
        try:
            GuiPythonHostContext(theme_id=bad, palette_id="reference-dark")
        except ValueError:
            pass
        else:
            raise AssertionError("blank theme IDs must fail")

    compiled = ROOT / "build" / "spec-ir.json"
    if not compiled.is_file():
        raise RuntimeError("build/spec-ir.json must be compiled before the Python integration test")
    real_host = GuiPythonHost.from_file(
        compiled,
        theme_id="frosted-glass",
        palette_id="reference-dark",
        available_capabilities={"backdropBlur"},
    )
    real_panel = real_host.resolve_component("panel")
    assert real_panel.capability_selection.supported is True
    assert real_panel.capability_selection.selected_fallback == "high"
    assert "base" in real_panel.effective_visual

    subprocess.run(
        [sys.executable, str(ROOT / "examples" / "python-integration" / "reference.py")],
        cwd=ROOT,
        check=True,
    )
    print("Python integration path contract/runtime tests passed.")


if __name__ == "__main__":
    main()
