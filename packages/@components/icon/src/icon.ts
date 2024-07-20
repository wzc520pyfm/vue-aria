import type {IconProps as AriaIconProps} from '@nev-ui/aria-icon'

export interface IconProps extends AriaIconProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

// By default, inherited from the parent
export const ICON_DEFAULT = {} as const
