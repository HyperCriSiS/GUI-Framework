# Python application integration path

This package is the toolkit-neutral handoff from the compiled GUI Framework IR to Python applications. It is intentionally **not** a Python renderer and does not couple the framework to PySide/PyQt, Tkinter, wxPython, Dear PyGui, or another widget toolkit.

Python applications load the compiler output (`build/spec-ir.json` or a packaged equivalent), declare the same explicit host context used by the other integration kits, and ask `GuiPythonHost` for the resolved semantic contract and visual recipe of a component:

```python
from gui_framework_integration import GuiPythonHost, GuiPythonSurface

host = GuiPythonHost.from_file(
    "spec-ir.json",
    theme_id="basic",
    palette_id="reference-dark",
    surface=GuiPythonSurface.APPLICATION,
    available_capabilities=(),
)
button = host.resolve_component("button")
```

`ResolvedPythonComponent` exposes the semantic component contract, base visual recipe, capability-adjusted effective visual recipe, deterministic capability selection result, and explicit host context.

The integration path never parses DTCG source files directly and never infers optional capabilities from the operating system, Python version, GPU, window manager, or GUI toolkit. A future toolkit adapter should translate the resolved component data to native toolkit primitives while preserving native text, focus, input and accessibility behavior.

This boundary is deliberately small so an existing Python application can adopt the GUI Framework incrementally. A concrete toolkit adapter should only be added when an actual application target justifies the dependency and mapping work.
