from pathlib import Path
import json


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f"expected exactly one anchor in {path}: {old[:120]!r}, got {text.count(old)}")
    p.write_text(text.replace(old, new, 1))

replace_once(
    "ROADMAP.md",
    "- [ ] Tree / Hierarchy primitives",
    "- [x] Tree / Hierarchy primitives <!-- neutral contract/tokens/Basic visuals, controlled native Web/Foundation Compose adapters, selection/expansion/activation and disabled semantics, keyboard hierarchy navigation, standalone Web plus Desktop/Android references, cross-platform parity, compact 320px Chromium regression, Android APK build and representative API 23 large-font/API 35 high-density runtime validation are complete -->",
)

recipe = {
    "specVersion": "0.1.0",
    "component": "form-layout",
    "anatomy": [
        {"id": "root", "required": True},
        {"id": "section", "required": False},
        {"id": "field", "required": True},
        {"id": "label", "required": False},
        {"id": "control", "required": True},
        {"id": "description", "required": False},
        {"id": "error", "required": False},
        {"id": "actions", "required": False},
    ],
    "content": [
        {"id": "section", "kind": "children", "required": False},
        {"id": "field", "kind": "children", "required": True},
        {"id": "label", "kind": "text", "required": False},
        {"id": "control", "kind": "children", "required": True},
        {"id": "description", "kind": "text", "required": False},
        {"id": "error", "kind": "text", "required": False},
        {"id": "actions", "kind": "children", "required": False},
    ],
    "properties": [
        {"id": "accessibilityLabel", "type": "string", "required": False, "default": ""},
        {"id": "columns", "type": "number", "required": False, "default": 1},
    ],
    "events": [],
    "variants": ["stacked", "inline"],
    "sizes": ["small", "medium", "large"],
    "states": ["default", "error", "disabled"],
    "semantics": {"role": "group", "preferNativePrimitive": False},
    "tokenBindings": {
        "text": "{semantic.color.textPrimary}",
        "textMuted": "{semantic.color.textSecondary}",
        "danger": "{semantic.color.danger}",
        "border": "{semantic.color.border}",
        "borderStrong": "{semantic.color.borderStrong}",
        "focus": "{semantic.color.focus}",
        "disabledOpacity": "{opacity.disabled}",
    },
    "capabilities": {
        "required": [],
        "optional": ["advancedBlendModes", "shaderEffects"],
        "fallbackOrder": ["standard", "minimal"],
    },
}
Path("spec/components/form-layout.recipe.json").write_text(json.dumps(recipe, indent=2) + "\n")

manifest_path = Path("spec/manifest.json")
manifest = json.loads(manifest_path.read_text())
if any(c["id"] == "form-layout" for c in manifest["components"]):
    raise RuntimeError("form-layout already registered")
manifest["components"].append({"id": "form-layout", "source": "components/form-layout.recipe.json"})
manifest["components"].sort(key=lambda c: c["id"])
manifest_path.write_text(json.dumps(manifest, separators=(",", ":")) + "\n")

replace_once(
    "scripts/test-spec.mjs",
    'const expectedContractComponentIds=["button","checkbox","data-grid","dialog","input","menu","navigation","panel","progress","radio","select","slider","switch","table","tabs","toast","tooltip","tree"];',
    'const expectedContractComponentIds=["button","checkbox","data-grid","dialog","form-layout","input","menu","navigation","panel","progress","radio","select","slider","switch","table","tabs","toast","tooltip","tree"];',
)

replace_once(
    "scripts/test-web-contracts.mjs",
    r'assert.match(source, /export const guiComponentIds = \["button", "checkbox", "data-grid", "dialog", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip", \"tree\"\] as const;/);',
    r'assert.match(source, /export const guiComponentIds = \["button", "checkbox", "data-grid", "dialog", "form-layout", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip", \"tree\"\] as const;/);',
)
web_anchor = '  assert.match(source, /export const guiDialogContract = \\{/); assert.match(source, /export type GuiDialogVariant = \\(typeof guiDialogContract\\.variants\\)\\[number\\];/); assert.match(source, /export type GuiDialogSize = \\(typeof guiDialogContract\\.sizes\\)\\[number\\];/); assert.match(source, /export type GuiDialogState = \\(typeof guiDialogContract\\.states\\)\\[number\\];/); assert.match(source, /states: \\["default"\\] as const,/); assert.match(source, /"id": "open"/); assert.match(source, /"id": "accessibilityLabel"/); assert.match(source, /"id": "dismissible"/); assert.match(source, /"id": "dismissRequest"/); assert.match(source, /"payload": "none"/); assert.match(source, /"id": "children"/); assert.match(source, /"kind": "children"/); assert.match(source, /"role": "dialog"/);\n'
web_form = '  assert.match(source, /export const guiFormLayoutContract = \\{/); assert.match(source, /export type GuiFormLayoutVariant = \\(typeof guiFormLayoutContract\\.variants\\)\\[number\\];/); assert.match(source, /variants: \\["stacked", "inline"\\] as const,/); assert.match(source, /states: \\["default", "error", "disabled"\\] as const,/); assert.match(source, /"id": "accessibilityLabel"/); assert.match(source, /"id": "columns"/); assert.match(source, /"id": "field"/); assert.match(source, /"id": "control"/); assert.match(source, /"id": "description"/); assert.match(source, /"id": "error"/); assert.match(source, /"id": "actions"/); assert.match(source, /"role": "group"/);\n'
replace_once("scripts/test-web-contracts.mjs", web_anchor, web_anchor + web_form)

compose_anchor = '  assert.match(source, /GuiComponentSemantics\\(\"tree\", false\\)/);\n\n'
compose_form = '''  assert.match(source, /enum class GuiFormLayoutVariant/);\n  assert.match(source, /STACKED\\("stacked"\\)/);\n  assert.match(source, /INLINE\\("inline"\\)/);\n  assert.match(source, /enum class GuiFormLayoutSize/);\n  assert.match(source, /enum class GuiFormLayoutState/);\n  assert.match(source, /ERROR\\("error"\\)/);\n  assert.match(source, /DISABLED\\("disabled"\\)/);\n  assert.match(source, /data class GuiFormLayoutProperties\\(/);\n  assert.match(source, /val accessibilityLabel: String = ""/);\n  assert.match(source, /val columns: Double = 1\\.0/);\n  assert.match(source, /GuiContentSlot\\("section", "children", false\\)/);\n  assert.match(source, /GuiContentSlot\\("field", "children", true\\)/);\n  assert.match(source, /GuiContentSlot\\("label", "text", false\\)/);\n  assert.match(source, /GuiContentSlot\\("control", "children", true\\)/);\n  assert.match(source, /GuiContentSlot\\("description", "text", false\\)/);\n  assert.match(source, /GuiContentSlot\\("error", "text", false\\)/);\n  assert.match(source, /GuiContentSlot\\("actions", "children", false\\)/);\n  assert.match(source, /GuiComponentSemantics\\("group", false\\)/);\n\n'''
replace_once("scripts/test-compose-contracts.mjs", compose_anchor, compose_anchor + compose_form)
