#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
from __future__ import annotations
import base64, json, lzma
from pathlib import Path
repo = Path.cwd().resolve()
chunk_dir = repo / "scripts" / "maintenance-locale-payload"
payload = "".join(path.read_text(encoding="utf-8").strip() for path in sorted(chunk_dir.glob("*.txt")))
files = json.loads(lzma.decompress(base64.b64decode(payload)).decode("utf-8"))
expected = {
    "packages/adapter-web/src/generate-components-css.mjs",
    "examples/text-locale-fixtures.mjs",
    "examples/web-reference/locale.html",
    "examples/web-reference/locale-reference.mjs",
    "scripts/test-text-locale-robustness.mjs",
    "scripts/test-web-text-locale-reference.mjs",
    "scripts/test-compose-text-locale.mjs",
    "tests/browser/text-locale-reference.spec.mjs",
    "examples/compose-android/app/src/main/kotlin/gui/framework/examples/android/MainActivity.kt",
    "examples/compose-desktop/src/main/kotlin/Main.kt",
    "examples/compose-android/app/src/androidTest/kotlin/gui/framework/examples/android/ReferenceRuntimeTest.kt",
    "package.json",
}
if set(files) != expected:
    raise SystemExit(f"Unexpected locale payload paths: {sorted(set(files) ^ expected)}")
for relative, content in files.items():
    target = (repo / relative).resolve()
    if repo not in target.parents:
        raise SystemExit(f"Refusing to write outside repository: {relative}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
print(f"Wrote {len(files)} locale robustness files")
