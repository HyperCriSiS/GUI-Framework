# Compose Desktop integration kit

This internal integration layer gives desktop applications one stable host boundary around the renderer-neutral GUI Framework contracts and the Foundation Compose adapter.

`GuiDesktopHost` owns only desktop host context. It delegates theme and capability resolution to `GuiTheme` and deliberately does **not** infer capabilities from the operating system, GPU, window manager, or Compose runtime. Applications must advertise optional capabilities explicitly so fallback behavior stays deterministic and testable.

```kotlin
GuiDesktopHost(
    theme = GuiThemeId.BASIC,
    paletteId = "reference-dark",
    surface = GuiDesktopSurface.APPLICATION,
    availableCapabilities = emptySet(),
) {
    // GUI Framework Compose components
}
```

Supported host surfaces are `APPLICATION`, `SETTINGS`, `UTILITY`, and `DIALOG`. Components that need host-specific policy can read `LocalGuiDesktopHostContext`; component semantics and rendering remain in `packages/adapter-compose`.

The integration layer intentionally has no Material dependency and does not own window creation. Existing Compose Desktop applications can therefore wrap an existing content root without changing their window lifecycle or navigation architecture.
