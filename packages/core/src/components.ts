// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AccessibilityMetadata } from "./accessibility";

export type GuiSize = "small" | "medium" | "large";

export interface BaseComponentProps {
  readonly id?: string;
  readonly disabled?: boolean;
  readonly accessibility?: AccessibilityMetadata;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends BaseComponentProps {
  readonly label: string;
  readonly size?: GuiSize;
  readonly variant?: ButtonVariant;
  readonly iconStart?: string;
  readonly iconEnd?: string;
  readonly loading?: boolean;
  readonly onPress?: () => void;
}

export type InputType = "text" | "password" | "email" | "number" | "search";

export interface InputProps extends BaseComponentProps {
  readonly value?: string;
  readonly placeholder?: string;
  readonly size?: GuiSize;
  readonly type?: InputType;
  readonly readOnly?: boolean;
  readonly error?: string;
  readonly onChange?: (value: string) => void;
}

export interface SwitchProps extends BaseComponentProps {
  readonly checked: boolean;
  readonly label?: string;
  readonly onChange?: (checked: boolean) => void;
}

export interface PanelProps extends BaseComponentProps {
  readonly elevated?: boolean;
}

export interface DialogProps extends BaseComponentProps {
  readonly open: boolean;
  readonly title?: string;
  readonly closeOnBackdrop?: boolean;
  readonly onClose?: () => void;
}
