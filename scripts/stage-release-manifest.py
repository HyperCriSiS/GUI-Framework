#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path: Path) -> dict:
    data = path.read_bytes()
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "size": len(data),
    }


def npm_filename(logical_name: str, version: str) -> str:
    normalized = logical_name[1:] if logical_name.startswith("@") else logical_name
    return f"{normalized.replace('/', '-')}-{version}.tgz"


def main() -> None:
    distribution = json.loads((ROOT / "distribution/artifacts.json").read_text(encoding="utf-8"))
    packaging = json.loads((ROOT / "distribution/packaging.json").read_text(encoding="utf-8"))
    if distribution["publicationLock"]["state"] != "locked" or distribution["publicationLock"]["registryCoordinates"] != "unbound":
        raise RuntimeError("Release staging manifest requires locked publication and unbound registry coordinates")

    stage_root = ROOT / packaging["stagingRoot"]
    version = packaging["developmentVersion"]
    entries = []
    for artifact in distribution["artifacts"]:
        artifact_id = artifact["id"]
        ecosystem = artifact["ecosystem"]
        files: list[Path]
        if ecosystem == "github-release":
            files = [stage_root / "spec" / f"gui-framework-spec-{version}.tar.gz"]
        elif ecosystem == "npm":
            files = [stage_root / "npm" / "tarballs" / npm_filename(artifact["logicalName"], version)]
        elif ecosystem == "maven-central":
            files = [stage_root / "maven" / artifact_id / "target" / f"{artifact['logicalName']}-{version}.jar"]
        elif ecosystem == "pypi":
            python_dir = stage_root / "python" / "dist" / artifact_id
            files = sorted([*python_dir.glob("*.whl"), *python_dir.glob("*.tar.gz")])
            if len(files) != 2:
                raise RuntimeError(f"Expected wheel + sdist for {artifact_id}, found {files}")
        else:
            raise RuntimeError(f"Unsupported ecosystem: {ecosystem}")
        for file in files:
            if not file.is_file():
                raise RuntimeError(f"Staged artifact file is missing: {file.relative_to(ROOT)}")
        entries.append({
            "id": artifact_id,
            "ecosystem": ecosystem,
            "logicalName": artifact["logicalName"],
            "registryName": artifact["registryName"],
            "files": [digest(file) for file in sorted(files)],
        })

    manifest = {
        "schemaVersion": 1,
        "releaseVersion": version,
        "publicationState": "locked",
        "registryCoordinates": "unbound",
        "artifacts": entries,
    }
    manifest_path = stage_root / "release-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    checksum_lines = sorted(
        f"{file['sha256']}  {file['path']}"
        for entry in entries
        for file in entry["files"]
    )
    (stage_root / "SHA256SUMS").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    print(f"Cross-ecosystem staging manifest OK: {len(entries)} logical artifacts, {len(checksum_lines)} physical files.")


if __name__ == "__main__":
    main()
