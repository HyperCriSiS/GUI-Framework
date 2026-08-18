// SPDX-License-Identifier: AGPL-3.0-or-later

import type { MotionTokens } from "./motion";

export interface ColorTokens {
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textDisabled: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly accentPressed: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
}

export interface SpacingTokens {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly xxl: number;
}

export interface RadiusTokens {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
}

export interface TypographyTokens {
  readonly fontFamily: string;
  readonly fontSizeXs: number;
  readonly fontSizeSm: number;
  readonly fontSizeMd: number;
  readonly fontSizeLg: number;
  readonly fontSizeXl: number;
  readonly weightNormal: number;
  readonly weightMedium: number;
  readonly weightBold: number;
}

export interface BorderTokens {
  readonly thin: number;
  readonly normal: number;
  readonly strong: number;
  readonly focusRingWidth: number;
  readonly focusRingOffset: number;
}

export interface EffectTokens {
  readonly shadowSmall: string;
  readonly shadowMedium: string;
  readonly shadowLarge: string;
  readonly blurSmall: number;
  readonly blurMedium: number;
  readonly blurLarge: number;
  readonly glowSmall: number;
  readonly glowMedium: number;
  readonly glowLarge: number;
  readonly noiseAmount: number;
}

export interface ControlTokens {
  readonly heightSmall: number;
  readonly heightMedium: number;
  readonly heightLarge: number;
}

export interface DesignTokens {
  readonly colors: ColorTokens;
  readonly spacing: SpacingTokens;
  readonly radius: RadiusTokens;
  readonly typography: TypographyTokens;
  readonly borders: BorderTokens;
  readonly effects: EffectTokens;
  readonly controls: ControlTokens;
  readonly motion: MotionTokens;
}
