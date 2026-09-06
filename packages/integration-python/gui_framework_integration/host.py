# SPDX-License-Identifier: AGPL-3.0-or-later

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from enum import Enum
import json
from pathlib import Path
from types import MappingProxyType
from typing import Any, Iterable, Mapping


class GuiPythonSurface(str, Enum):
    APPLICATION = "application"
    SETTINGS = "settings"
    UTILITY = "utility"
    DIALOG = "dialog"


def _normalize_identifier(value: str, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{name} must be a non-empty string")
    return value.strip()


def _normalize_capabilities(values: Iterable[str]) -> frozenset[str]:
    capabilities = frozenset(values)
    if any(not isinstance(value, str) or not value.strip() for value in capabilities):
        raise ValueError("available_capabilities must contain non-empty strings")
    return capabilities


@dataclass(frozen=True, slots=True)
class GuiPythonHostContext:
    theme_id: str
    palette_id: str
    surface: GuiPythonSurface = GuiPythonSurface.APPLICATION
    available_capabilities: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        object.__setattr__(self, "theme_id", _normalize_identifier(self.theme_id, "theme_id"))
        object.__setattr__(self, "palette_id", _normalize_identifier(self.palette_id, "palette_id"))
        object.__setattr__(self, "available_capabilities", _normalize_capabilities(self.available_capabilities))
        if not isinstance(self.surface, GuiPythonSurface):
            object.__setattr__(self, "surface", GuiPythonSurface(self.surface))


@dataclass(frozen=True, slots=True)
class CapabilitySelection:
    supported: bool
    missing_required: tuple[str, ...]
    selected_fallback: str | None


@dataclass(frozen=True, slots=True)
class ResolvedPythonComponent:
    component_id: str
    host: GuiPythonHostContext
    contract: Mapping[str, Any]
    base_visual: Mapping[str, Any]
    effective_visual: Mapping[str, Any]
    capability_selection: CapabilitySelection


def load_compiled_spec(path: str | Path) -> Mapping[str, Any]:
    source = Path(path)
    with source.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError("compiled GUI specification must be a JSON object")
    if not isinstance(value.get("palettes"), list):
        raise ValueError("compiled GUI specification must contain a palettes array")
    return value


def select_capability_fallback(
    profile: Mapping[str, Any] | None,
    available_capabilities: Iterable[str] = (),
) -> CapabilitySelection:
    profile = profile or {}
    available = _normalize_capabilities(available_capabilities)
    required = tuple(profile.get("required") or ())
    missing = tuple(sorted(capability for capability in required if capability not in available))
    if missing:
        return CapabilitySelection(False, missing, None)

    fallbacks = profile.get("fallbacks") or {}
    for fallback_id in profile.get("fallbackOrder") or ():
        fallback = fallbacks.get(fallback_id)
        if not isinstance(fallback, Mapping):
            continue
        if all(capability in available for capability in fallback.get("requires") or ()):
            return CapabilitySelection(True, (), fallback_id)
    return CapabilitySelection(True, (), None)


def _find_palette(spec: Mapping[str, Any], palette_id: str) -> Mapping[str, Any]:
    for palette in spec.get("palettes") or ():
        if isinstance(palette, Mapping) and palette.get("id") == palette_id:
            return palette
    raise KeyError(f"unknown compiled palette: {palette_id}")


def _merge_mapping(base: Mapping[str, Any], overlay: Mapping[str, Any]) -> dict[str, Any]:
    result = deepcopy(dict(base))
    for key, value in overlay.items():
        if isinstance(value, Mapping) and isinstance(result.get(key), Mapping):
            result[key] = _merge_mapping(result[key], value)
        else:
            result[key] = deepcopy(value)
    return result


def _freeze_mapping(value: Mapping[str, Any]) -> Mapping[str, Any]:
    return MappingProxyType(deepcopy(dict(value)))


class GuiPythonHost:
    def __init__(self, spec: Mapping[str, Any], context: GuiPythonHostContext) -> None:
        if not isinstance(spec, Mapping):
            raise TypeError("spec must be a compiled GUI specification mapping")
        self._spec = spec
        self.context = context
        palette = _find_palette(spec, context.palette_id)
        themes = palette.get("themes") or {}
        if context.theme_id not in themes:
            raise KeyError(f"unknown compiled theme for {context.palette_id}: {context.theme_id}")

    @classmethod
    def from_file(
        cls,
        path: str | Path,
        *,
        theme_id: str,
        palette_id: str,
        surface: GuiPythonSurface = GuiPythonSurface.APPLICATION,
        available_capabilities: Iterable[str] = (),
    ) -> "GuiPythonHost":
        return cls(
            load_compiled_spec(path),
            GuiPythonHostContext(
                theme_id=theme_id,
                palette_id=palette_id,
                surface=surface,
                available_capabilities=frozenset(available_capabilities),
            ),
        )

    def resolve_component(self, component_id: str) -> ResolvedPythonComponent:
        component_id = _normalize_identifier(component_id, "component_id")
        palette = _find_palette(self._spec, self.context.palette_id)
        contracts = palette.get("components") or {}
        if component_id not in contracts:
            raise KeyError(f"unknown compiled component for {self.context.palette_id}: {component_id}")

        theme = (palette.get("themes") or {})[self.context.theme_id]
        visual = (theme.get("components") or {}).get(component_id)
        if not isinstance(visual, Mapping):
            raise KeyError(
                f"theme {self.context.theme_id} has no compiled visual for component {component_id}"
            )

        contract = contracts[component_id]
        base_visual = {key: value for key, value in visual.items() if key != "fallbacks"}
        profile = dict(contract.get("capabilities") or {})
        profile["fallbacks"] = visual.get("fallbacks") or {}
        selection = select_capability_fallback(profile, self.context.available_capabilities)

        effective_visual = base_visual
        if selection.selected_fallback:
            fallback = (visual.get("fallbacks") or {})[selection.selected_fallback]
            recipe = fallback.get("recipe") or {}
            effective_visual = _merge_mapping(base_visual, recipe)

        return ResolvedPythonComponent(
            component_id=component_id,
            host=self.context,
            contract=_freeze_mapping(contract),
            base_visual=_freeze_mapping(base_visual),
            effective_visual=_freeze_mapping(effective_visual),
            capability_selection=selection,
        )
