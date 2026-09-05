from pathlib import Path
import json

basic_path = Path('spec/themes/basic.theme.json')
basic = json.loads(basic_path.read_text())
if 'form-layout' in basic['components']:
    raise RuntimeError('Form Layout Basic visual already exists')

basic['components']['form-layout'] = {
    'base': {
        'root': {
            'foreground': '{semantic.color.textPrimary}',
            'gap': '{spacing.lg}',
            'transition': '{motion.interaction.fast}',
        },
        'section': {'gap': '{spacing.md}'},
        'field': {'gap': '{spacing.xs}'},
        'label': {
            'foreground': '{semantic.color.textPrimary}',
            'fontSize': '{typography.size.medium}',
            'fontWeight': '{typography.weight.medium}',
            'lineHeight': '{typography.lineHeight.control}',
        },
        'control': {},
        'description': {
            'foreground': '{semantic.color.textSecondary}',
            'fontSize': '{typography.size.small}',
            'lineHeight': '{typography.lineHeight.control}',
        },
        'error': {
            'foreground': '{semantic.color.danger}',
            'fontSize': '{typography.size.small}',
            'fontWeight': '{typography.weight.medium}',
            'lineHeight': '{typography.lineHeight.control}',
        },
        'actions': {
            'gap': '{spacing.sm}',
            'paddingVertical': '{spacing.xs}',
        },
    },
    'sizes': {
        'small': {
            'root': {'gap': '{spacing.md}'},
            'section': {'gap': '{spacing.sm}'},
            'field': {'gap': '{spacing.xs}'},
            'label': {'fontSize': '{typography.size.small}'},
            'description': {'fontSize': '{typography.size.small}'},
            'error': {'fontSize': '{typography.size.small}'},
        },
        'medium': {
            'root': {'gap': '{spacing.lg}'},
            'section': {'gap': '{spacing.md}'},
            'field': {'gap': '{spacing.xs}'},
        },
        'large': {
            'root': {'gap': '{spacing.xl}'},
            'section': {'gap': '{spacing.lg}'},
            'field': {'gap': '{spacing.sm}'},
            'label': {'fontSize': '{typography.size.large}'},
            'description': {'fontSize': '{typography.size.medium}'},
            'error': {'fontSize': '{typography.size.medium}'},
            'actions': {'gap': '{spacing.md}'},
        },
    },
    'states': {
        'error': {
            'label': {'foreground': '{semantic.color.danger}'},
            'error': {'foreground': '{semantic.color.danger}'},
        },
        'disabled': {
            'field': {'opacity': '{opacity.disabled}'},
        },
    },
    'variants': {
        'stacked': {'base': {}},
        'inline': {'base': {'field': {'gap': '{spacing.md}'}}},
    },
}
# Keep stable alphabetical component ordering for reviewable generated diffs.
basic['components'] = {k: basic['components'][k] for k in sorted(basic['components'])}
basic_path.write_text(json.dumps(basic, indent=2) + '\n')

for path, old, new in [
    (
        'scripts/test-spec.mjs',
        'const expectedReferenceVisualIds = ["button", "checkbox", "data-grid", "dialog", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip", "tree"];',
        'const expectedReferenceVisualIds = ["button", "checkbox", "data-grid", "dialog", "form-layout", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip", "tree"];',
    ),
    (
        'scripts/test-basic-theme.mjs',
        'const referenceComponentIds = ["button", "checkbox", "data-grid", "dialog", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip", "tree"];',
        'const referenceComponentIds = ["button", "checkbox", "data-grid", "dialog", "form-layout", "input", "menu", "navigation", "panel", "progress", "radio", "select", "slider", "switch", "table", "tabs", "toast", "tooltip", "tree"];',
    ),
]:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise RuntimeError(f'expected one visual registry anchor in {path}, got {text.count(old)}')
    p.write_text(text.replace(old, new, 1))
