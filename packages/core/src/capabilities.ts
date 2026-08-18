// SPDX-License-Identifier: AGPL-3.0-or-later

export interface RendererCapabilities {
  readonly backdropBlur: boolean;
  readonly vectorFilters: boolean;
  readonly advancedBlendModes: boolean;
  readonly shaderEffects: boolean;
  readonly hardwareAcceleration: boolean;
  readonly rive: boolean;
}

export type RenderQuality = "minimal" | "standard" | "high" | "ultra";

export type CapabilityName = keyof RendererCapabilities;

export interface CapabilityRequirement {
  readonly capability: CapabilityName;
  readonly required?: boolean;
}

export function supportsCapabilities(
  capabilities: RendererCapabilities,
  requirements: readonly CapabilityRequirement[],
): boolean {
  return requirements.every(
    ({ capability, required = true }) => !required || capabilities[capability],
  );
}
