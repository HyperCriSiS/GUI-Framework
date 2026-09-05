import json
import re
from pathlib import Path

recipe = {
  "specVersion": "0.1.0",
  "component": "tree",
  "anatomy": [
    {"id": "root", "required": True},
    {"id": "item", "required": True},
    {"id": "disclosure", "required": False},
    {"id": "icon", "required": False},
    {"id": "label", "required": True},
    {"id": "group", "required": False}
  ],
  "content": [
    {"id": "item", "kind": "children", "required": True},
    {"id": "group", "kind": "children", "required": False}
  ],
  "properties": [
    {"id": "value", "type": "string", "required": False, "default": ""},
    {"id": "accessibilityLabel", "type": "string", "required": False, "default": ""},
    {"id": "disabled", "type": "boolean", "required": False, "default": False, "state": "disabled"}
  ],
  "events": [
    {"id": "valueChange", "payload": "string"},
    {"id": "expandedChange", "payload": "string"},
    {"id": "nodeActivate", "payload": "string"}
  ],
  "variants": ["standard"],
  "sizes": ["small", "medium", "large"],
  "states": ["default", "hover", "focus", "pressed", "selected", "expanded", "disabled"],
  "semantics": {"role": "tree", "preferNativePrimitive": False},
  "tokenBindings": {
    "surface": "{semantic.color.surface}",
    "surfaceElevated": "{semantic.color.surfaceElevated}",
    "text": "{semantic.color.textPrimary}",
    "textMuted": "{semantic.color.textSecondary}",
    "selected": "{semantic.color.accent}",
    "border": "{semantic.color.border}",
    "borderStrong": "{semantic.color.borderStrong}",
    "focus": "{semantic.color.focus}",
    "disabledOpacity": "{opacity.disabled}"
  },
  "capabilities": {"required": [], "optional": ["advancedBlendModes", "shaderEffects"], "fallbackOrder": ["standard", "minimal"]}
}
Path("spec/components/tree.recipe.json").write_text(json.dumps(recipe, indent=2) + "\n")

manifest_path = Path("spec/manifest.json")
manifest = json.loads(manifest_path.read_text())
if not any(item["id"] == "tree" for item in manifest["components"]):
    manifest["components"].append({"id": "tree", "source": "components/tree.recipe.json"})
manifest["components"] = sorted(manifest["components"], key=lambda item: item["id"])
manifest_path.write_text(json.dumps(manifest, separators=(",", ":")) + "\n")

spec_test = Path("scripts/test-spec.mjs")
source = spec_test.read_text()
match = re.search(r'const expectedContractComponentIds=\[(.*?)\];', source)
if not match:
    raise RuntimeError("expectedContractComponentIds anchor missing")
items = re.findall(r'"([^"]+)"', match.group(1))
if "tree" not in items:
    items.append("tree")
items.sort()
replacement = 'const expectedContractComponentIds=[' + ','.join(json.dumps(item) for item in items) + '];'
source = source[:match.start()] + replacement + source[match.end():]
spec_test.write_text(source)

web_test = Path("scripts/test-web-contracts.mjs")
source = web_test.read_text()
match = re.search(r'assert\.match\(source, /export const guiComponentIds = \\\[(.*?)\\\] as const;/\);', source)
if not match:
    raise RuntimeError("Web guiComponentIds anchor missing")
raw = match.group(1)
if '\\"tree\\"' not in raw:
    raw = raw + ', \\"tree\\"'
replacement = 'assert.match(source, /export const guiComponentIds = \\[' + raw + '\\] as const;/);'
source = source[:match.start()] + replacement + source[match.end():]
anchor = '  assert.match(source, /export const guiTooltipContract = \\{/);'
if anchor not in source:
    raise RuntimeError("Web tooltip assertion anchor missing")
block = '''  assert.match(source, /export const guiTreeContract = \\{/); assert.match(source, /export type GuiTreeVariant = \\(typeof guiTreeContract\\.variants\\)\\[number\\];/); assert.match(source, /variants: \\[\\"standard\\"\\] as const,/); assert.match(source, /states: \\[\\"default\\", \\"hover\\", \\"focus\\", \\"pressed\\", \\"selected\\", \\"expanded\\", \\"disabled\\"\\] as const,/); assert.match(source, /\\"id\\": \\"valueChange\\"/); assert.match(source, /\\"id\\": \\"expandedChange\\"/); assert.match(source, /\\"id\\": \\"nodeActivate\\"/); assert.match(source, /\\"id\\": \\"item\\"/); assert.match(source, /\\"id\\": \\"group\\"/); assert.match(source, /\\"role\\": \\"tree\\"/);\n'''
if 'guiTreeContract' not in source:
    source = source.replace(anchor, block + anchor, 1)
web_test.write_text(source)

compose_test = Path("scripts/test-compose-contracts.mjs")
source = compose_test.read_text()
anchor = '  assert.match(source, /enum class GuiTooltipVariant/);'
if anchor not in source:
    raise RuntimeError("Compose tooltip assertion anchor missing")
block = '''  assert.match(source, /enum class GuiTreeVariant/);\n  assert.match(source, /STANDARD\\(\\"standard\\"\\)/);\n  assert.match(source, /enum class GuiTreeSize/);\n  assert.match(source, /enum class GuiTreeState/);\n  assert.match(source, /SELECTED\\(\\"selected\\"\\)/);\n  assert.match(source, /EXPANDED\\(\\"expanded\\"\\)/);\n  assert.match(source, /data class GuiTreeProperties\\(/);\n  assert.match(source, /val value: String = \\"\\"/);\n  assert.match(source, /val accessibilityLabel: String = \\"\\"/);\n  assert.match(source, /val disabled: Boolean = false/);\n  assert.match(source, /GuiEventContract\\(\\"valueChange\\", \\"string\\"\\)/);\n  assert.match(source, /GuiEventContract\\(\\"expandedChange\\", \\"string\\"\\)/);\n  assert.match(source, /GuiEventContract\\(\\"nodeActivate\\", \\"string\\"\\)/);\n  assert.match(source, /GuiContentSlot\\(\\"item\\", \\"children\\", true\\)/);\n  assert.match(source, /GuiContentSlot\\(\\"group\\", \\"children\\", false\\)/);\n  assert.match(source, /GuiComponentSemantics\\(\\"tree\\", false\\)/);\n\n'''
if 'enum class GuiTreeVariant' not in source:
    source = source.replace(anchor, block + anchor, 1)
compose_test.write_text(source)
