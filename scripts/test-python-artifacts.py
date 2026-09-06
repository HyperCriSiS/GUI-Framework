#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST_ROOT = ROOT / "build" / "staging" / "python" / "dist"
EXPECTATIONS = {
    "python-integration": {
        "name": "gui-framework-integration",
        "probe": "import gui_framework_integration as m; assert 'GuiPythonHost' in m.__all__; print(m.GuiPythonSurface.APPLICATION.value)",
    },
    "host-context-python": {
        "name": "gui-framework-host-context",
        "probe": "import gui_framework_host_context_presets as m; assert m.get_gui_host_context_preset('portable') == (); assert 'backdropBlur' in m.get_gui_host_context_preset('rich-effects'); print('host-context-ok')",
    },
}


def assert_archive_license(path: Path) -> None:
    if path.suffix == ".whl":
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            if not any(name.endswith("/licenses/LICENSE") or name.endswith("/LICENSE") for name in names):
                raise AssertionError(f"Wheel does not contain LICENSE: {path.name}")
    else:
        with tarfile.open(path, "r:gz") as archive:
            names = archive.getnames()
            if not any(name.endswith("/LICENSE") for name in names):
                raise AssertionError(f"sdist does not contain LICENSE: {path.name}")


def install_and_probe(artifact: Path, probe: str, label: str) -> None:
    with tempfile.TemporaryDirectory(prefix=f"gui-python-consumer-{label}-") as temp:
        temp_path = Path(temp)
        venv = temp_path / "venv"
        subprocess.run([sys.executable, "-m", "venv", "--system-site-packages", str(venv)], check=True)
        python = venv / "bin" / "python"
        subprocess.run(
            [str(python), "-m", "pip", "install", "--disable-pip-version-check", "--no-deps", "--no-build-isolation", str(artifact)],
            cwd=temp_path,
            check=True,
        )
        subprocess.run([str(python), "-I", "-c", probe], cwd=temp_path, check=True)


def main() -> None:
    distribution = json.loads((ROOT / "distribution" / "artifacts.json").read_text(encoding="utf-8"))
    if distribution["publicationLock"]["state"] != "locked":
        raise AssertionError("Publication lock must remain locked")

    for artifact_id, expectation in EXPECTATIONS.items():
        artifact_dir = DIST_ROOT / artifact_id
        wheels = sorted(artifact_dir.glob("*.whl"))
        sdists = sorted(artifact_dir.glob("*.tar.gz"))
        if len(wheels) != 1 or len(sdists) != 1:
            raise AssertionError(f"Expected one wheel and one sdist for {artifact_id}; got {wheels} / {sdists}")
        normalized = expectation["name"].replace("-", "_")
        if normalized not in wheels[0].name or "0.0.0.dev0" not in wheels[0].name:
            raise AssertionError(f"Unexpected wheel identity: {wheels[0].name}")
        for archive in (wheels[0], sdists[0]):
            assert_archive_license(archive)
        install_and_probe(wheels[0], expectation["probe"], f"{artifact_id}-wheel")
        install_and_probe(sdists[0], expectation["probe"], f"{artifact_id}-sdist")

    print("Python wheel/sdist clean-consumer smoke tests passed.")


if __name__ == "__main__":
    main()
