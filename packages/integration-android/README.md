# Android application integration kit

This internal integration layer gives Android applications one stable host boundary around the renderer-neutral GUI Framework contracts and the Foundation Compose adapter.

`GuiAndroidHost` owns only Android host context. It delegates theme and capability resolution to `GuiTheme` and deliberately does **not** infer optional capabilities from Android API level, device model, window metrics, graphics hardware, or manufacturer-specific behavior. Applications advertise optional capabilities explicitly so fallback behavior stays deterministic and testable.

```kotlin
setContent {
    GuiAndroidHost(
        theme = GuiThemeId.BASIC,
        paletteId = "reference-dark",
        surface = GuiAndroidSurface.APPLICATION,
        availableCapabilities = emptySet(),
    ) {
        // GUI Framework Compose components
    }
}
```

Supported host surfaces are `APPLICATION`, `SETTINGS`, `DIALOG`, and `OVERLAY`. Components that need host-specific policy can read `LocalGuiAndroidHostContext`; component semantics and rendering remain in `packages/adapter-compose`.

The kit intentionally has no Material dependency and does not own an `Activity`, navigation controller, system bars, window insets, permissions, or lifecycle. Existing Compose applications can therefore wrap their current content root without replacing their application architecture.
