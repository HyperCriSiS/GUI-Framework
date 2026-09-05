import json
import re
from pathlib import Path


def dimension(value):
    return {"$value": {"value": value, "unit": "px"}}


def replace_string_array(source, name, add_value):
    pattern = rf'(const {re.escape(name)}=\[)(.*?)(\];)'
    match = re.search(pattern, source)
    if not match:
        raise RuntimeError(f"missing array anchor: {name}")
    values = re.findall(r'"([^"]+)"', match.group(2))
    if add_value not in values:
        values.append(add_value)
    values.sort()
    body = ",".join(json.dumps(value) for value in values)
    return source[:match.start()] + match.group(1) + body + match.group(3) + source[match.end():]


def leaf_count(value):
    if isinstance(value, dict):
        return sum(leaf_count(child) for child in value.values())
    if isinstance(value, list):
        return sum(leaf_count(child) for child in value)
    return 1


tokens_path = Path("spec/tokens/components.tokens.json")
tokens = json.loads(tokens_path.read_text())
tokens["component"]["tree"] = {
    "indent": {
        "step": {
            "$type": "dimension",
            "small": dimension(16),
            "medium": dimension(20),
            "large": dimension(24),
        }
    },
    "disclosure": {
        "size": {
            "$type": "dimension",
            "small": dimension(16),
            "medium": dimension(18),
            "large": dimension(20),
        }
    },
}
tokens_path.write_text(json.dumps(tokens, separators=(",", ":")) + "\n")

tree_visual = {
    "base": {
        "root": {
            "fill": "{semantic.color.surfaceElevated}",
            "foreground": "{semantic.color.textPrimary}",
            "radius": "{radius.control}",
            "paddingVertical": "{spacing.xs}",
            "border": {"color": "{semantic.color.border}", "width": "{border.width.standard}"},
        },
        "item": {
            "foreground": "{semantic.color.textPrimary}",
            "radius": "{radius.control}",
            "minHeight": "{sizing.control.medium}",
            "paddingHorizontal": "{spacing.sm}",
            "paddingVertical": "{spacing.xs}",
            "gap": "{spacing.sm}",
        },
        "disclosure": {
            "foreground": "{semantic.color.textSecondary}",
            "minWidth": "{component.tree.disclosure.size.medium}",
            "minHeight": "{component.tree.disclosure.size.medium}",
        },
        "icon": {"foreground": "{semantic.color.textSecondary}"},
        "label": {
            "fontSize": "{typography.size.medium}",
            "fontWeight": "{typography.weight.medium}",
            "lineHeight": "{typography.lineHeight.control}",
        },
        "group": {"paddingHorizontal": "{component.tree.indent.step.medium}"},
    },
    "sizes": {
        "small": {
            "item": {
                "minHeight": "{sizing.control.small}",
                "paddingHorizontal": "{spacing.sm}",
                "paddingVertical": "{spacing.xs}",
            },
            "disclosure": {
                "minWidth": "{component.tree.disclosure.size.small}",
                "minHeight": "{component.tree.disclosure.size.small}",
            },
            "label": {"fontSize": "{typography.size.small}"},
            "group": {"paddingHorizontal": "{component.tree.indent.step.small}"},
        },
        "medium": {
            "item": {"minHeight": "{sizing.control.medium}"},
            "disclosure": {
                "minWidth": "{component.tree.disclosure.size.medium}",
                "minHeight": "{component.tree.disclosure.size.medium}",
            },
            "group": {"paddingHorizontal": "{component.tree.indent.step.medium}"},
        },
        "large": {
            "item": {
                "minHeight": "{sizing.control.large}",
                "paddingHorizontal": "{spacing.lg}",
                "paddingVertical": "{spacing.md}",
            },
            "disclosure": {
                "minWidth": "{component.tree.disclosure.size.large}",
                "minHeight": "{component.tree.disclosure.size.large}",
            },
            "label": {"fontSize": "{typography.size.large}"},
            "group": {"paddingHorizontal": "{component.tree.indent.step.large}"},
        },
    },
    "states": {
        "hover": {"item": {"fill": "{semantic.color.surface}"}},
        "focus": {"item": {"outline": {"color": "{semantic.color.focus}", "width": "{focus.ring.width}", "offset": "{focus.ring.offset}"}}},
        "pressed": {"item": {"fill": "{semantic.color.background}"}},
        "selected": {
            "item": {"fill": "{semantic.color.surface}"},
            "disclosure": {"foreground": "{semantic.color.accent}"},
            "icon": {"foreground": "{semantic.color.accent}"},
            "label": {"foreground": "{semantic.color.accent}"},
        },
        "expanded": {"disclosure": {"foreground": "{semantic.color.accent}"}},
        "disabled": {"item": {"opacity": "{opacity.disabled}"}},
    },
    "variants": {"standard": {"base": {}}},
}

theme_path = Path("spec/themes/basic.theme.json")
theme = json.loads(theme_path.read_text())
if "tree" in theme["components"]:
    raise RuntimeError("Tree visual already exists")
theme["components"]["tree"] = tree_visual
theme_path.write_text(json.dumps(theme, separators=(",", ":")) + "\n")

increment = leaf_count(tree_visual)
budgets_path = Path("spec/quality/performance-budgets.json")
budgets = json.loads(budgets_path.read_text())
for budget in budgets["themes"].values():
    budget["maxResolvedVisualLeaves"] += increment
budgets_path.write_text(json.dumps(budgets, separators=(",", ":")) + "\n")

basic_test = Path("scripts/test-basic-theme.mjs")
source = basic_test.read_text()
source = replace_string_array(source, "referenceComponentIds", "tree")
basic_test.write_text(source)

spec_test = Path("scripts/test-spec.mjs")
source = spec_test.read_text()
source = replace_string_array(source, "expectedReferenceVisualIds", "tree")
spec_test.write_text(source)

web_test = Path("scripts/test-web-adapter.mjs")
source = web_test.read_text()
anchor = '  assert.match(css, /--gui-component-data-grid-selection-indicator-width: 2px;/);\n'
if anchor not in source:
    raise RuntimeError("Web token gate anchor missing")
addition = '  assert.match(css, /--gui-component-tree-indent-step-medium: 20px;/);\n  assert.match(css, /--gui-component-tree-disclosure-size-medium: 18px;/);\n'
if "--gui-component-tree-indent-step-medium" not in source:
    source = source.replace(anchor, anchor + addition, 1)
web_test.write_text(source)

compose_test = Path("scripts/test-compose-tokens.mjs")
source = compose_test.read_text()
anchor = '  assert.match(source, /"component\\.dataGrid\\.selectionIndicator\\.width" to GuiDimensionValue\\(2\\.0, "px"\\)/);\n'
if anchor not in source:
    raise RuntimeError("Compose token gate anchor missing")
addition = '  assert.match(source, /"component\\.tree\\.indent\\.step\\.medium" to GuiDimensionValue\\(20\\.0, "px"\\)/);\n  assert.match(source, /"component\\.tree\\.disclosure\\.size\\.medium" to GuiDimensionValue\\(18\\.0, "px"\\)/);\n'
if "component\\.tree\\.indent" not in source:
    source = source.replace(anchor, anchor + addition, 1)
compose_test.write_text(source)

print(f"Tree Basic visual leaf budget increment: {increment}")
