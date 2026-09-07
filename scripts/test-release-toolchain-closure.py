#!/usr/bin/env python3
from __future__ import annotations

import importlib.metadata
import sys
from collections import deque
from pathlib import Path

from packaging.markers import default_environment
from packaging.requirements import InvalidRequirement, Requirement
from packaging.utils import canonicalize_name
from packaging.version import InvalidVersion, Version

ROOT = Path(__file__).resolve().parents[1]
RELEASE_REQUIREMENTS = ROOT / "scripts" / "release-requirements.txt"
ROOT_RELEASE_TOOLS = ("build", "setuptools", "wheel")


def load_exact_pins() -> dict[str, str]:
    pins: dict[str, str] = {}
    for line_number, raw_line in enumerate(RELEASE_REQUIREMENTS.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.count("==") != 1:
            raise RuntimeError(
                f"{RELEASE_REQUIREMENTS.relative_to(ROOT)}:{line_number} must use one exact name==version pin"
            )
        raw_name, version = (part.strip() for part in line.split("==", 1))
        name = canonicalize_name(raw_name)
        if not name or not version:
            raise RuntimeError(f"Invalid release-tool pin on line {line_number}: {raw_line!r}")
        if name in pins:
            raise RuntimeError(f"Duplicate canonical release-tool pin for {name}")
        try:
            Version(version)
        except InvalidVersion as exc:
            raise RuntimeError(f"Invalid pinned version for {raw_name}: {version}") from exc
        pins[name] = version
    return pins


def verify_installed_versions(pins: dict[str, str]) -> None:
    for name, expected in sorted(pins.items()):
        try:
            actual = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError as exc:
            raise RuntimeError(
                f"Pinned release tool {name} is not installed; install with --no-deps from "
                f"{RELEASE_REQUIREMENTS.relative_to(ROOT)}"
            ) from exc
        if actual != expected:
            raise RuntimeError(f"Release tool drift for {name}: expected {expected}, found {actual}")


def active_requirements(distribution: str) -> list[Requirement]:
    environment = {**default_environment(), "extra": ""}
    active: list[Requirement] = []
    for raw_requirement in importlib.metadata.requires(distribution) or []:
        try:
            requirement = Requirement(raw_requirement)
        except InvalidRequirement as exc:
            raise RuntimeError(f"Invalid dependency metadata for {distribution}: {raw_requirement!r}") from exc
        if requirement.marker is not None and not requirement.marker.evaluate(environment=environment):
            continue
        active.append(requirement)
    return active


def verify_exact_active_closure(pins: dict[str, str]) -> tuple[set[str], list[str]]:
    roots = {canonicalize_name(name) for name in ROOT_RELEASE_TOOLS}
    missing_roots = sorted(roots - pins.keys())
    if missing_roots:
        raise RuntimeError(f"Missing release-tool root pins: {', '.join(missing_roots)}")

    closure: set[str] = set()
    edges: list[str] = []
    queue: deque[str] = deque(sorted(roots))
    while queue:
        package = queue.popleft()
        if package in closure:
            continue
        closure.add(package)
        for requirement in active_requirements(package):
            dependency = canonicalize_name(requirement.name)
            if dependency not in pins:
                raise RuntimeError(
                    f"Unpinned active release-tool dependency: {package} requires {requirement}; "
                    f"add an exact pin to {RELEASE_REQUIREMENTS.relative_to(ROOT)}"
                )
            pinned = Version(pins[dependency])
            if requirement.specifier and pinned not in requirement.specifier:
                raise RuntimeError(
                    f"Incompatible pinned release-tool dependency: {package} requires {requirement}, "
                    f"but {dependency} is pinned to {pinned}"
                )
            edges.append(f"{package} -> {dependency} ({requirement.specifier or 'any'})")
            if dependency not in closure:
                queue.append(dependency)

    extra_pins = sorted(pins.keys() - closure)
    if extra_pins:
        raise RuntimeError(
            "Release requirements contain pins outside the active root dependency closure: " + ", ".join(extra_pins)
        )
    return closure, edges


def main() -> None:
    pins = load_exact_pins()
    verify_installed_versions(pins)
    closure, edges = verify_exact_active_closure(pins)
    print(
        f"Python release toolchain closure OK: {len(closure)} exact pins cover "
        f"{len(edges)} active dependency edges on Python {sys.version_info.major}.{sys.version_info.minor}."
    )


if __name__ == "__main__":
    main()
