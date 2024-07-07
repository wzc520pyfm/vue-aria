import type {
  ButtonEmits as AriaButtonEmits,
  ButtonProps as AriaButtonProps,
} from '@nev-ui/aria-button'

export interface ButtonProps extends AriaButtonProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  fullWidth?: boolean
  disableAnimation?: boolean
  /**
   * Whether the button should have the same width and height.
   */
  isIconOnly?: boolean
}

export const BUTTON_DEFAULT = {
  size: 'md',
  color: 'default',
  radius: 'md',
} as const

export interface ButtonEmits extends AriaButtonEmits {}
