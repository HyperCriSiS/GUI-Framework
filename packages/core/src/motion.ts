// SPDX-License-Identifier: AGPL-3.0-or-later

export interface MotionDurations {
  /** Immediate state changes or reduced-motion fallbacks. */
  readonly instant: number;
  /** Hover, press and other direct interaction feedback. */
  readonly fast: number;
  /** Short structural transitions such as menus and dialogs. */
  readonly normal: number;
}

export interface MotionEasings {
  readonly standard: string;
  readonly enter: string;
  readonly exit: string;
}

export interface MotionTokens {
  readonly duration: MotionDurations;
  readonly easing: MotionEasings;
}

export type MotionPreference = "full" | "reduced";

export function resolveMotionDuration(
  durationMs: number,
  preference: MotionPreference,
): number {
  return preference === "reduced" ? 0 : Math.max(0, durationMs);
}
