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
}

export type ConfigThemes = Record<string, ConfigTheme>
