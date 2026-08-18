// SPDX-License-Identifier: AGPL-3.0-or-later

export type InteractionState =
  | "default"
  | "hover"
  | "focus"
  | "pressed"
  | "selected"
  | "checked"
  | "disabled"
  | "loading"
  | "error"
  | "success";

export interface ComponentState {
  readonly interaction: ReadonlySet<InteractionState>;
}

export const DEFAULT_COMPONENT_STATE: ComponentState = {
  interaction: new Set<InteractionState>(["default"]),
};
