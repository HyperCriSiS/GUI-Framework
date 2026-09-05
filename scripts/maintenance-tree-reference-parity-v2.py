from pathlib import Path

path = Path("scripts/maintenance-tree-reference-parity.py")
source = path.read_text()
old = '''    '    "test:web-tree": "node scripts/test-web-tree.mjs",\\n    "test:web-table-reference":',
    '    "test:web-tree": "node scripts/test-web-tree.mjs",\\n    "test:web-tree-reference": "node scripts/test-web-tree-reference.mjs",\\n    "test:web-table-reference":',
'''
new = '''    '    "test:web-navigation-reference": "node scripts/test-web-navigation-reference.mjs",\\n    "test:web-table-reference":',
    '    "test:web-navigation-reference": "node scripts/test-web-navigation-reference.mjs",\\n    "test:web-tree-reference": "node scripts/test-web-tree-reference.mjs",\\n    "test:web-table-reference":',
'''
if old not in source:
    raise RuntimeError("old package anchor patch not found")
source = source.replace(old, new, 1)
path.write_text(source)
exec(compile(source, str(path), "exec"), {"__name__": "__main__", "__file__": str(path)})
