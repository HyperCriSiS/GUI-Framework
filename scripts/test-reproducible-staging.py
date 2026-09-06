#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = {
    **os.environ,
    "SOURCE_DATE_EPOCH": "315532800",
    "TZ": "UTC",
    "LC_ALL": "C.UTF-8",
}
COMMANDS = [
    ["npm", "run", "check:npm-artifacts"],
    ["npm", "run", "check:maven-artifacts"],
    ["npm", "run", "check:python-artifacts"],
    ["npm", "run", "check:spec-archive"],
    ["npm", "run", "stage:release-manifest"],
    ["npm", "run", "test:release-manifest"],
]


def run_pass(label: str) -> tuple[dict[str, str], str, str]:
    shutil.rmtree(ROOT / "build" / "release-staging", ignore_errors=True)
    shutil.rmtree(ROOT / "build" / "package-inputs" / "core", ignore_errors=True)
    for command in COMMANDS:
        subprocess.run(command, cwd=ROOT, env=ENV, check=True)
    stage_root = ROOT / "build" / "release-staging"
    manifest_bytes = (stage_root / "release-manifest.json").read_bytes()
    sums_bytes = (stage_root / "SHA256SUMS").read_bytes()
    manifest = json.loads(manifest_bytes)
    hashes = {
        file["path"]: file["sha256"]
        for artifact in manifest["artifacts"]
        for file in artifact["files"]
    }
    print(f"Reproducibility pass {label}: {len(hashes)} physical artifacts staged.")
    return hashes, hashlib.sha256(manifest_bytes).hexdigest(), hashlib.sha256(sums_bytes).hexdigest()


def main() -> None:
    first = run_pass("A")
    second = run_pass("B")
    if first != second:
        first_hashes, first_manifest, first_sums = first
        second_hashes, second_manifest, second_sums = second
        changed = sorted(path for path in set(first_hashes) | set(second_hashes) if first_hashes.get(path) != second_hashes.get(path))
        raise AssertionError(
            "Release staging is not byte-reproducible. "
            f"Changed artifacts={changed}; manifest={first_manifest}/{second_manifest}; sums={first_sums}/{second_sums}"
        )
    print("Release staging reproducibility OK: two clean passes produced identical SHA-256 identities for all 15 files.")


if __name__ == "__main__":
    main()
