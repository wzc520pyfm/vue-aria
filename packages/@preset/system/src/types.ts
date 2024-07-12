import type {Theme} from '@unocss/preset-wind'
import type {ThemeColors} from './colors/types'

export type DefaultThemeType = 'light' | 'dark'

export type BaseThemeUnit = {
  DEFAULT?: string
  sm?: string
  md?: string
  lg?: string
}

export interface LayoutTheme {
  borderRadius?: BaseThemeUnit & {full?: string}
}

export type ConfigTheme = {
  extend?: DefaultThemeType
  layout?: LayoutTheme
  colors?: Partial<ThemeColors>
} & Pick<Theme, 'animation'>

export type ConfigThemes = Record<string, ConfigTheme>
