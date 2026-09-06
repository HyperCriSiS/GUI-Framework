#!/usr/bin/env python3
from __future__ import annotations

import gzip
import json
import shutil
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXED_EPOCH = 315532800  # 1980-01-01 UTC, valid for ZIP-compatible ecosystems too.


def add_file(tar: tarfile.TarFile, source: Path, archive_name: str) -> None:
    data = source.read_bytes()
    info = tarfile.TarInfo(archive_name)
    info.size = len(data)
    info.mtime = FIXED_EPOCH
    info.uid = 0
    info.gid = 0
    info.uname = ""
    info.gname = ""
    info.mode = 0o644
    import io
    tar.addfile(info, io.BytesIO(data))


def main() -> None:
    distribution = json.loads((ROOT / "distribution" / "artifacts.json").read_text(encoding="utf-8"))
    packaging = json.loads((ROOT / "distribution" / "packaging.json").read_text(encoding="utf-8"))
    if distribution["publicationLock"]["state"] != "locked" or distribution["publicationLock"]["registryCoordinates"] != "unbound":
        raise RuntimeError("Specification archive staging requires locked publication and unbound registry coordinates")
    artifact = next(item for item in distribution["artifacts"] if item["id"] == "spec-source")
    contract = packaging["artifacts"]["spec-source"]
    if artifact["ecosystem"] != "github-release" or contract["strategy"] != "archive" or artifact["registryName"] is not None:
        raise RuntimeError("Specification-source distribution contract drifted")

    spec_root = ROOT / contract["packageRoot"]
    output_dir = ROOT / packaging["stagingRoot"] / "spec"
    shutil.rmtree(output_dir, ignore_errors=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = f"gui-framework-spec-{packaging['developmentVersion']}"
    archive_path = output_dir / f"{prefix}.tar.gz"

    with archive_path.open("wb") as raw:
        with gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0, compresslevel=9) as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as tar:
                add_file(tar, ROOT / "LICENSE", f"{prefix}/LICENSE")
                for source in sorted(path for path in spec_root.rglob("*") if path.is_file()):
                    relative = source.relative_to(ROOT).as_posix()
                    add_file(tar, source, f"{prefix}/{relative}")

    print(f"Staged deterministic specification source archive: {archive_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
