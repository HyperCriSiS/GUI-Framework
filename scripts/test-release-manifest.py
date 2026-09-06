#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    distribution = json.loads((ROOT / "distribution/artifacts.json").read_text(encoding="utf-8"))
    packaging = json.loads((ROOT / "distribution/packaging.json").read_text(encoding="utf-8"))
    stage_root = ROOT / packaging["stagingRoot"]
    manifest_path = stage_root / "release-manifest.json"
    checksums_path = stage_root / "SHA256SUMS"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    assert manifest["publicationState"] == "locked"
    assert manifest["registryCoordinates"] == "unbound"
    assert manifest["releaseVersion"] == packaging["developmentVersion"]
    expected_ids = [item["id"] for item in distribution["artifacts"]]
    actual_ids = [item["id"] for item in manifest["artifacts"]]
    assert actual_ids == expected_ids, f"Artifact manifest order/identity drift: {actual_ids} != {expected_ids}"

    seen = set()
    expected_lines = []
    physical_count = 0
    for expected, actual in zip(distribution["artifacts"], manifest["artifacts"], strict=True):
        assert actual["ecosystem"] == expected["ecosystem"]
        assert actual["logicalName"] == expected["logicalName"]
        assert actual["registryName"] is None
        assert actual["files"], f"No physical files for {actual['id']}"
        for item in actual["files"]:
            physical_count += 1
            assert item["path"] not in seen, f"Duplicate physical artifact path: {item['path']}"
            seen.add(item["path"])
            path = ROOT / item["path"]
            data = path.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            assert digest == item["sha256"], f"SHA-256 mismatch: {item['path']}"
            assert len(data) == item["size"], f"Size mismatch: {item['path']}"
            expected_lines.append(f"{digest}  {item['path']}")

    assert physical_count == 15, f"Expected 15 physical staged files, got {physical_count}"
    actual_lines = [line for line in checksums_path.read_text(encoding="utf-8").splitlines() if line]
    assert actual_lines == sorted(expected_lines), "SHA256SUMS does not match manifest"
    print("Release staging manifest/checksum smoke OK: 13 logical artifacts / 15 physical files.")


if __name__ == "__main__":
    main()
