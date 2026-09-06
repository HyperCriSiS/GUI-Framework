# SPDX-License-Identifier: AGPL-3.0-or-later

from __future__ import annotations

from collections.abc import Iterable

_GUI_HOST_CONTEXT_PRESETS = {
    "portable": (),
    "blend-effects": ("advancedBlendModes",),
    "backdrop-effects": ("backdropBlur",),
    "rich-effects": ("advancedBlendModes", "backdropBlur"),
}

GUI_HOST_CONTEXT_PRESETS = {
    preset_id: tuple(capabilities)
    for preset_id, capabilities in _GUI_HOST_CONTEXT_PRESETS.items()
}


def get_gui_host_context_preset(preset_id: str) -> tuple[str, ...]:
    if not isinstance(preset_id, str) or not preset_id.strip():
        raise TypeError("host-context preset id must be a non-empty string")
    normalized = preset_id.strip()
    try:
        return GUI_HOST_CONTEXT_PRESETS[normalized]
    except KeyError as exc:
        raise ValueError(f"Unknown GUI host-context preset: {normalized}") from exc


def resolve_gui_host_capabilities(
    preset_id: str,
    *,
    additional_capabilities: Iterable[str] = (),
) -> tuple[str, ...]:
    if isinstance(additional_capabilities, str):
        raise TypeError("additional_capabilities must be an iterable of identifiers, not a string")
    try:
        iterator = iter(additional_capabilities)
    except TypeError as exc:
        raise TypeError("additional_capabilities must be iterable") from exc

    capabilities = set(get_gui_host_context_preset(preset_id))
    for raw_value in iterator:
        if not isinstance(raw_value, str) or not raw_value.strip():
            raise TypeError("capability identifiers must be non-empty strings")
        capabilities.add(raw_value.strip())
    return tuple(sorted(capabilities))
