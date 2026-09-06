#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD_ROOT = ROOT / "build" / "staging" / "python"
DIST_ROOT = BUILD_ROOT / "dist"
ARTIFACTS = {
    "python-integration": {
        "logical_name": "gui-framework-integration",
        "source": ROOT / "packages" / "integration-python",
        "copy": [("gui_framework_integration", "gui_framework_integration")],
        "setuptools": '[tool.setuptools.packages.find]\nwhere = ["."]\ninclude = ["gui_framework_integration*"]\n',
    },
    "host-context-python": {
        "logical_name": "gui-framework-host-context",
        "source": ROOT / "packages" / "integration-host-context" / "python",
        "copy": [("gui_framework_host_context_presets.py", "gui_framework_host_context_presets.py")],
        "setuptools": '[tool.setuptools]\npy-modules = ["gui_framework_host_context_presets"]\n',
    },
}


def load_distribution() -> dict:
    data = json.loads((ROOT / "distribution" / "artifacts.json").read_text(encoding="utf-8"))
    lock = data.get("publicationLock", {})
    if lock.get("state") != "locked" or lock.get("registryCoordinates") != "unbound":
        raise RuntimeError("Python staging requires locked publication and unbound registry coordinates")
    return data


def pyproject(name: str, setuptools_config: str) -> str:
    return f'''[build-system]\nrequires = ["setuptools>=80,<81", "wheel>=0.45,<0.46"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "{name}"\nversion = "0.0.0.dev0"\ndescription = "GUI Framework pre-release local staging artifact"\nrequires-python = ">=3.11"\nlicense = "AGPL-3.0-or-later"\nlicense-files = ["LICENSE"]\n\n{setuptools_config}'''


def main() -> None:
    distribution = load_distribution()
    declared = {item["id"]: item for item in distribution["artifacts"] if item["ecosystem"] == "pypi"}
    if set(declared) != set(ARTIFACTS):
        raise RuntimeError(f"PyPI artifact contract drift: declared={sorted(declared)} expected={sorted(ARTIFACTS)}")

    shutil.rmtree(BUILD_ROOT, ignore_errors=True)
    BUILD_ROOT.mkdir(parents=True, exist_ok=True)
    DIST_ROOT.mkdir(parents=True, exist_ok=True)
    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8")

    for artifact_id, config in ARTIFACTS.items():
        declared_item = declared[artifact_id]
        if declared_item.get("registryName") is not None:
            raise RuntimeError(f"{artifact_id} registryName must remain null during staging")
        if declared_item.get("logicalName") != config["logical_name"]:
            raise RuntimeError(f"{artifact_id} logical name drift")

        stage_dir = BUILD_ROOT / artifact_id
        stage_dir.mkdir(parents=True)
        (stage_dir / "LICENSE").write_text(license_text, encoding="utf-8")
        source_readme = config["source"] / "README.md"
        if source_readme.exists():
            shutil.copy2(source_readme, stage_dir / "README.md")
        for source_rel, target_rel in config["copy"]:
            source = config["source"] / source_rel
            target = stage_dir / target_rel
            if source.is_dir():
                shutil.copytree(source, target)
            else:
                shutil.copy2(source, target)
        (stage_dir / "pyproject.toml").write_text(
            pyproject(config["logical_name"], config["setuptools"]), encoding="utf-8"
        )
        out_dir = DIST_ROOT / artifact_id
        out_dir.mkdir(parents=True)
        subprocess.run(
            [sys.executable, "-m", "build", "--no-isolation", "--sdist", "--wheel", "--outdir", str(out_dir), str(stage_dir)],
            cwd=ROOT,
            check=True,
        )

    print("Staged Python wheel and sdist artifacts with publication locked.")


if __name__ == "__main__":
    main()
