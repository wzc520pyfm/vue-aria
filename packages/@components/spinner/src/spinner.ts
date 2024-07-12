import type {SpinnerProps as AriaSpinnerProps} from '@nev-ui/aria-spinner'

export interface SpinnerProps extends AriaSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  labelColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export const SPINNER_DEFAULT = {
  size: 'md',
  color: 'default',
  labelColor: 'default',
} as const
