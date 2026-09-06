#!/usr/bin/env python3
from __future__ import annotations

import gzip
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGING = json.loads((ROOT / "distribution" / "packaging.json").read_text(encoding="utf-8"))
BUILD_ROOT = ROOT / PACKAGING["stagingRoot"] / "python"
DIST_ROOT = BUILD_ROOT / "dist"
FIXED_EPOCH = int(os.environ.get("SOURCE_DATE_EPOCH", "315532800"))
ZIP_TIME = (1980, 1, 1, 0, 0, 0)
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


def normalize_tree_mtime(root: Path) -> None:
    for path in sorted(root.rglob("*")):
        if path.is_file():
            os.utime(path, (FIXED_EPOCH, FIXED_EPOCH))


def normalize_wheel(path: Path) -> None:
    with zipfile.ZipFile(path, "r") as source:
        entries = [(info.filename, source.read(info.filename), info.external_attr) for info in source.infolist() if not info.is_dir()]
    temp = path.with_suffix(path.suffix + ".tmp")
    with zipfile.ZipFile(temp, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
        for name, data, external_attr in sorted(entries):
            info = zipfile.ZipInfo(name, ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = external_attr or (0o100644 << 16)
            target.writestr(info, data)
    temp.replace(path)


def normalize_sdist(path: Path) -> None:
    with tarfile.open(path, "r:gz") as source:
        entries = []
        for member in source.getmembers():
            if not member.isfile():
                continue
            extracted = source.extractfile(member)
            if extracted is None:
                continue
            entries.append((member.name, extracted.read(), member.mode))
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("wb") as raw:
        with gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0, compresslevel=9) as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as target:
                for name, data, mode in sorted(entries):
                    info = tarfile.TarInfo(name)
                    info.size = len(data)
                    info.mtime = FIXED_EPOCH
                    info.uid = 0
                    info.gid = 0
                    info.uname = ""
                    info.gname = ""
                    info.mode = mode or 0o644
                    target.addfile(info, io.BytesIO(data))
    temp.replace(path)


def main() -> None:
    distribution = load_distribution()
    declared = {item["id"]: item for item in distribution["artifacts"] if item["ecosystem"] == "pypi"}
    if set(declared) != set(ARTIFACTS):
        raise RuntimeError(f"PyPI artifact contract drift: declared={sorted(declared)} expected={sorted(ARTIFACTS)}")

    shutil.rmtree(BUILD_ROOT, ignore_errors=True)
    BUILD_ROOT.mkdir(parents=True, exist_ok=True)
    DIST_ROOT.mkdir(parents=True, exist_ok=True)
    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8")
    build_env = {**os.environ, "SOURCE_DATE_EPOCH": str(FIXED_EPOCH), "TZ": "UTC"}

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
        normalize_tree_mtime(stage_dir)
        out_dir = DIST_ROOT / artifact_id
        out_dir.mkdir(parents=True)
        subprocess.run(
            [sys.executable, "-m", "build", "--no-isolation", "--sdist", "--wheel", "--outdir", str(out_dir), str(stage_dir)],
            cwd=ROOT,
            env=build_env,
            check=True,
        )
        for wheel in out_dir.glob("*.whl"):
            normalize_wheel(wheel)
        for sdist in out_dir.glob("*.tar.gz"):
            normalize_sdist(sdist)

    print(f"Staged deterministic Python wheel and sdist artifacts under {BUILD_ROOT.relative_to(ROOT)} with publication locked.")


if __name__ == "__main__":
    main()
