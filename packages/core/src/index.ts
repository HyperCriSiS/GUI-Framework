// SPDX-License-Identifier: AGPL-3.0-or-later

export type { SemanticRole, AccessibilityMetadata } from "./accessibility.js";
export type { RendererCapabilities, RenderQuality, CapabilityName, CapabilityRequirement } from "./capabilities.js";
export { supportsCapabilities } from "./capabilities.js";
export type { GuiSize, BaseComponentProps, ButtonVariant, ButtonProps, InputType, InputProps, SwitchProps, PanelProps, DialogProps } from "./components.js";
export type { MotionDurations, MotionEasings, MotionTokens, MotionPreference } from "./motion.js";
export { resolveMotionDuration } from "./motion.js";
export type { InteractionState, ComponentState } from "./state.js";
export { DEFAULT_COMPONENT_STATE } from "./state.js";
export type { ThemeVisualVariant, GuiTheme } from "./theme.js";
export type { ColorTokens, SpacingTokens, RadiusTokens, TypographyTokens, BorderTokens, EffectTokens, ControlTokens, DesignTokens } from "./tokens.js";
