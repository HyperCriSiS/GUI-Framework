// SPDX-License-Identifier: AGPL-3.0-or-later

export type SemanticRole =
  | "button"
  | "textbox"
  | "switch"
  | "checkbox"
  | "radio"
  | "dialog"
  | "group"
  | "navigation"
  | "menu"
  | "menuitem"
  | "tab"
  | "tabpanel"
  | "progressbar"
  | "slider";

export interface AccessibilityMetadata {
  readonly role?: SemanticRole;
  readonly label?: string;
  readonly description?: string;
  readonly valueText?: string;
  readonly disabled?: boolean;
  readonly checked?: boolean;
  readonly selected?: boolean;
  readonly expanded?: boolean;
  readonly invalid?: boolean;
}
