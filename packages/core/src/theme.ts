// SPDX-License-Identifier: AGPL-3.0-or-later

import type { CapabilityRequirement, RenderQuality } from "./capabilities";
import type { DesignTokens } from "./tokens";

export interface ThemeVisualVariant {
  readonly id: string;
  readonly minQuality?: RenderQuality;
  readonly requirements?: readonly CapabilityRequirement[];
}

export interface GuiTheme {
  readonly id: string;
  readonly name: string;
  readonly tokens: DesignTokens;
  readonly visualVariants?: readonly ThemeVisualVariant[];
}
