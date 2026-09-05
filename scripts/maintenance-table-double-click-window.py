from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f"missing patch anchor: {label}")
    return source.replace(old, new, 1)


path = Path("packages/adapter-compose/src/main/kotlin/GuiTable.kt")
source = path.read_text()
source = replace_once(
    source,
    '''        nowNanos: Long,\n        minIntervalMillis: Long,\n        timeoutMillis: Long,\n''',
    '''        nowNanos: Long,\n        timeoutMillis: Long,\n''',
    "tracker parameters",
)
source = replace_once(
    source,
    '''        val isDoubleClick = lastValue == value &&\n            elapsedMillis >= minIntervalMillis &&\n            elapsedMillis <= timeoutMillis\n''',
    '''        val isDoubleClick = lastValue == value &&\n            elapsedMillis > 0L &&\n            elapsedMillis <= timeoutMillis\n''',
    "tracker timing predicate",
)
source = replace_once(
    source,
    '''            nowNanos = System.nanoTime(),\n            minIntervalMillis = viewConfiguration.doubleTapMinTimeMillis,\n            timeoutMillis = viewConfiguration.doubleTapTimeoutMillis,\n''',
    '''            nowNanos = System.nanoTime(),\n            timeoutMillis = viewConfiguration.doubleTapTimeoutMillis,\n''',
    "tracker invocation",
)
path.write_text(source)

path = Path("scripts/test-compose-table.mjs")
source = path.read_text()
source = source.replace('assert.match(source, /doubleTapMinTimeMillis/);\n', '')
anchor = 'assert.match(source, /doubleTapTimeoutMillis/);\n'
if anchor not in source:
    raise RuntimeError("double-tap timeout gate anchor missing")
addition = 'assert.match(source, /elapsedMillis > 0L/);\nassert.doesNotMatch(source, /doubleTapMinTimeMillis/);\n'
if 'elapsedMillis > 0L' not in source:
    source = source.replace(anchor, anchor + addition, 1)
path.write_text(source)
